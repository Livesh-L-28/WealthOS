"""Tests for MinIO / S3 Storage Infrastructure."""

import io
from unittest.mock import MagicMock, patch

from app.infrastructure.storage import (
    generate_presigned_download_url,
    init_storage,
    upload_file,
)


def test_upload_file():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        data = io.BytesIO(b"dummy financial statement bytes")
        result = upload_file(data, "wealthos-documents", "doc123.pdf", "application/pdf")
        assert result is True
        mock_s3.upload_fileobj.assert_called_once()


def test_generate_presigned_download_url():
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = (
        "https://s3.local/wealthos-documents/doc123.pdf?signature=xyz"
    )
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        url = generate_presigned_download_url("wealthos-documents", "doc123.pdf")
        assert "wealthos-documents/doc123.pdf" in url
        mock_s3.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "wealthos-documents", "Key": "doc123.pdf"},
            ExpiresIn=3600,
        )


def test_init_storage_buckets():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        init_storage()
        # Verifies head_bucket was called for documents and vault
        assert mock_s3.head_bucket.call_count == 2
