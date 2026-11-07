"""Tests for MinIO / S3 Storage Infrastructure."""

import io
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from app.infrastructure.storage import (
    MAX_DOCUMENT_SIZE_BYTES,
    BucketNotAllowedError,
    DocumentQuarantineError,
    FileTooLargeError,
    InvalidContentTypeError,
    InvalidObjectKeyError,
    InvalidSignatureError,
    check_storage_health,
    delete_file,
    download_file_bytes,
    generate_presigned_download_url,
    generate_presigned_quarantine_upload_url,
    generate_presigned_upload_url,
    init_storage,
    upload_file,
    upload_to_quarantine,
    validate_and_promote_quarantine_document,
    validate_bucket,
    validate_file_metadata,
    validate_object_key,
)


class NonSeekableStream:
    """Simulates a network socket or pipe without seek/tell support."""

    def __init__(self, data: bytes, chunk_size: int = 1024):
        self._data = data
        self._offset = 0
        self._chunk_size = chunk_size

    def read(self, size: int = -1) -> bytes:
        if self._offset >= len(self._data):
            return b""
        if size < 0:
            chunk = self._data[self._offset :]
            self._offset = len(self._data)
            return chunk
        chunk = self._data[self._offset : self._offset + size]
        self._offset += len(chunk)
        return chunk


class MockOversizedStream:
    """Simulates a non-seekable stream that yields chunks exceeding 50MB."""

    def __init__(self):
        self.calls = 0

    def read(self, size: int = -1) -> bytes:
        self.calls += 1
        if self.calls == 1:
            return b"%PDF-1.4 valid header"
        # Yield 1MB chunks continuously
        return b"A" * (1024 * 1024)


def test_upload_file_valid_pdf():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        data = io.BytesIO(b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF")
        result = upload_file(data, "wealthos-documents", "statements/doc123.pdf", "application/pdf")
        assert result is True
        mock_s3.upload_fileobj.assert_called_once()
        args, kwargs = mock_s3.upload_fileobj.call_args
        assert args[1] == "wealthos-documents"
        assert args[2] == "statements/doc123.pdf"
        assert kwargs["ExtraArgs"]["ContentType"] == "application/pdf"


def test_upload_file_valid_csv():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        data = io.BytesIO(b"date,description,amount\n2026-01-01,Salary,5000\n")
        result = upload_file(data, "wealthos-documents", "csv/txns.csv", "text/csv")
        assert result is True
        mock_s3.upload_fileobj.assert_called_once()


def test_upload_file_valid_image():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        # PNG header
        png_data = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...")
        assert upload_file(png_data, "wealthos-documents", "img/receipt.png", "image/png") is True

        # JPEG header
        jpeg_data = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00...")
        assert upload_file(jpeg_data, "wealthos-documents", "img/bill.jpg", "image/jpeg") is True


def test_upload_file_non_seekable_stream():
    """Verify non-seekable streams are buffered and validated chunk-by-chunk."""
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        raw_pdf = b"%PDF-1.5 non-seekable stream payload test data"
        stream = NonSeekableStream(raw_pdf, chunk_size=10)
        result = upload_file(
            stream,
            "wealthos-documents",
            "stream/doc.pdf",
            "application/pdf",  # type: ignore[arg-type]
        )
        assert result is True
        mock_s3.upload_fileobj.assert_called_once()


def test_upload_file_oversized_seekable():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        mock_file = MagicMock()
        mock_file.tell.side_effect = [0, MAX_DOCUMENT_SIZE_BYTES + 1024, 0]
        mock_file.read.return_value = b"%PDF-1.4"
        with pytest.raises(FileTooLargeError, match="exceeds maximum allowed limit"):
            upload_file(mock_file, "wealthos-documents", "big.pdf", "application/pdf")


def test_upload_file_oversized_non_seekable():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        stream = MockOversizedStream()
        with pytest.raises(FileTooLargeError, match="exceeded maximum limit"):
            upload_file(
                stream,
                "wealthos-documents",
                "big_stream.pdf",
                "application/pdf",  # type: ignore[arg-type]
            )


def test_upload_file_invalid_content_type():
    data = io.BytesIO(b"#!/bin/bash\necho hello")
    with pytest.raises(InvalidContentTypeError, match="not permitted"):
        upload_file(data, "wealthos-documents", "script.sh", "application/x-sh")


def test_upload_file_mime_spoofing():
    # Claims application/pdf, but magic bytes are ASCII text
    fake_pdf = io.BytesIO(b"NOT_A_REAL_PDF_FILE")
    with pytest.raises(InvalidSignatureError, match="expected PDF magic bytes"):
        upload_file(fake_pdf, "wealthos-documents", "fake.pdf", "application/pdf")

    # Claims image/png, but lacks PNG signature
    fake_png = io.BytesIO(b"GIF89a Fake Image")
    with pytest.raises(InvalidSignatureError, match="PNG magic bytes"):
        upload_file(fake_png, "wealthos-documents", "fake.png", "image/png")

    # Claims text/csv, but contains binary null byte
    fake_csv = io.BytesIO(b"col1,col2\x00corrupt")
    with pytest.raises(InvalidSignatureError, match="binary null"):
        upload_file(fake_csv, "wealthos-documents", "fake.csv", "text/csv")


def test_validate_bucket():
    # Permitted buckets pass
    validate_bucket("wealthos-documents")
    validate_bucket("wealthos-vault")

    # Unknown bucket raises BucketNotAllowedError
    with pytest.raises(BucketNotAllowedError, match="is denied"):
        validate_bucket("unauthorized-public-bucket")


def test_validate_object_key():
    # Valid safe keys
    validate_object_key("user-1/statements/2026/01/stmt.pdf")
    validate_object_key("receipts_2026-03.csv")

    # Path traversal attempts
    with pytest.raises(InvalidObjectKeyError, match="path traversal"):
        validate_object_key("../../../etc/passwd")
    with pytest.raises(InvalidObjectKeyError, match="path traversal"):
        validate_object_key("user-1/../secret.pem")

    # Absolute path / leading slash
    with pytest.raises(InvalidObjectKeyError, match="cannot start or end with a slash"):
        validate_object_key("/root/file.txt")

    # Trailing slash
    with pytest.raises(InvalidObjectKeyError, match="cannot start or end with a slash"):
        validate_object_key("folder/")

    # Consecutive slashes
    with pytest.raises(InvalidObjectKeyError, match="consecutive slashes"):
        validate_object_key("folder//file.txt")

    # Disallowed characters
    with pytest.raises(InvalidObjectKeyError, match="illegal characters"):
        validate_object_key("file;rm -rf.txt")


def test_validate_file_metadata():
    # Valid types pass
    validate_file_metadata("application/pdf", 1024)
    validate_file_metadata("text/csv", 500)
    validate_file_metadata("image/png", 2048)

    # Invalid type raises InvalidContentTypeError
    with pytest.raises(InvalidContentTypeError, match="not permitted"):
        validate_file_metadata("application/x-msdownload", 1024)

    # Exceeding size limit raises FileTooLargeError
    with pytest.raises(FileTooLargeError, match="exceeds maximum allowed limit"):
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
        url = generate_presigned_download_url(
            "wealthos-documents", "doc123.pdf", expiration_seconds=900
        )
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
        "fields": {"key": "doc123.pdf", "Content-Type": "application/pdf"},
    }
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        res = generate_presigned_upload_url(
            "wealthos-documents",
            "doc123.pdf",
            content_type="application/pdf",
            expiration_seconds=600,
        )
        assert res["url"] == "https://s3.local/wealthos-documents"
        mock_s3.generate_presigned_post.assert_called_once_with(
            "wealthos-documents",
            "doc123.pdf",
            Fields={"Content-Type": "application/pdf"},
            Conditions=[
                {"Content-Type": "application/pdf"},
                ["content-length-range", 1, MAX_DOCUMENT_SIZE_BYTES],
            ],
            ExpiresIn=600,
        )


def test_delete_file():
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        result = delete_file("wealthos-documents", "doc123.pdf")
        assert result is True
        mock_s3.delete_object.assert_called_once_with(Bucket="wealthos-documents", Key="doc123.pdf")


def test_init_storage_buckets():
    mock_s3 = MagicMock()
    # Simulate buckets do not exist yet
    mock_s3.head_bucket.side_effect = ClientError(
        {"Error": {"Code": "NoSuchBucket", "Message": "The specified bucket does not exist"}},
        "HeadBucket",
    )
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        init_storage()
        # Verify private bucket creation was attempted
        assert mock_s3.create_bucket.call_count >= 1


def test_check_storage_health():
    mock_s3 = MagicMock()
    mock_s3.list_buckets.return_value = {"Buckets": []}
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        health = check_storage_health()
        assert health["status"] == "healthy"
        assert "endpoint" in health

    # Storage error handling
    mock_s3.list_buckets.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}}, "ListBuckets"
    )
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        health = check_storage_health()
        assert health["status"] == "unhealthy"
        assert "Access Denied" in health["error"]


def test_upload_to_quarantine():
    """Verify document is deposited in quarantine bucket with proper key and metadata."""
    mock_s3 = MagicMock()
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        record = upload_to_quarantine(
            file_data=b"%PDF-1.7 bank statement bytes",
            filename="hdfc_statement.pdf",
            declared_content_type="application/pdf",
            tenant_id="tenant-123",
        )
        assert record["status"] == "quarantined"
        assert record["bucket"] == "wealthos-quarantine"
        assert "quarantine/tenant-123/" in record["quarantine_key"]
        assert mock_s3.upload_fileobj.call_count == 1


def test_generate_presigned_quarantine_upload_url():
    """Verify presigned upload URL targets exclusively the quarantine bucket."""
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_post.return_value = {
        "url": "http://localhost:9000/wealthos-quarantine",
        "fields": {"key": "quarantine/tenant-123/uuid-test.pdf"},
    }
    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        res = generate_presigned_quarantine_upload_url(
            tenant_id="tenant-123",
            filename="test.pdf",
            content_type="application/pdf",
        )
        assert "wealthos-quarantine" in res["url"]


def test_validate_and_promote_quarantine_document_success():
    """Verify safe document in quarantine passes server-side verification and is promoted."""
    mock_s3 = MagicMock()
    mock_s3.head_object.return_value = {"ContentType": "application/pdf"}

    pdf_bytes = b"%PDF-1.7 Valid statement content"

    def mock_download(bucket, key, buf):
        buf.write(pdf_bytes)

    mock_s3.download_fileobj.side_effect = mock_download

    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        outcome = validate_and_promote_quarantine_document(
            quarantine_key="quarantine/tenant-123/uuid-statement.pdf",
            target_bucket="wealthos-documents",
            target_key="verified/tenant-123/statement.pdf",
        )
        assert outcome["status"] == "promoted"
        assert outcome["content_type"] == "application/pdf"
        assert outcome["target_bucket"] == "wealthos-documents"
        # Verify quarantine object was deleted after promotion
        mock_s3.delete_object.assert_called_with(
            Bucket="wealthos-quarantine", Key="quarantine/tenant-123/uuid-statement.pdf"
        )


def test_validate_and_promote_quarantine_document_mime_spoofing_rejected():
    """Verify MIME spoofing in quarantine triggers DocumentQuarantineError and document cleanup."""
    mock_s3 = MagicMock()
    mock_s3.head_object.return_value = {"ContentType": "application/pdf"}

    # Malicious payload: text claiming to be PDF
    fake_pdf = b"MALICIOUS_SHELL_SCRIPT_DO_NOT_RUN"

    def mock_download(bucket, key, buf):
        buf.write(fake_pdf)

    mock_s3.download_fileobj.side_effect = mock_download

    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        with pytest.raises(DocumentQuarantineError, match="Quarantine verification failed"):
            validate_and_promote_quarantine_document(
                quarantine_key="quarantine/tenant-123/uuid-fake.pdf",
                target_bucket="wealthos-documents",
            )
        # Verify malicious object was deleted from quarantine
        mock_s3.delete_object.assert_called_with(
            Bucket="wealthos-quarantine", Key="quarantine/tenant-123/uuid-fake.pdf"
        )


def test_validate_and_promote_quarantine_document_empty_rejected():
    """Verify empty document in quarantine is rejected and deleted."""
    mock_s3 = MagicMock()
    mock_s3.head_object.return_value = {"ContentType": "application/pdf"}

    def mock_download(bucket, key, buf):
        buf.write(b"")

    mock_s3.download_fileobj.side_effect = mock_download

    with patch("app.infrastructure.storage.get_s3_client", return_value=mock_s3):
        with pytest.raises(DocumentQuarantineError, match="empty"):
            validate_and_promote_quarantine_document(
                quarantine_key="quarantine/tenant-123/uuid-empty.pdf",
                target_bucket="wealthos-documents",
            )
        mock_s3.delete_object.assert_called_with(
            Bucket="wealthos-quarantine", Key="quarantine/tenant-123/uuid-empty.pdf"
        )
