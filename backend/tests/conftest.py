"""Pytest configuration and test fixtures for WealthOS Backend."""

import os

import pytest
from httpx import ASGITransport, AsyncClient

# Set testing environment variables before importing app
os.environ["ENVIRONMENT"] = "testing"
os.environ["DEBUG"] = "true"
os.environ["LOG_LEVEL"] = "DEBUG"
os.environ["POSTGRES_DB"] = "wealthos_test"

from app.main import create_app


@pytest.fixture(scope="session")
def app():
    """Create test application instance."""
    return create_app()


@pytest.fixture
async def client(app):
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
