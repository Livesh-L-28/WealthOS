"""WealthOS S3 / MinIO Object Storage Service.

Provides secure document storage, statement ingestion, encrypted vault access,
strict MIME signature and file size validation, bucket allowlisting,
object key sanitization, and short-lived presigned download/upload URL generation.
Zero sensitive document content is ever logged.
"""

import io
import re
from typing import BinaryIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.storage")

# Security and validation constraints
MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "image/png",
    "image/jpeg",
    "application/octet-stream",  # Permitted for encrypted vault envelopes
}

# Regex for safe object keys: letters, digits, underscores, hyphens, dots, forward slashes
SAFE_KEY_PATTERN = re.compile(r"^[a-zA-Z0-9_\-\./]+$")


# ------------------------------------------------------------------------------
# Storage Exception Hierarchy
# ------------------------------------------------------------------------------
class StorageError(ValueError):
    """Base exception for all object storage operations."""

    pass


class FileTooLargeError(StorageError):
    """Raised when file content exceeds maximum permitted size."""

    pass


class InvalidContentTypeError(StorageError):
    """Raised when MIME type is not permitted."""

    pass


class InvalidSignatureError(StorageError):
    """Raised when file signature (magic bytes) does not match claimed MIME type."""

    pass


class BucketNotAllowedError(StorageError):
    """Raised when attempting an operation on an unauthorized bucket."""

    pass


class InvalidObjectKeyError(StorageError):
    """Raised when object key violates security constraints (e.g., path traversal)."""

    pass


_s3_client = None


def get_s3_client():
    """Create or return existing S3/MinIO client."""
    global _s3_client
    if _s3_client is None:
        endpoint_url = f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}"
        logger.info(f"Initializing Object Storage client at {endpoint_url}")
        _s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name=settings.MINIO_REGION,
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
    return _s3_client


def get_allowed_buckets() -> set[str]:
    """Retrieve allowlist of authorized storage buckets."""
    return {settings.STORAGE_DOCUMENTS_BUCKET, settings.STORAGE_VAULT_BUCKET}


def validate_bucket(bucket: str) -> None:
    """Validate that bucket name is present in the approved allowlist."""
    if not bucket or bucket not in get_allowed_buckets():
        raise BucketNotAllowedError(
            f"Access to bucket '{bucket}' is denied. Allowed buckets: {', '.join(sorted(get_allowed_buckets()))}"
        )


def validate_object_key(object_name: str) -> None:
    """Validate object key for path traversal, illegal characters, and length limits."""
    if not object_name or not isinstance(object_name, str):
        raise InvalidObjectKeyError("Object key must be a non-empty string.")

    if len(object_name) > 255:
        raise InvalidObjectKeyError(
            f"Object key length ({len(object_name)}) exceeds maximum limit of 255 characters."
        )

    if ".." in object_name:
        raise InvalidObjectKeyError(
            f"Object key '{object_name}' contains illegal path traversal sequences."
        )

    if object_name.startswith(("/", "\\")) or object_name.endswith(("/", "\\")):
        raise InvalidObjectKeyError(f"Object key '{object_name}' cannot start or end with a slash.")

    if "//" in object_name:
        raise InvalidObjectKeyError(f"Object key '{object_name}' contains consecutive slashes.")

    if not SAFE_KEY_PATTERN.match(object_name):
        raise InvalidObjectKeyError(f"Object key '{object_name}' contains illegal characters.")


def validate_file_magic_bytes(header: bytes, content_type: str) -> None:
    """Verify file magic byte signatures to prevent MIME spoofing attacks."""
    ct = content_type.lower()

    if ct == "application/pdf":
        if not header.startswith(b"%PDF-"):
            raise InvalidSignatureError(
                "File signature mismatch: claimed application/pdf but lacks %PDF- header."
            )

    elif ct == "image/png":
        if not header.startswith(b"\x89PNG\r\n\x1a\n"):
            raise InvalidSignatureError(
                "File signature mismatch: claimed image/png but lacks PNG magic bytes."
            )

    elif ct == "image/jpeg":
        if not header.startswith(b"\xff\xd8\xff"):
            raise InvalidSignatureError(
                "File signature mismatch: claimed image/jpeg but lacks JPEG magic bytes."
            )

    elif ct == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        if not header.startswith(b"PK\x03\x04"):
            raise InvalidSignatureError(
                "File signature mismatch: claimed XLSX spreadsheet but lacks ZIP container header."
            )

    elif ct == "application/vnd.ms-excel":
        if not (
            header.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
            or header.startswith(b"PK\x03\x04")
        ):
            raise InvalidSignatureError(
                "File signature mismatch: claimed legacy Excel XLS format but lacks valid signature."
            )

    elif ct == "text/csv":
        if b"\x00" in header:
            raise InvalidSignatureError(
                "File signature mismatch: binary null bytes detected in text/csv stream."
            )
        try:
            header.decode("utf-8")
        except UnicodeDecodeError:
            try:
                header.decode("latin-1")
            except Exception as exc:
                raise InvalidSignatureError(
                    f"File signature mismatch: text/csv is not valid text: {exc}"
                ) from exc

    elif ct == "application/octet-stream":
        # Permitted for encrypted vault envelopes without strict magic byte requirement
        pass


def validate_file_metadata(content_type: str, file_size: int | None = None) -> None:
    """Validate file content type and size limits before storage."""
    if content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise InvalidContentTypeError(
            f"Content-Type '{content_type}' is not permitted. "
            f"Allowed types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )
    if file_size is not None and file_size > MAX_DOCUMENT_SIZE_BYTES:
        raise FileTooLargeError(
            f"File size {file_size} bytes exceeds maximum allowed limit of {MAX_DOCUMENT_SIZE_BYTES} bytes (50MB)"
        )


def init_storage() -> None:
    """Ensure required buckets exist upon infrastructure startup with private access."""
    client = get_s3_client()
    for bucket in get_allowed_buckets():
        try:
            client.head_bucket(Bucket=bucket)
            logger.info(f"Storage bucket verified: {bucket}")
        except ClientError as err:
            error_code = err.response.get("Error", {}).get("Code")
            if error_code in ("404", "NoSuchBucket"):
                logger.info(f"Creating storage bucket: {bucket}")
                try:
                    client.create_bucket(Bucket=bucket)
                    logger.info(f"Successfully created bucket: {bucket}")
                except Exception as create_err:
                    logger.warning(f"Could not create bucket '{bucket}': {create_err}")
            else:
                logger.warning(f"Bucket check for '{bucket}' returned: {err}")
        except Exception as exc:
            logger.warning(f"Storage initialization warning for '{bucket}': {exc}")


def upload_file(
    file_obj: BinaryIO,
    bucket: str,
    object_name: str,
    content_type: str = "application/octet-stream",
    metadata: dict[str, str] | None = None,
    validate: bool = True,
) -> bool:
    """Upload a stream to the specified bucket and object name with end-to-end security checks."""
    validate_bucket(bucket)
    validate_object_key(object_name)

    # 1. Content-Type check
    if validate:
        validate_file_metadata(content_type, None)

    # 2. Read initial header for magic byte verification and handle seekable/non-seekable streams
    is_seekable = hasattr(file_obj, "seek") and hasattr(file_obj, "tell")
    header_bytes = b""
    total_size = 0

    if is_seekable:
        try:
            current_pos = file_obj.tell()
            header_bytes = file_obj.read(512)
            file_obj.seek(0, io.SEEK_END)
            total_size = file_obj.tell() - current_pos
            file_obj.seek(current_pos)

            if validate:
                validate_file_metadata(content_type, total_size)
                validate_file_magic_bytes(header_bytes, content_type)
        except (AttributeError, io.UnsupportedOperation):
            is_seekable = False

    if not is_seekable:
        # For non-seekable streams, buffer chunks up to MAX_DOCUMENT_SIZE_BYTES
        buf = io.BytesIO()
        chunk = file_obj.read(65536)
        while chunk:
            total_size += len(chunk)
            if total_size > MAX_DOCUMENT_SIZE_BYTES:
                raise FileTooLargeError(
                    f"Non-seekable stream exceeded maximum limit of {MAX_DOCUMENT_SIZE_BYTES} bytes."
                )
            buf.write(chunk)
            if not header_bytes and total_size >= 512:
                buf.seek(0)
                header_bytes = buf.read(512)
                buf.seek(total_size)
            chunk = file_obj.read(65536)

        buf.seek(0)
        if not header_bytes:
            header_bytes = buf.read(512)
            buf.seek(0)

        if validate:
            validate_file_metadata(content_type, total_size)
            validate_file_magic_bytes(header_bytes, content_type)
        file_obj = buf

    client = get_s3_client()
    extra_args = {"ContentType": content_type}
    if metadata:
        extra_args["Metadata"] = metadata

    try:
        client.upload_fileobj(file_obj, bucket, object_name, ExtraArgs=extra_args)
        logger.info(
            f"Successfully uploaded object ({total_size} bytes) to s3://{bucket}/{object_name}"
        )
        return True
    except ClientError as e:
        logger.error(f"Failed to upload object {object_name} to bucket {bucket}: {e}")
        raise StorageError(f"S3 upload error: {e}") from e


def download_file_bytes(bucket: str, object_name: str) -> bytes:
    """Download an object's contents securely into memory."""
    validate_bucket(bucket)
    validate_object_key(object_name)

    client = get_s3_client()
    try:
        buf = io.BytesIO()
        client.download_fileobj(bucket, object_name, buf)
        buf.seek(0)
        return buf.read()
    except ClientError as e:
        logger.error(f"Failed to download object s3://{bucket}/{object_name}: {e}")
        raise StorageError(f"S3 download error: {e}") from e


def generate_presigned_download_url(
    bucket: str, object_name: str, expiration_seconds: int = 900
) -> str:
    """Generate a short-lived (default 15-min) presigned URL for downloading a protected document."""
    validate_bucket(bucket)
    validate_object_key(object_name)

    # Expiration bounded between 60 seconds and 3600 seconds
    expiration = max(60, min(expiration_seconds, 3600))
    client = get_s3_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_name},
            ExpiresIn=expiration,
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned download URL for {bucket}/{object_name}: {e}")
        raise StorageError(f"S3 presigned URL error: {e}") from e


def generate_presigned_upload_url(
    bucket: str,
    object_name: str,
    content_type: str = "application/pdf",
    expiration_seconds: int = 900,
) -> dict:
    """Generate a short-lived presigned post URL strictly enforcing Content-Type and size limits."""
    validate_bucket(bucket)
    validate_object_key(object_name)
    validate_file_metadata(content_type, None)

    expiration = max(60, min(expiration_seconds, 3600))
    client = get_s3_client()
    try:
        response = client.generate_presigned_post(
            bucket,
            object_name,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, MAX_DOCUMENT_SIZE_BYTES],
            ],
            ExpiresIn=expiration,
        )
        return response
    except ClientError as e:
        logger.error(f"Failed to generate presigned upload URL for {bucket}/{object_name}: {e}")
        raise StorageError(f"S3 presigned upload policy error: {e}") from e


def delete_file(bucket: str, object_name: str) -> bool:
    """Delete an object from storage with bucket and key validation."""
    validate_bucket(bucket)
    validate_object_key(object_name)

    client = get_s3_client()
    try:
        client.delete_object(Bucket=bucket, Key=object_name)
        logger.info(f"Deleted object s3://{bucket}/{object_name}")
        return True
    except ClientError as e:
        logger.error(f"Failed to delete object {bucket}/{object_name}: {e}")
        raise StorageError(f"S3 delete error: {e}") from e


def check_storage_health() -> dict:
    """Check object storage availability."""
    try:
        client = get_s3_client()
        client.list_buckets()
        return {"status": "healthy", "endpoint": settings.MINIO_ENDPOINT}
    except Exception as exc:
        logger.warning(f"Storage health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc), "endpoint": settings.MINIO_ENDPOINT}
