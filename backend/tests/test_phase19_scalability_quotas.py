"""WealthOS Phase 19 Workstream 6: Scalability, Quotas & Circuit Breaker Tests.

Validates tenant resource quota enforcement, atomic consumption, daily rollover,
and stateful CLOSED -> OPEN -> HALF_OPEN circuit breaker state transitions.
"""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpenError,
    CircuitState,
)
from app.domains.tenants.models import Tenant
from app.domains.tenants.quotas import (
    QuotaExceededError,
    QuotaResourceType,
    TenantQuotaService,
)


@pytest.fixture
async def quota_test_tenant(db_session: AsyncSession):
    """Seed test tenant for quota tests."""
    tenant = Tenant(
        id=uuid.uuid4(),
        name="Quota Test Workspace",
        slug=f"quota-ws-{uuid.uuid4().hex[:6]}",
        status="ACTIVE",
    )
    db_session.add(tenant)
    await db_session.flush()

    await db_session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, false);"),
        {"tid": str(tenant.id)},
    )
    return tenant.id


@pytest.mark.asyncio
async def test_tenant_quota_consumption_and_exceeded_error(
    db_session: AsyncSession,
    quota_test_tenant: uuid.UUID,
):
    """Verify tenant quota increment, boundary check, and QuotaExceededError."""
    tenant_id = quota_test_tenant
    quota_svc = TenantQuotaService(db_session)

    # 1. Initialize default quota
    quota = await quota_svc.get_or_create_quotas(tenant_id)
    assert quota.max_daily_ocr_documents == 100
    assert quota.used_ocr_count == 0

    # 2. Consume 40 units
    updated = await quota_svc.check_and_consume_quota(
        tenant_id, QuotaResourceType.OCR_DOCUMENTS, amount=40
    )
    assert updated.used_ocr_count == 40

    # 3. Attempt to consume 70 units (40 + 70 = 110 > 100 limit) -> QuotaExceededError
    with pytest.raises(QuotaExceededError) as exc_info:
        await quota_svc.check_and_consume_quota(
            tenant_id, QuotaResourceType.OCR_DOCUMENTS, amount=70
        )
    assert "Daily quota exceeded for OCR_DOCUMENTS" in str(exc_info.value)

    # 4. Telemetry status verification
    status = await quota_svc.get_quota_status(tenant_id)
    assert status["resources"]["ocr_documents"]["used"] == 40
    assert status["resources"]["ocr_documents"]["remaining"] == 60


@pytest.mark.asyncio
async def test_tenant_quota_daily_rollover(
    db_session: AsyncSession,
    quota_test_tenant: uuid.UUID,
):
    """Verify daily rollover resets consumed counts when date rolls over."""
    tenant_id = quota_test_tenant
    quota_svc = TenantQuotaService(db_session)

    quota = await quota_svc.get_or_create_quotas(tenant_id)
    quota.used_ocr_count = 95
    quota.used_ai_count = 490
    # Artificially set reset date to yesterday
    quota.quota_reset_date = datetime.now(UTC).date() - timedelta(days=1)
    await db_session.flush()

    # Next call should detect expired date and reset usage to 0
    refreshed = await quota_svc.get_or_create_quotas(tenant_id)
    assert refreshed.used_ocr_count == 0
    assert refreshed.used_ai_count == 0
    assert refreshed.quota_reset_date == datetime.now(UTC).date()


@pytest.mark.asyncio
async def test_stateful_circuit_breaker_transitions():
    """Verify CLOSED -> OPEN -> HALF_OPEN -> CLOSED state machine transitions."""
    cb = CircuitBreaker(
        service_name="Zerodha_Broker_API",
        failure_threshold=3,
        recovery_timeout=0.1,  # 100ms for fast test execution
        half_open_success_threshold=2,
    )

    assert cb.state == CircuitState.CLOSED

    # Async dummy downstream
    call_count = 0

    async def flaky_api(should_fail: bool):
        nonlocal call_count
        call_count += 1
        if should_fail:
            raise ConnectionError("Upstream broker gateway timed out")
        return "SUCCESS_PORTFOLIO_PAYLOAD"

    # 1. Successful call in CLOSED
    res = await cb.call(flaky_api, should_fail=False)
    assert res == "SUCCESS_PORTFOLIO_PAYLOAD"
    assert cb.state == CircuitState.CLOSED

    # 2. Trip breaker with 3 consecutive failures
    for _ in range(3):
        with pytest.raises(ConnectionError):
            await cb.call(flaky_api, should_fail=True)

    assert cb.state == CircuitState.OPEN

    # 3. Call while OPEN must fail fast without calling downstream function
    prior_calls = call_count
    with pytest.raises(CircuitBreakerOpenError):
        await cb.call(flaky_api, should_fail=False)
    assert call_count == prior_calls  # Underlying function was not called!

    # 4. Wait for recovery timeout -> transitions to HALF_OPEN
    await asyncio.sleep(0.12)
    assert cb.state == CircuitState.HALF_OPEN

    # 5. Execute 2 successful calls in HALF_OPEN to heal circuit
    await cb.call(flaky_api, should_fail=False)
    await cb.call(flaky_api, should_fail=False)

    assert cb.state == CircuitState.CLOSED

