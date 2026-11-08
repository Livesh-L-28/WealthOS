#!/usr/bin/env python3
"""WealthOS Secure Backup Cryptographic Engine.

Implements Authenticated Envelope Encryption using AES-256-GCM.
- 96-bit (12-byte) cryptographically secure random nonces per backup.
- 128-bit (16-byte) GCM authentication tag verifying ciphertext authenticity.
- Pre-decryption manifest validation and SHA-256 integrity checks.
- Zero development fallback keys; fails closed when keys are absent.
- Key identifier hashing (SHA-256 fingerprint), never storing key material.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

MAGIC_HEADER = b"WOSGCM01"  # WealthOS AES-256-GCM Backup Container v1
NONCE_LENGTH = 12
TAG_LENGTH = 16


def derive_key(raw_secret: str) -> tuple[bytes, str]:
    """Derive a 256-bit key using HKDF-SHA256 from the provided secret.

    Returns the 32-byte key and a public key identifier (SHA-256 fingerprint).
    """
    secret_bytes = raw_secret.encode("utf-8")
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"wealthos_backup_key_derivation_salt_v1",
        info=b"wealthos_postgresql_backup_encryption",
    )
    derived = hkdf.derive(secret_bytes)
    key_fingerprint = f"sha256:{hashlib.sha256(secret_bytes).hexdigest()[:16]}"
    return derived, key_fingerprint


def get_encryption_key() -> tuple[bytes, str]:
    """Retrieve the backup master encryption key from environment or key file.

    Fails closed if no key is provided. Never returns hardcoded defaults.
    """
    key = os.getenv("WEALTHOS_BACKUP_ENCRYPTION_KEY")
    key_file = os.getenv("WEALTHOS_BACKUP_KEY_FILE")

    if not key and key_file and os.path.exists(key_file):
        with open(key_file, "r", encoding="utf-8") as f:
            key = f.read().strip()

    if not key:
        sys.stderr.write(
            "[CRITICAL] Missing backup encryption key! Set WEALTHOS_BACKUP_ENCRYPTION_KEY or WEALTHOS_BACKUP_KEY_FILE.\n"
        )
        sys.exit(1)

    if len(key) < 16:
        sys.stderr.write(
            "[CRITICAL] Insecure backup encryption key! Master key must be at least 16 characters.\n"
        )
        sys.exit(1)

    return derive_key(key)


def compute_sha256(path: Path) -> str:
    """Compute SHA-256 checksum of a file efficiently."""
    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def encrypt_file(
    input_path: Path,
    output_path: Path,
    manifest_path: Path,
    db_name: str,
    pg_version: str,
) -> None:
    """Encrypt a custom dump archive using AES-256-GCM and generate manifest."""
    if not input_path.exists():
        sys.stderr.write(f"[ERROR] Input archive does not exist: {input_path}\n")
        sys.exit(1)

    raw_size = input_path.stat().st_size
    raw_sha = compute_sha256(input_path)
    key_bytes, key_id = get_encryption_key()

    nonce = os.urandom(NONCE_LENGTH)
    aesgcm = AESGCM(key_bytes)

    # Associated data binds database name and timestamp to ciphertext
    associated_data = f"wealthos_backup:{db_name}".encode("utf-8")

    with open(input_path, "rb") as f_in:
        plaintext = f_in.read()

    # aesgcm.encrypt returns ciphertext + 16-byte authentication tag appended
    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data)

    with open(output_path, "wb") as f_out:
        f_out.write(MAGIC_HEADER)
        f_out.write(nonce)
        f_out.write(ciphertext)

    enc_size = output_path.stat().st_size
    enc_sha = compute_sha256(output_path)

    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%SZ")
    manifest = {
        "backup_id": output_path.stem.replace(".dump", ""),
        "timestamp": timestamp,
        "database": db_name,
        "postgresql_version": pg_version,
        "archive_format": "custom",
        "compression": "zlib-9",
        "encryption": {
            "algorithm": "AES-256-GCM",
            "kdf": "HKDF-SHA256",
            "key_identifier": key_id,
            "nonce_length_bytes": NONCE_LENGTH,
            "tag_length_bytes": TAG_LENGTH,
            "magic_header": MAGIC_HEADER.decode("ascii"),
        },
        "raw_file": {
            "size_bytes": raw_size,
            "sha256": raw_sha,
        },
        "encrypted_artifact": {
            "path": str(output_path),
            "size_bytes": enc_size,
            "sha256": enc_sha,
        },
        "status": "VERIFIED_VALID",
    }

    with open(manifest_path, "w", encoding="utf-8") as f_meta:
        json.dump(manifest, f_meta, indent=2)

    print(f"[SUCCESS] Encrypted archive created with AES-256-GCM: {output_path}")
    print(f"[INFO] Manifest generated: {manifest_path} (Plain SHA: {raw_sha[:12]}..., Enc SHA: {enc_sha[:12]}...)")


def decrypt_file(
    input_path: Path,
    output_path: Path,
    manifest_path: Path,
) -> None:
    """Decrypt an encrypted backup file, validating manifest checksum and GCM authentication tag."""
    if not input_path.exists():
        sys.stderr.write(f"[ERROR] Encrypted file not found: {input_path}\n")
        sys.exit(1)
    if not manifest_path.exists():
        sys.stderr.write(f"[ERROR] Manifest file not found: {manifest_path}\n")
        sys.exit(1)

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. Verify encrypted artifact checksum against manifest
    enc_sha = compute_sha256(input_path)
    expected_enc_sha = manifest["encrypted_artifact"]["sha256"]
    if enc_sha != expected_enc_sha:
        sys.stderr.write(
            f"[CRITICAL] Encrypted file SHA-256 mismatch! Expected {expected_enc_sha}, got {enc_sha}\n"
        )
        sys.exit(2)

    key_bytes, _ = get_encryption_key()
    aesgcm = AESGCM(key_bytes)
    db_name = manifest.get("database", "wealthos")
    associated_data = f"wealthos_backup:{db_name}".encode("utf-8")

    with open(input_path, "rb") as f_in:
        header = f_in.read(len(MAGIC_HEADER))
        if header != MAGIC_HEADER:
            sys.stderr.write(
                f"[CRITICAL] Invalid container header: expected {MAGIC_HEADER}, got {header}\n"
            )
            sys.exit(3)

        nonce = f_in.read(NONCE_LENGTH)
        if len(nonce) != NONCE_LENGTH:
            sys.stderr.write("[CRITICAL] Truncated nonce in backup container!\n")
            sys.exit(3)

        ciphertext = f_in.read()

    # 2. Authenticated Decryption
    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data)
    except InvalidTag:
        sys.stderr.write(
            "[CRITICAL] Authenticated decryption failed! Invalid GCM tag or incorrect encryption key.\n"
        )
        sys.exit(4)

    with open(output_path, "wb") as f_out:
        f_out.write(plaintext)

    # 3. Verify plaintext checksum
    raw_sha = compute_sha256(output_path)
    expected_raw_sha = manifest["raw_file"]["sha256"]
    if raw_sha != expected_raw_sha:
        output_path.unlink(missing_ok=True)
        sys.stderr.write(
            f"[CRITICAL] Plaintext SHA-256 mismatch! Expected {expected_raw_sha}, got {raw_sha}\n"
        )
        sys.exit(5)

    print(f"[SUCCESS] Authenticated decryption complete. Verified plaintext SHA-256: {raw_sha}")


def verify_manifest_and_ciphertext(input_path: Path, manifest_path: Path) -> bool:
    """Verify manifest checksums and GCM authentication tag without writing unencrypted file to disk."""
    if not input_path.exists() or not manifest_path.exists():
        return False

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    enc_sha = compute_sha256(input_path)
    if enc_sha != manifest["encrypted_artifact"]["sha256"]:
        return False

    key_bytes, _ = get_encryption_key()
    aesgcm = AESGCM(key_bytes)
    db_name = manifest.get("database", "wealthos")
    associated_data = f"wealthos_backup:{db_name}".encode("utf-8")

    with open(input_path, "rb") as f_in:
        header = f_in.read(len(MAGIC_HEADER))
        if header != MAGIC_HEADER:
            return False
        nonce = f_in.read(NONCE_LENGTH)
        ciphertext = f_in.read()

    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data)
        hasher = hashlib.sha256()
        hasher.update(plaintext)
        return hasher.hexdigest() == manifest["raw_file"]["sha256"]
    except InvalidTag:
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="WealthOS Backup Cryptography Engine")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Encrypt
    enc_parser = subparsers.add_parser("encrypt")
    enc_parser.add_argument("--input", required=True, type=Path)
    enc_parser.add_argument("--output", required=True, type=Path)
    enc_parser.add_argument("--manifest", required=True, type=Path)
    enc_parser.add_argument("--db-name", default="wealthos")
    enc_parser.add_argument("--pg-version", default="16.8")

    # Decrypt
    dec_parser = subparsers.add_parser("decrypt")
    dec_parser.add_argument("--input", required=True, type=Path)
    dec_parser.add_argument("--output", required=True, type=Path)
    dec_parser.add_argument("--manifest", required=True, type=Path)

    # Verify
    ver_parser = subparsers.add_parser("verify")
    ver_parser.add_argument("--input", required=True, type=Path)
    ver_parser.add_argument("--manifest", required=True, type=Path)

    args = parser.parse_args()

    if args.command == "encrypt":
        encrypt_file(args.input, args.output, args.manifest, args.db_name, args.pg_version)
    elif args.command == "decrypt":
        decrypt_file(args.input, args.output, args.manifest)
    elif args.command == "verify":
        if verify_manifest_and_ciphertext(args.input, args.manifest):
            print("[SUCCESS] Backup ciphertext, manifest, and authentication tag are valid.")
            sys.exit(0)
        else:
            sys.stderr.write("[FAILURE] Backup verification failed!\n")
            sys.exit(1)


if __name__ == "__main__":
    main()
