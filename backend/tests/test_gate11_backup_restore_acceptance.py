"""WealthOS Gate 11 Acceptance Test Suite.

Validates Disaster Recovery, Authenticated Database Backup (AES-256-GCM),
Cryptographic Tamper Detection, Key Authentication, and End-to-End Restoration
into Disposable Database ('wealthos_dr_drill').
"""

import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

import pytest
from cryptography.exceptions import InvalidTag

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from backup_crypto import (  # noqa: E402
    MAGIC_HEADER,
    compute_sha256,
    decrypt_file,
    derive_key,
    encrypt_file,
)


@pytest.fixture
def temp_backup_dir(tmp_path: Path):
    """Provide isolated directory for backup artifact tests."""
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def test_gate11_backup_crypto_roundtrip(temp_backup_dir: Path, monkeypatch):
    """Verify AES-256-GCM authenticated encryption and decryption round-trip."""
    test_key = "wealthos_test_disaster_recovery_key_12345"
    monkeypatch.setenv("WEALTHOS_BACKUP_ENCRYPTION_KEY", test_key)

    plaintext_path = temp_backup_dir / "sample_ledger.dump"
    encrypted_path = temp_backup_dir / "sample_ledger.dump.enc"
    manifest_path = temp_backup_dir / "sample_ledger.json"
    restored_path = temp_backup_dir / "sample_ledger.restored.dump"

    # 1. Create simulated PostgreSQL custom dump payload
    original_data = b"PGDMP\x01\x0f\x00\x00\x00WealthOS General Ledger Balancing Invariants Validated" * 100
    plaintext_path.write_bytes(original_data)
    original_sha = compute_sha256(plaintext_path)

    # 2. Encrypt
    encrypt_file(
        input_path=plaintext_path,
        output_path=encrypted_path,
        manifest_path=manifest_path,
        db_name="wealthos_test",
        pg_version="16.8",
    )

    assert encrypted_path.exists()
    assert manifest_path.exists()

    # Verify container begins with magic header
    enc_bytes = encrypted_path.read_bytes()
    assert enc_bytes.startswith(MAGIC_HEADER)
    assert enc_bytes != original_data

    # 3. Decrypt
    decrypt_file(
        input_path=encrypted_path,
        output_path=restored_path,
        manifest_path=manifest_path,
    )

    assert restored_path.exists()
    assert compute_sha256(restored_path) == original_sha
    assert restored_path.read_bytes() == original_data


def test_gate11_tamper_detection_and_checksum_mismatch(temp_backup_dir: Path, monkeypatch):
    """Verify corrupted ciphertext is detected and rejected fail-closed before execution."""
    test_key = "wealthos_test_disaster_recovery_key_12345"
    monkeypatch.setenv("WEALTHOS_BACKUP_ENCRYPTION_KEY", test_key)

    plaintext_path = temp_backup_dir / "test.dump"
    encrypted_path = temp_backup_dir / "test.dump.enc"
    manifest_path = temp_backup_dir / "test.json"
    restored_path = temp_backup_dir / "test.restored.dump"

    plaintext_path.write_bytes(b"Confidential Financial Ledger Records")

    encrypt_file(
        input_path=plaintext_path,
        output_path=encrypted_path,
        manifest_path=manifest_path,
        db_name="wealthos_test",
        pg_version="16.8",
    )

    # Corrupt ciphertext byte
    enc_data = bytearray(encrypted_path.read_bytes())
    enc_data[-1] = (enc_data[-1] + 1) % 256
    encrypted_path.write_bytes(enc_data)

    # Must fail closed with non-zero exit code due to checksum or tag mismatch
    with pytest.raises(SystemExit) as exc_info:
        decrypt_file(
            input_path=encrypted_path,
            output_path=restored_path,
            manifest_path=manifest_path,
        )
    assert exc_info.value.code in (2, 4)


def test_gate11_wrong_key_rejection(temp_backup_dir: Path, monkeypatch):
    """Verify attempting to decrypt with incorrect encryption key fails closed (InvalidTag)."""
    correct_key = "wealthos_correct_key_for_backup_12345"
    wrong_key = "wealthos_wrong_unauthorized_key_99999"

    monkeypatch.setenv("WEALTHOS_BACKUP_ENCRYPTION_KEY", correct_key)

    plaintext_path = temp_backup_dir / "test_key.dump"
    encrypted_path = temp_backup_dir / "test_key.dump.enc"
    manifest_path = temp_backup_dir / "test_key.json"
    restored_path = temp_backup_dir / "test_key.restored.dump"

    plaintext_path.write_bytes(b"Target Database Content To Protect")

    encrypt_file(
        input_path=plaintext_path,
        output_path=encrypted_path,
        manifest_path=manifest_path,
        db_name="wealthos_test",
        pg_version="16.8",
    )

    # Switch to wrong key (checksum still matches manifest, but GCM authentication tag must fail)
    monkeypatch.setenv("WEALTHOS_BACKUP_ENCRYPTION_KEY", wrong_key)

    with pytest.raises(SystemExit) as exc_info:
        decrypt_file(
            input_path=encrypted_path,
            output_path=restored_path,
            manifest_path=manifest_path,
        )
    assert exc_info.value.code == 4  # Authenticated decryption failed


def test_gate11_full_disaster_recovery_exercise_drill():
    """Execute end-to-end disaster recovery drill on disposable test database."""
    cmd = [
        sys.executable,
        str(SCRIPTS_DIR / "disaster_recovery_exercise.py"),
        "--force-drill",
    ]
    env = os.environ.copy()
    env["CONFIRM_DISASTER_RECOVERY_DRILL"] = "true"
    env["DRILL_DATABASE"] = "wealthos_dr_drill"

    proc = subprocess.run(
        cmd,
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )

    assert proc.returncode == 0, f"Disaster recovery drill failed: {proc.stderr}"
    assert "WEALTHOS DISASTER RECOVERY DRILL: CERTIFIED ACCEPTANCE" in proc.stdout
    assert '"unbalanced_journal_entries": 0' in proc.stdout
    assert '"variance": "0.0000 INR"' in proc.stdout

