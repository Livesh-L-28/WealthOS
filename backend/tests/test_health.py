"""Tests for WealthOS Health, Diagnostics, and Middleware."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_root_endpoint(client):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert data["service"] == "WealthOS Backend API"
    assert "version" in data
    assert "probes" in data
    assert data["probes"]["liveness"] == "/health/live"
    assert data["probes"]["readiness"] == "/health/ready"


@pytest.mark.asyncio
async def test_health_live_probe(client):
    # Test /health/live
    response = await client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
    assert "timestamp" in data

    # Test legacy /healthz
    response_z = await client.get("/healthz")
    assert response_z.status_code == 200
    assert response_z.json()["status"] == "alive"


@pytest.mark.asyncio
async def test_health_ready_probe_healthy(client):
    with (
        patch("app.api.v1.health.check_database_health", new_callable=AsyncMock) as mock_db,
        patch("app.api.v1.health.check_redis_health", new_callable=AsyncMock) as mock_redis,
    ):
        mock_db.return_value = {"status": "healthy"}
        mock_redis.return_value = {"status": "healthy"}

        # Test /health/ready
        response = await client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert data["database"] == "healthy"
        assert data["redis"] == "healthy"

        # Test legacy /readyz
        response_z = await client.get("/readyz")
        assert response_z.status_code == 200


@pytest.mark.asyncio
async def test_health_ready_probe_degraded(client):
    with (
        patch("app.api.v1.health.check_database_health", new_callable=AsyncMock) as mock_db,
        patch("app.api.v1.health.check_redis_health", new_callable=AsyncMock) as mock_redis,
    ):
        mock_db.return_value = {"status": "unhealthy", "error": "Connection refused"}
        mock_redis.return_value = {"status": "healthy"}

        response = await client.get("/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "unhealthy"


@pytest.mark.asyncio
async def test_detailed_health_report(client):
    with (
        patch("app.api.v1.health.check_database_health", new_callable=AsyncMock) as mock_db,
        patch("app.api.v1.health.check_redis_health", new_callable=AsyncMock) as mock_redis,
        patch("app.api.v1.health.check_celery_health") as mock_celery,
        patch("app.api.v1.health.check_storage_health") as mock_storage,
    ):
        mock_db.return_value = {"status": "healthy"}
        mock_redis.return_value = {"status": "healthy"}
        mock_celery.return_value = {"status": "healthy", "broker": "connected"}
        mock_storage.return_value = {"status": "healthy"}

        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "subsystems" in data
        assert data["subsystems"]["database"]["status"] == "healthy"
        assert data["subsystems"]["redis"]["status"] == "healthy"
        assert data["subsystems"]["celery"]["status"] == "healthy"
        assert data["subsystems"]["storage"]["status"] == "healthy"


@pytest.mark.asyncio
async def test_correlation_id_injection(client):
    # Generated automatically
    response = await client.get("/health/live")
    assert "x-correlation-id" in response.headers
    assert len(response.headers["x-correlation-id"]) > 0

    # Preserved from request header
    custom_cid = "test-cid-987654321"
    response2 = await client.get("/health/live", headers={"X-Correlation-ID": custom_cid})
    assert response2.headers.get("x-correlation-id") == custom_cid


@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    response = await client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
