"""WealthOS Phase 19 Workstream 3: Backup Immutability & Disaster Recovery Tests.

Validates AES-256-GCM container verification, tamper detection, wrong key rejection,
and post-restore ledger invariant verification.
"""

import hashlib
import json
import os
from pathlib import Path

import pytest
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.backup_verifier import (
    MAGIC_HEADER,
    NONCE_LENGTH,
    BackupVerifier,
)


@pytest.fixture
def dr_test_workspace(tmp_path: Path):
    """Provide isolated directory for backup artifact tests."""
    work_dir = tmp_path / "dr_backups"
    work_dir.mkdir(parents=True, exist_ok=True)
    return work_dir


def create_sample_backup(
    work_dir: Path,
    secret: str,
    payload: bytes = b"PGDMP_WEALTHOS_VERIFIED_LEDGER_DATA_SAMPLE",
) -> tuple[Path, Path]:
    """Helper to generate a valid AES-256-GCM backup container and manifest."""
    key = BackupVerifier.derive_key(secret)
    nonce = os.urandom(NONCE_LENGTH)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, payload, associated_data=MAGIC_HEADER)
    container_bytes = MAGIC_HEADER + nonce + ciphertext

    ciphertext_path = work_dir / "sample_backup.dump.enc"
    ciphertext_path.write_bytes(container_bytes)

    enc_sha = hashlib.sha256(container_bytes).hexdigest()
    plain_sha = hashlib.sha256(payload).hexdigest()

    manifest_data = {
        "backup_name": "sample_backup.dump",
        "database": "wealthos_test",
        "encrypted_sha256": enc_sha,
        "plaintext_sha256": plain_sha,
        "encryption_algorithm": "AES-256-GCM",
        "kdf": "HKDF-SHA256",
    }
    manifest_path = work_dir / "sample_backup.json"
    manifest_path.write_text(json.dumps(manifest_data), encoding="utf-8")

    return ciphertext_path, manifest_path


def test_backup_verifier_valid_container(dr_test_workspace: Path):
    """Verify BackupVerifier confirms valid container and authenticates payload."""
    secret = "wealthos_super_secure_recovery_key_12345"
    c_path, m_path = create_sample_backup(dr_test_workspace, secret)

    report = BackupVerifier.verify_backup_container(c_path, m_path, raw_secret=secret)
    assert report.is_valid is True
    assert report.manifest_verified is True
    assert report.checksum_verified is True
    assert report.plaintext_sha256 is not None
    assert len(report.errors) == 0


def test_backup_verifier_tampered_ciphertext(dr_test_workspace: Path):
    """Verify BackupVerifier catches tampered ciphertext and rejects fail-closed."""
    secret = "wealthos_super_secure_recovery_key_12345"
    c_path, m_path = create_sample_backup(dr_test_workspace, secret)

    # Tamper with 1 byte of ciphertext
    raw = bytearray(c_path.read_bytes())
    raw[-1] ^= 0xFF
    c_path.write_bytes(raw)

    report = BackupVerifier.verify_backup_container(c_path, m_path, raw_secret=secret)
    assert report.is_valid is False
    assert any("SHA-256 mismatch" in err for err in report.errors)


def test_backup_verifier_wrong_key_rejection(dr_test_workspace: Path):
    """Verify BackupVerifier fails closed when attempting decryption with wrong key."""
    correct_secret = "wealthos_super_secure_recovery_key_12345"
    wrong_secret = "wealthos_incorrect_intruder_key_99999"
    c_path, m_path = create_sample_backup(dr_test_workspace, correct_secret)

    report = BackupVerifier.verify_backup_container(c_path, m_path, raw_secret=wrong_secret)
    assert report.is_valid is False
    assert any("tag verification failed" in err for err in report.errors)


@pytest.mark.asyncio
async def test_backup_verifier_post_restore_invariants(db_session: AsyncSession):
    """Verify live database invariants pass the post-restore audit."""
    invariants = await BackupVerifier.verify_post_restore_invariants(db_session)
    assert invariants["unbalanced_journal_entries"] == 0
    assert invariants["schema_version"] is not None
    assert invariants["rls_protected_tables"] >= 30
    assert invariants["is_healthy"] is True
