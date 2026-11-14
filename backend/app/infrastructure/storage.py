"""WealthOS S3 / MinIO Object Storage Service.

Provides secure document storage, statement ingestion, encrypted vault access,
storage quarantine lifecycle, strict MIME signature and file size validation,
bucket allowlisting, object key sanitization, and short-lived presigned download/upload URL generation.
Zero sensitive document content is ever logged.
"""

import hashlib
import io
import json
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, BinaryIO

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


class DocumentQuarantineError(StorageError):
    """Raised when quarantine verification or promotion fails."""

    pass


_s3_client: Any = None
_is_local_storage_fallback: bool = False


class LocalStorageDriver:
    """Enterprise local disk object storage driver.

    Provides transparent drop-in compatibility with the boto3 S3 client interface.
    Stores bucket objects at `backend/var/storage/{bucket}/{key}` with directory isolation.
    """

    def __init__(self, base_dir: Path | None = None):
        if base_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent / "var" / "storage"
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_path(self, bucket: str, key: str) -> Path:
        target = self.base_dir / bucket / key
        target.parent.mkdir(parents=True, exist_ok=True)
        return target

    def head_bucket(self, Bucket: str):
        bucket_dir = self.base_dir / Bucket
        if not bucket_dir.exists():
            raise ClientError({"Error": {"Code": "404", "Message": "Not Found"}}, "HeadBucket")
        return {}

    def create_bucket(self, Bucket: str):
        (self.base_dir / Bucket).mkdir(parents=True, exist_ok=True)
        return {}

    def put_public_access_block(self, Bucket: str, PublicAccessBlockConfiguration: dict):
        return {}

    def list_buckets(self):
        buckets = []
        for p in self.base_dir.iterdir():
            if p.is_dir():
                buckets.append({"Name": p.name})
        return {"Buckets": buckets}

    def put_object(
        self,
        Bucket: str,
        Key: str,
        Body: bytes | BinaryIO,
        ContentType: str = "application/octet-stream",
        Metadata: dict | None = None,
    ):
        path = self._get_path(Bucket, Key)
        data = Body if isinstance(Body, bytes) else Body.read()
        with open(path, "wb") as f:
            f.write(data)
        if Metadata:
            with open(str(path) + ".meta.json", "w") as mf:
                json.dump({"ContentType": ContentType, "Metadata": Metadata}, mf)
        return {"ETag": hashlib.md5(data).hexdigest()}

    def get_object(self, Bucket: str, Key: str):
        path = self._get_path(Bucket, Key)
        if not path.exists():
            raise ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "The specified key does not exist."}},
                "GetObject",
            )
        with open(path, "rb") as f:
            data = f.read()
        content_type = "application/octet-stream"
        meta_file = Path(str(path) + ".meta.json")
        metadata = {}
        if meta_file.exists():
            try:
                with open(meta_file, "r") as mf:
                    d = json.load(mf)
                    content_type = d.get("ContentType", content_type)
                    metadata = d.get("Metadata", {})
            except Exception:
                pass
        return {
            "Body": io.BytesIO(data),
            "ContentType": content_type,
            "ContentLength": len(data),
            "Metadata": metadata,
        }

    def head_object(self, Bucket: str, Key: str):
        path = self._get_path(Bucket, Key)
        if not path.exists():
            raise ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "The specified key does not exist."}},
                "HeadObject",
            )
        content_type = "application/octet-stream"
        meta_file = Path(str(path) + ".meta.json")
        metadata = {}
        if meta_file.exists():
            try:
                with open(meta_file, "r") as mf:
                    d = json.load(mf)
                    content_type = d.get("ContentType", content_type)
                    metadata = d.get("Metadata", {})
            except Exception:
                pass
        return {
            "ContentLength": path.stat().st_size,
            "ContentType": content_type,
            "Metadata": metadata,
        }

    def delete_object(self, Bucket: str, Key: str):
        path = self._get_path(Bucket, Key)
        if path.exists():
            path.unlink()
        meta_file = Path(str(path) + ".meta.json")
        if meta_file.exists():
            meta_file.unlink()
        return {}

    def upload_fileobj(
        self,
        Fileobj: BinaryIO,
        Bucket: str,
        Key: str,
        ExtraArgs: dict | None = None,
        Callback: Any = None,
        Config: Any = None,
    ):
        extra = ExtraArgs or {}
        content_type = extra.get("ContentType", "application/octet-stream")
        metadata = extra.get("Metadata")
        return self.put_object(
            Bucket=Bucket,
            Key=Key,
            Body=Fileobj,
            ContentType=content_type,
            Metadata=metadata,
        )

    def download_fileobj(
        self,
        Bucket: str,
        Key: str,
        Fileobj: BinaryIO,
        ExtraArgs: dict | None = None,
        Callback: Any = None,
        Config: Any = None,
    ):
        res = self.get_object(Bucket=Bucket, Key=Key)
        body = res["Body"].read()
        Fileobj.write(body)

    def copy_object(self, Bucket: str, Key: str, CopySource: str | dict):
        if isinstance(CopySource, str):
            src_bucket, src_key = CopySource.split("/", 1)
        elif isinstance(CopySource, dict):
            src_bucket = CopySource.get("Bucket", "")
            src_key = CopySource.get("Key", "")
        else:
            raise ClientError({"Error": {"Code": "400", "Message": "Invalid CopySource"}}, "CopyObject")
        src_res = self.get_object(Bucket=src_bucket, Key=src_key)
        return self.put_object(
            Bucket=Bucket,
            Key=Key,
            Body=src_res["Body"].read(),
            ContentType=src_res["ContentType"],
            Metadata=src_res["Metadata"],
        )

    def generate_presigned_post(
        self,
        Bucket: str,
        Key: str,
        Fields: dict | None = None,
        Conditions: list | None = None,
        ExpiresIn: int = 3600,
    ):
        return {
            "url": f"/api/v1/documents/raw/{Bucket}/{Key}",
            "fields": Fields or {},
        }

    def generate_presigned_url(self, ClientMethod: str, Params: dict, ExpiresIn: int = 3600, HttpMethod: str | None = None):
        bucket = Params.get("Bucket", "wealthos-documents")
        key = Params.get("Key", "")
        return f"/api/v1/documents/raw/{bucket}/{key}"


def get_s3_client() -> Any:
    """Create or return existing S3/MinIO client with seamless local disk fallback."""
    global _s3_client, _is_local_storage_fallback
    if _s3_client is None:
        endpoint_url = f"{'https' if settings.MINIO_SECURE else 'http'}://{settings.MINIO_ENDPOINT}"
        try:
            logger.info(f"Probing Object Storage client at {endpoint_url}")
            client = boto3.client(
                "s3",
                endpoint_url=endpoint_url,
                aws_access_key_id=settings.MINIO_ACCESS_KEY,
                aws_secret_access_key=settings.MINIO_SECRET_KEY,
                region_name=settings.MINIO_REGION,
                config=Config(
                    signature_version="s3v4",
                    s3={"addressing_style": "path"},
                    connect_timeout=0.8,
                    read_timeout=0.8,
                    retries={"max_attempts": 1},
                ),
            )
            client.list_buckets()
            _s3_client = client
            _is_local_storage_fallback = False
            logger.info("Connected to remote S3/MinIO cluster successfully")
        except Exception as exc:
            logger.warning(
                f"Remote MinIO/S3 unavailable ({exc}). Activating resilient Local Disk Object Storage Driver."
            )
            _s3_client = LocalStorageDriver()
            _is_local_storage_fallback = True

    return _s3_client


def get_allowed_buckets() -> set[str]:
    """Retrieve allowlist of authorized storage buckets."""
    return {
        settings.STORAGE_DOCUMENTS_BUCKET,
        settings.STORAGE_VAULT_BUCKET,
        settings.STORAGE_QUARANTINE_BUCKET,
    }


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


def detect_file_signature(header: bytes) -> str | None:
    """Inspect magic bytes and return the detected MIME type, or None if unrecognized."""
    if header.startswith(b"%PDF-"):
        return "application/pdf"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"PK\x03\x04"):
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if header.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "application/vnd.ms-excel"

    # For text/csv: check printable ASCII/UTF-8 and lack of null bytes
    if b"\x00" not in header[:512]:
        try:
            header[:512].decode("utf-8")
            return "text/csv"
        except UnicodeDecodeError:
            pass

    return None


def validate_file_magic_bytes(header: bytes, content_type: str) -> None:
    """Verify file magic byte signatures to prevent MIME spoofing attacks."""
    ct = content_type.lower()

    if ct == "application/pdf":
        if not header.startswith(b"%PDF-"):
            raise InvalidSignatureError(
                "File signature mismatch: expected PDF magic bytes ('%PDF-')."
            )
    elif ct == "image/png":
        if not header.startswith(b"\x89PNG\r\n\x1a\n"):
            raise InvalidSignatureError("File signature mismatch: expected PNG magic bytes.")
    elif ct == "image/jpeg":
        if not header.startswith(b"\xff\xd8\xff"):
            raise InvalidSignatureError("File signature mismatch: expected JPEG magic bytes.")
    elif ct == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        if not header.startswith(b"PK\x03\x04"):
            raise InvalidSignatureError(
                "File signature mismatch: expected OpenXML ZIP magic bytes ('PK\\x03\\x04')."
            )
    elif ct == "application/vnd.ms-excel":
        if not (
            header.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
            or header.startswith(b"PK\x03\x04")
        ):
            raise InvalidSignatureError(
                "File signature mismatch: expected MS Excel compound binary magic bytes."
            )
    elif ct == "text/csv":
        if b"\x00" in header[:512]:
            raise InvalidSignatureError("File signature mismatch: CSV file contains binary nulls.")
        try:
            header[:512].decode("utf-8")
        except UnicodeDecodeError as exc:
            raise InvalidSignatureError("CSV content cannot be decoded as valid text.") from exc
    elif ct == "application/octet-stream":
        pass  # Encrypted blobs have arbitrary binary payload
    else:
        raise InvalidContentTypeError(f"Unsupported content type: '{content_type}'")


def validate_file_metadata(content_type: str, file_size: int | None = None) -> None:
    """Validate declared MIME type and size boundaries."""
    if not content_type or content_type.lower() not in ALLOWED_CONTENT_TYPES:
        raise InvalidContentTypeError(
            f"Content type '{content_type}' is not permitted. "
            f"Allowed types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}"
        )

    if file_size is not None:
        if file_size <= 0:
            raise StorageError("File size must be greater than zero bytes.")
        if file_size > MAX_DOCUMENT_SIZE_BYTES:
            raise FileTooLargeError(
                f"File size {file_size} bytes exceeds maximum allowed limit of {MAX_DOCUMENT_SIZE_BYTES} bytes (50 MB)."
            )


def upload_file(
    file_data: bytes | BinaryIO,
    bucket: str,
    object_name: str,
    content_type: str = "application/octet-stream",
    metadata: dict[str, str] | None = None,
    validate: bool = True,
) -> bool:
    """Upload a file or stream securely to S3/MinIO with strict size and MIME verification."""
    validate_bucket(bucket)
    validate_object_key(object_name)

    file_obj: BinaryIO
    total_size: int = 0
    header_bytes: bytes = b""

    if isinstance(file_data, bytes):
        total_size = len(file_data)
        if validate:
            validate_file_metadata(content_type, total_size)
            header_bytes = file_data[:512]
            validate_file_magic_bytes(header_bytes, content_type)
        file_obj = io.BytesIO(file_data)
    else:
        file_obj = file_data
        if hasattr(file_obj, "seek") and hasattr(file_obj, "tell"):
            try:
                curr = file_obj.tell()
                file_obj.seek(0, io.SEEK_END)
                stream_len = file_obj.tell()
                file_obj.seek(curr)
                if stream_len > MAX_DOCUMENT_SIZE_BYTES:
                    raise FileTooLargeError(
                        f"File size {stream_len} bytes exceeds maximum allowed limit of {MAX_DOCUMENT_SIZE_BYTES} bytes."
                    )
            except (AttributeError, io.UnsupportedOperation):
                pass

        buf = io.BytesIO()
        chunk = file_obj.read(65536)
        while chunk:
            total_size += len(chunk)
            if total_size > MAX_DOCUMENT_SIZE_BYTES:
                raise FileTooLargeError(
                    f"Stream exceeded maximum limit of {MAX_DOCUMENT_SIZE_BYTES} bytes."
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
    extra_args: dict[str, Any] = {"ContentType": content_type}
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


# ------------------------------------------------------------------------------
# Storage Quarantine Lifecycle (Section E)
# ------------------------------------------------------------------------------
def upload_to_quarantine(
    file_data: bytes | BinaryIO,
    filename: str,
    declared_content_type: str,
    tenant_id: str,
) -> dict[str, Any]:
    """Upload unvalidated incoming document into isolated quarantine bucket.

    Files in quarantine are never automatically trusted or accessible by users.
    """
    clean_filename = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", filename)
    quarantine_id = str(uuid.uuid4())
    quarantine_key = f"quarantine/{tenant_id}/{quarantine_id}-{clean_filename}"

    # Enforce basic metadata validation and upload without trusting magic bytes yet
    validate_file_metadata(declared_content_type, None)
    upload_file(
        bucket=settings.STORAGE_QUARANTINE_BUCKET,
        object_name=quarantine_key,
        file_data=file_data,
        content_type=declared_content_type,
        metadata={
            "tenant_id": tenant_id,
            "original_filename": clean_filename,
            "declared_content_type": declared_content_type,
            "quarantine_id": quarantine_id,
            "status": "quarantined",
        },
        validate=False,  # Unvalidated on ingress; must pass server-side inspection before promotion
    )

    return {
        "quarantine_id": quarantine_id,
        "quarantine_key": quarantine_key,
        "bucket": settings.STORAGE_QUARANTINE_BUCKET,
        "filename": clean_filename,
        "declared_content_type": declared_content_type,
        "tenant_id": tenant_id,
        "status": "quarantined",
        "created_at": datetime.now(UTC).isoformat(),
    }


def generate_presigned_quarantine_upload_url(
    tenant_id: str,
    filename: str,
    content_type: str = "application/pdf",
    expiration_seconds: int = 900,
) -> dict:
    """Generate a presigned post upload URL targeted exclusively at the quarantine bucket.

    Presigned uploads never upload directly to verified document storage.
    """
    clean_filename = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", filename)
    quarantine_id = str(uuid.uuid4())
    quarantine_key = f"quarantine/{tenant_id}/{quarantine_id}-{clean_filename}"

    return generate_presigned_upload_url(
        bucket=settings.STORAGE_QUARANTINE_BUCKET,
        object_name=quarantine_key,
        content_type=content_type,
        expiration_seconds=expiration_seconds,
    )


def validate_and_promote_quarantine_document(
    quarantine_key: str,
    target_bucket: str = settings.STORAGE_DOCUMENTS_BUCKET,
    target_key: str | None = None,
) -> dict[str, Any]:
    """Execute server-side inspection on quarantined document and promote if valid.

    1. Download from quarantine storage.
    2. Enforce file size limit (<= 50MB).
    3. Inspect magic bytes server-side and verify declared MIME type.
    4. Detect and reject MIME spoofing, malformed bytes, and unsupported formats.
    5. On validation success: promote to target_bucket and delete from quarantine.
    6. On validation failure: reject, cleanup, and raise DocumentQuarantineError.
    """
    validate_bucket(target_bucket)
    validate_object_key(quarantine_key)

    client = get_s3_client()
    try:
        head = client.head_object(Bucket=settings.STORAGE_QUARANTINE_BUCKET, Key=quarantine_key)
    except ClientError as e:
        raise DocumentQuarantineError(f"Quarantined document '{quarantine_key}' not found: {e}")

    content_type = head.get("ContentType", "application/octet-stream")
    file_bytes = download_file_bytes(settings.STORAGE_QUARANTINE_BUCKET, quarantine_key)
    total_size = len(file_bytes)

    # 1. Size enforcement
    if total_size <= 0:
        delete_file(settings.STORAGE_QUARANTINE_BUCKET, quarantine_key)
        raise DocumentQuarantineError("Quarantined document is empty (0 bytes).")
    if total_size > MAX_DOCUMENT_SIZE_BYTES:
        delete_file(settings.STORAGE_QUARANTINE_BUCKET, quarantine_key)
        raise FileTooLargeError(
            f"Quarantined document size {total_size} exceeds {MAX_DOCUMENT_SIZE_BYTES} bytes."
        )

    # 2. Magic byte inspection & MIME spoofing validation
    header_bytes = file_bytes[:512]
    try:
        validate_file_metadata(content_type, total_size)
        validate_file_magic_bytes(header_bytes, content_type)
    except (InvalidSignatureError, InvalidContentTypeError, FileTooLargeError) as err:
        logger.warning(
            f"Quarantine verification failed for {quarantine_key}: {err}. Rejecting document."
        )
        delete_file(settings.STORAGE_QUARANTINE_BUCKET, quarantine_key)
        raise DocumentQuarantineError(f"Quarantine verification failed: {err}") from err

    detected_type = detect_file_signature(header_bytes) or content_type
    sha256_hash = hashlib.sha256(file_bytes).hexdigest()

    # 3. Safe destination key
    if not target_key:
        filename_part = quarantine_key.split("/")[-1]
        target_key = f"verified/{filename_part}"
    validate_object_key(target_key)

    # 4. Promote object to verified bucket
    upload_file(
        bucket=target_bucket,
        object_name=target_key,
        file_data=file_bytes,
        content_type=detected_type,
        metadata={
            "quarantine_key": quarantine_key,
            "sha256": sha256_hash,
            "validated_at": datetime.now(UTC).isoformat(),
            "status": "promoted",
        },
        validate=True,
    )

    # 5. Clean up from quarantine
    delete_file(settings.STORAGE_QUARANTINE_BUCKET, quarantine_key)

    logger.info(
        f"Document {quarantine_key} successfully validated and promoted to s3://{target_bucket}/{target_key}"
    )

    return {
        "status": "promoted",
        "quarantine_key": quarantine_key,
        "target_bucket": target_bucket,
        "target_key": target_key,
        "content_type": detected_type,
        "size_bytes": total_size,
        "sha256": sha256_hash,
        "promoted_at": datetime.now(UTC).isoformat(),
    }


def init_storage_buckets() -> None:
    """Ensure all required buckets (documents, vault, quarantine) exist with private policies."""
    client = get_s3_client()
    for bucket in [
        settings.STORAGE_DOCUMENTS_BUCKET,
        settings.STORAGE_VAULT_BUCKET,
        settings.STORAGE_QUARANTINE_BUCKET,
    ]:
        try:
            client.head_bucket(Bucket=bucket)
            logger.info(f"Storage bucket '{bucket}' exists and is accessible.")
        except ClientError:
            logger.info(f"Creating storage bucket '{bucket}'...")
            client.create_bucket(Bucket=bucket)

        try:
            client.put_public_access_block(
                Bucket=bucket,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": True,
                    "IgnorePublicAcls": True,
                    "BlockPublicPolicy": True,
                    "RestrictPublicBuckets": True,
                },
            )
        except ClientError as e:
            logger.debug(f"Public access block on bucket {bucket} note: {e}")


# Alias for lifecycle initialization
init_storage = init_storage_buckets


def check_storage_health() -> dict:
    """Check object storage availability with active engine telemetry."""
    try:
        client = get_s3_client()
        client.list_buckets()
        return {
            "status": "healthy",
            "driver": "local_disk_storage_driver" if _is_local_storage_fallback else "s3_minio",
            "fallback_active": _is_local_storage_fallback,
            "endpoint": "local_disk" if _is_local_storage_fallback else settings.MINIO_ENDPOINT,
        }
    except Exception as exc:
        logger.warning(f"Storage health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc), "endpoint": settings.MINIO_ENDPOINT}
