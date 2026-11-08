"""WealthOS Backup Immutability & Disaster Recovery Verification Engine.

Provides cryptographic verification of backup manifests, AES-256-GCM tamper
detection, and automated validation of post-restore financial ledger invariants.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger

logger = get_logger("wealthos.backup_verifier")

MAGIC_HEADER = b"WOSGCM01"
NONCE_LENGTH = 12
TAG_LENGTH = 16


@dataclass
class BackupVerificationReport:
    """Report detailing backup verification outcome."""

    is_valid: bool
    manifest_verified: bool
    checksum_verified: bool
    ciphertext_sha256: str
    plaintext_sha256: str | None = None
    errors: list[str] = field(default_factory=list)
    verified_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class BackupVerificationError(Exception):
    """Base exception for backup verification and cryptographic integrity errors."""


class BackupVerifier:
    """Cryptographic verification engine for database and storage backups."""

    @staticmethod
    def derive_key(raw_secret: str) -> bytes:
        """Derive 256-bit encryption key using HKDF-SHA256."""
        secret_bytes = raw_secret.encode("utf-8")
        hkdf = HKDF(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"wealthos_backup_key_derivation_salt_v1",
            info=b"wealthos_postgresql_backup_encryption",
        )
        return hkdf.derive(secret_bytes)

    @staticmethod
    def compute_file_sha256(path: Path) -> str:
        """Compute SHA-256 checksum of a file."""
        hasher = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    @classmethod
    def verify_backup_container(
        cls,
        ciphertext_path: Path,
        manifest_path: Path,
        raw_secret: str | None = None,
    ) -> BackupVerificationReport:
        """Verify manifest existence, ciphertext checksum, and optionally GCM decryptability."""
        errors = []
        if not ciphertext_path.exists():
            return BackupVerificationReport(
                is_valid=False,
                manifest_verified=False,
                checksum_verified=False,
                ciphertext_sha256="",
                errors=[f"Ciphertext file not found: {ciphertext_path}"],
            )

        if not manifest_path.exists():
            return BackupVerificationReport(
                is_valid=False,
                manifest_verified=False,
                checksum_verified=False,
                ciphertext_sha256="",
                errors=[f"Manifest file not found: {manifest_path}"],
            )

        # 1. Manifest Validation
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest = json.load(f)
        except Exception as e:
            return BackupVerificationReport(
                is_valid=False,
                manifest_verified=False,
                checksum_verified=False,
                ciphertext_sha256="",
                errors=[f"Invalid manifest JSON: {e}"],
            )

        expected_enc_sha = manifest.get("encrypted_sha256")
        expected_plain_sha = manifest.get("plaintext_sha256")
        actual_enc_sha = cls.compute_file_sha256(ciphertext_path)

        if expected_enc_sha and actual_enc_sha != expected_enc_sha:
            errors.append(f"Ciphertext SHA-256 mismatch: expected {expected_enc_sha}, got {actual_enc_sha}")

        checksum_verified = len(errors) == 0

        # 2. Container Format Validation
        ciphertext_bytes = ciphertext_path.read_bytes()
        if len(ciphertext_bytes) < len(MAGIC_HEADER) + NONCE_LENGTH + TAG_LENGTH:
            errors.append("Ciphertext file too short to be a valid WealthOS backup container")
        elif not ciphertext_bytes.startswith(MAGIC_HEADER):
            errors.append(f"Invalid magic header: expected {MAGIC_HEADER.decode()}, got {ciphertext_bytes[:8]}")

        # 3. Optional Authenticated Decryption Verification
        plaintext_sha = None
        if raw_secret and len(errors) == 0:
            key = cls.derive_key(raw_secret)
            nonce_start = len(MAGIC_HEADER)
            nonce_end = nonce_start + NONCE_LENGTH
            nonce = ciphertext_bytes[nonce_start:nonce_end]
            encrypted_payload = ciphertext_bytes[nonce_end:]

            aesgcm = AESGCM(key)
            try:
                plaintext = aesgcm.decrypt(nonce, encrypted_payload, associated_data=MAGIC_HEADER)
                plaintext_sha = hashlib.sha256(plaintext).hexdigest()
                if expected_plain_sha and plaintext_sha != expected_plain_sha:
                    errors.append(
                        f"Plaintext SHA-256 mismatch: expected {expected_plain_sha}, got {plaintext_sha}"
                    )
            except InvalidTag:
                errors.append("Cryptographic authentication tag verification failed (ciphertext modified or wrong key)")

        return BackupVerificationReport(
            is_valid=len(errors) == 0,
            manifest_verified=True,
            checksum_verified=checksum_verified,
            ciphertext_sha256=actual_enc_sha,
            plaintext_sha256=plaintext_sha,
            errors=errors,
        )

    @staticmethod
    async def verify_post_restore_invariants(session: AsyncSession) -> dict[str, Any]:
        """Verify financial invariants and RLS enforcement on a restored database."""
        # 1. Debit = Credit Equality
        dr_cr_query = text(
            """
            SELECT COUNT(*) FROM (
                SELECT je.id
                FROM journal_entries je
                JOIN journal_lines jl ON je.id = jl.journal_entry_id
                WHERE je.status = 'POSTED'
                GROUP BY je.id
                HAVING ABS(SUM(jl.debit_amount) - SUM(jl.credit_amount)) > 0.0001
            ) unbalanced;
            """
        )
        res = await session.execute(dr_cr_query)
        unbalanced_entries = res.scalar() or 0

        # 2. Schema version query
        version_query = text("SELECT version_num FROM alembic_version LIMIT 1;")
        res_v = await session.execute(version_query)
        schema_version = res_v.scalar()

        # 3. RLS active tables count
        rls_query = text(
            """
            SELECT COUNT(*) 
            FROM pg_class c 
            JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true;
            """
        )
        res_rls = await session.execute(rls_query)
        rls_table_count = res_rls.scalar() or 0

        is_healthy = unbalanced_entries == 0 and bool(schema_version) and rls_table_count >= 30

        return {
            "unbalanced_journal_entries": unbalanced_entries,
            "schema_version": schema_version,
            "rls_protected_tables": rls_table_count,
            "is_healthy": is_healthy,
        }
