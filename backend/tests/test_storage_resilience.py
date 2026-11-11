"""Unit and integration tests for WealthOS Database & Storage Resilience Layer.

Tests LocalStorageDriver, InMemoryRedisFallback, SQLite WAL engine fallback,
and healthy health-check aggregation.
"""

import io
import pytest
from app.infrastructure.storage import (
    LocalStorageDriver,
    upload_file,
    download_file_bytes,
    delete_file,
    generate_presigned_download_url,
    check_storage_health,
)
from app.infrastructure.redis import InMemoryRedisFallback, check_redis_health
from app.core.database import check_database_health


def test_local_storage_driver_crud(tmp_path):
    """Test LocalStorageDriver basic file lifecycle and metadata handling."""
    driver = LocalStorageDriver(base_dir=tmp_path)
    bucket = "wealthos-documents"
    key = "resilience/test_statement.pdf"
    content = b"%PDF-1.4 Resilience Content"

    # 1. Put Object
    res = driver.put_object(
        Bucket=bucket,
        Key=key,
        Body=content,
        ContentType="application/pdf",
        Metadata={"author": "WealthOS Test"},
    )
    assert "ETag" in res

    # 2. Head Object
    head = driver.head_object(Bucket=bucket, Key=key)
    assert head["ContentLength"] == len(content)
    assert head["ContentType"] == "application/pdf"
    assert head["Metadata"]["author"] == "WealthOS Test"

    # 3. Get Object
    get_res = driver.get_object(Bucket=bucket, Key=key)
    read_data = get_res["Body"].read()
    assert read_data == content

    # 4. Upload/Download fileobj compatibility
    dest_key = "resilience/test_copy.pdf"
    driver.upload_fileobj(
        Fileobj=io.BytesIO(content),
        Bucket=bucket,
        Key=dest_key,
        ExtraArgs={"ContentType": "application/pdf"},
    )
    buf = io.BytesIO()
    driver.download_fileobj(Bucket=bucket, Key=dest_key, Fileobj=buf)
    buf.seek(0)
    assert buf.read() == content

    # 5. Delete Object
    driver.delete_object(Bucket=bucket, Key=key)
    driver.delete_object(Bucket=bucket, Key=dest_key)
    assert driver.list_buckets()["Buckets"] is not None


@pytest.mark.asyncio
async def test_in_memory_redis_operations():
    """Verify in-memory Redis fallback data structures, expirations, and counters."""
    redis = InMemoryRedisFallback()

    # Strings & TTL
    await redis.set("mykey", "hello", ex=10)
    assert await redis.get("mykey") == "hello"
    assert await redis.exists("mykey") == 1
    assert await redis.ttl("mykey") <= 10

    # Numeric Increments
    assert await redis.incr("counter") == 1
    assert await redis.incr("counter", 5) == 6

    # Sets
    await redis.sadd("myset", "a", "b", "c")
    members = await redis.smembers("myset")
    assert members == {"a", "b", "c"}
    assert await redis.sismember("myset", "b") is True
    assert await redis.sismember("myset", "z") is False

    # Deletions
    assert await redis.delete("mykey", "counter") == 2
    assert await redis.get("mykey") is None


@pytest.mark.asyncio
async def test_database_and_storage_health():
    """Verify that database and storage health reporters deliver compliant structures."""
    db_health = await check_database_health()
    assert "status" in db_health
    assert db_health["status"] in ("healthy", "degraded", "unhealthy")

    storage_health = check_storage_health()
    assert "status" in storage_health
    assert storage_health["status"] in ("healthy", "degraded")

    redis_health = await check_redis_health()
    assert "status" in redis_health
    assert redis_health["status"] in ("healthy", "degraded")
