"""Regression and route uniqueness tests for WealthOS API route registration."""

from collections import Counter
from fastapi.routing import APIRoute, _IncludedRouter
from app.main import create_app


def extract_routes(app_or_router, prefix=""):
    """Recursively extract all (method, full_path) tuples from an app or router."""
    routes = []
    for route in app_or_router.routes:
        if isinstance(route, APIRoute):
            for method in route.methods:
                routes.append((method, prefix + route.path))
        elif isinstance(route, _IncludedRouter):
            sub_prefix = prefix + (route.include_context.prefix or "")
            routes.extend(extract_routes(route.original_router, prefix=sub_prefix))
    return routes


def test_api_route_registration_uniqueness():
    """Verify that every (HTTP method, path) in the application is unique and registered exactly once."""
    app = create_app()
    all_routes = extract_routes(app)

    assert len(all_routes) > 0, "Application must have registered routes"
    counts = Counter(all_routes)
    duplicates = {sig: count for sig, count in counts.items() if count > 1}

    assert not duplicates, f"Found duplicate route registrations: {duplicates}"


def test_copilot_routes_registered_once():
    """Verify that Copilot domain endpoints are registered exactly once."""
    app = create_app()
    all_routes = extract_routes(app)

    copilot_routes = [r for r in all_routes if "/api/v1/copilot" in r[1]]

    assert len(copilot_routes) == 5, f"Expected 5 Copilot routes, found {len(copilot_routes)}: {copilot_routes}"
    counts = Counter(copilot_routes)
    duplicates = {sig: count for sig, count in counts.items() if count > 1}
    assert not duplicates, f"Duplicate Copilot routes detected: {duplicates}"


def test_openapi_schema_generation():
    """Verify OpenAPI schema generates cleanly without route registration conflicts."""
    app = create_app()
    openapi_schema = app.openapi()

    assert openapi_schema is not None
    assert "paths" in openapi_schema
    paths = openapi_schema["paths"]
    assert "/api/v1/copilot/conversations" in paths
    assert "/api/v1/copilot/conversations/{conversation_id}/messages" in paths
    assert "/api/v1/health" in paths
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/accounting/accounts" in paths
