"""Tests for WealthOS Asynchronous Financial Worker Tasks."""

import pytest
from app.workers.financial_tasks import (
    generate_financial_report_async,
    parse_document_statement_async,
    sync_market_feed_async,
)


def test_parse_document_statement_async_task():
    """Verify document OCR extraction task executes cleanly and returns structured payload."""
    res = parse_document_statement_async.apply(
        args=["doc-uuid-1234", "tenant-uuid-5678"]
    ).get()

    assert res["status"] == "COMPLETED"
    assert res["document_id"] == "doc-uuid-1234"
    assert res["tenant_id"] == "tenant-uuid-5678"
    assert res["queue"] == "ocr_heavy"
    assert res["extracted_lines"] == 42
    assert res["statement_balance_verified"] is True


def test_sync_market_feed_async_task():
    """Verify market feed synchronization worker updates ticker quotes."""
    symbols = ["RELIANCE", "TCS", "HDFCBANK"]
    res = sync_market_feed_async.apply(args=[symbols, "NSE"]).get()

    assert res["status"] == "SUCCESS"
    assert res["provider"] == "NSE"
    assert res["symbols_count"] == 3
    assert res["queue"] == "market_data"
    assert "RELIANCE" in res["quotes"]


def test_generate_financial_report_async_task():
    """Verify financial report generation task produces export download link."""
    res = generate_financial_report_async.apply(
        args=["balance_sheet", "tenant-uuid-5678"]
    ).get()

    assert res["status"] == "GENERATED"
    assert res["report_type"] == "balance_sheet"
    assert res["tenant_id"] == "tenant-uuid-5678"
    assert res["queue"] == "default"
    assert "/api/v1/reports/download/" in res["download_url"]
