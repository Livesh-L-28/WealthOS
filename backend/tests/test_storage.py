"""Tests for MinIO / S3 Storage Infrastructure."""

import io
from unittest.mock import MagicMock, patch

import pytest

from app.infrastructure.storage import (
    delete_file,
    download_file_bytes,
    generate_presigned_download_url,
    generate_presigned_upload_url,
    init_storage,
    upload_file,
    validate_file_metadata,
)


def test_upload_file():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        data = io.BytesIO(b"dummy financial statement bytes")
        result = upload_file(data, "wealthos-documents", "doc123.pdf", "application/pdf")
        assert result is True
        mock_s3.upload_fileobj.assert_called_once()


def test_upload_file_invalid_content_type():
    data = io.BytesIO(b"executable shell script")
    with pytest.raises(ValueError, match="not permitted"):
        upload_file(data, "wealthos-documents", "script.sh", "application/x-sh")


def test_validate_file_metadata():
    # Valid types pass
    validate_file_metadata("application/pdf", 1024)
    validate_file_metadata("text/csv", 500)
    validate_file_metadata("image/png", 2048)

    # Invalid type raises
    with pytest.raises(ValueError, match="not permitted"):
        validate_file_metadata("application/x-msdownload", 1024)

    # Exceeding size limit raises
    with pytest.raises(ValueError, match="exceeds maximum allowed limit"):
        validate_file_metadata("application/pdf", 60 * 1024 * 1024)


def test_download_file_bytes():
    mock_s3 = MagicMock()

    def mock_download(bucket, key, fileobj):
        fileobj.write(b"mock document content")

    mock_s3.download_fileobj.side_effect = mock_download
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        content = download_file_bytes("wealthos-documents", "doc123.pdf")
        assert content == b"mock document content"
        mock_s3.download_fileobj.assert_called_once()


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
            ExpiresIn=900,
        )


def test_generate_presigned_upload_url():
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_post.return_value = {
        "url": "https://s3.local/wealthos-documents",
        "fields": {"key": "doc123.pdf"},
    }
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        res = generate_presigned_upload_url("wealthos-documents", "doc123.pdf")
        assert res["url"] == "https://s3.local/wealthos-documents"
        mock_s3.generate_presigned_post.assert_called_once()


def test_delete_file():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        result = delete_file("wealthos-documents", "doc123.pdf")
        assert result is True
        mock_s3.delete_object.assert_called_once_with(Bucket="wealthos-documents", Key="doc123.pdf")


def test_init_storage_buckets():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        init_storage()
        assert mock_s3.head_bucket.call_count == 2
