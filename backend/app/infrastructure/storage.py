"""WealthOS S3 / MinIO Object Storage Service.

Provides secure document storage, statement ingestion, encrypted vault access,
and presigned download/upload URL generation.
"""

from typing import BinaryIO

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("wealthos.storage")

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


def init_storage() -> None:
    """Ensure required buckets exist upon infrastructure startup."""
    client = get_s3_client()
    required_buckets = [
        settings.STORAGE_DOCUMENTS_BUCKET,
        settings.STORAGE_VAULT_BUCKET,
    ]
    for bucket in required_buckets:
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
) -> bool:
    """Upload a stream to the specified bucket and object name."""
    client = get_s3_client()
    extra_args = {"ContentType": content_type}
    if metadata:
        extra_args["Metadata"] = metadata

    try:
        client.upload_fileobj(file_obj, bucket, object_name, ExtraArgs=extra_args)
        logger.info(f"Uploaded object s3://{bucket}/{object_name}")
        return True
    except ClientError as e:
        logger.error(f"Failed to upload object {object_name} to bucket {bucket}: {e}")
        raise


def generate_presigned_download_url(
    bucket: str, object_name: str, expiration_seconds: int = 3600
) -> str:
    """Generate a time-limited presigned URL for downloading a protected financial document."""
    client = get_s3_client()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": object_name},
            ExpiresIn=expiration_seconds,
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate presigned download URL for {bucket}/{object_name}: {e}")
        raise


def check_storage_health() -> dict:
    """Check object storage availability."""
    try:
        client = get_s3_client()
        # Head the primary document bucket or list buckets
        client.list_buckets()
        return {"status": "healthy", "endpoint": settings.MINIO_ENDPOINT}
    except Exception as exc:
        logger.warning(f"Storage health check failed: {exc}")
        return {"status": "unhealthy", "error": str(exc), "endpoint": settings.MINIO_ENDPOINT}
