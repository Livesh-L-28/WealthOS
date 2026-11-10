"""WealthOS Phase 27 Synchronization & Offline-First Engine Test Suite."""

import pytest
import uuid
from unittest.mock import MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import get_current_tenant_context, TenantContext


@pytest.fixture
def mock_tenant_context():
    tenant_id = uuid.uuid4()
    user_id = uuid.uuid4()
    session_id = uuid.uuid4()

    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = "sync.tester@wealthos.internal"

    mock_tenant = MagicMock()
    mock_tenant.id = tenant_id
    mock_tenant.name = "Sync Test Tenant"

    mock_membership = MagicMock()
    mock_membership.id = uuid.uuid4()

    ctx = TenantContext(
        user=mock_user,
        tenant=mock_tenant,
        membership=mock_membership,
        roles={"owner"},
        permissions={"*"},
        session_id=session_id,
    )

    app.dependency_overrides[get_current_tenant_context] = lambda: ctx
    yield {"tenant_id": str(tenant_id), "user_id": str(user_id)}
    app.dependency_overrides.pop(get_current_tenant_context, None)


@pytest.mark.asyncio
async def test_sync_session_creation(mock_tenant_context):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "device_id": f"dev-{uuid.uuid4().hex[:8]}",
            "client_version": "1.0.1",
            "platform": "android",
        }
        res = await client.post("/api/v1/sync/sessions", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert "session_id" in data
        assert data["tenant_id"] == mock_tenant_context["tenant_id"]
        assert "server_timestamp" in data
        assert "active_cursor" in data


@pytest.mark.asyncio
async def test_sync_batch_submission_and_idempotency(mock_tenant_context):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Establish session
        sess_res = await client.post(
            "/api/v1/sync/sessions",
            json={"device_id": "dev-001", "client_version": "1.0.1", "platform": "web"},
        )
        session_id = sess_res.json()["session_id"]

        op_id_1 = str(uuid.uuid4())
        idem_key_1 = f"idem-{uuid.uuid4().hex}"

        batch_payload = {
            "session_id": session_id,
            "operations": [
                {
                    "operation_id": op_id_1,
                    "operation_type": "RECORD_EXPENSE",
                    "idempotency_key": idem_key_1,
                    "client_timestamp": "2026-11-10T11:00:00Z",
                    "payload": {"amount": "1450.00", "category": "Groceries"},
                }
            ],
        }

        # 2. First submission -> should accept
        res1 = await client.post("/api/v1/sync/operations", json=batch_payload)
        assert res1.status_code == 200
        data1 = res1.json()
        assert op_id_1 in data1["accepted_operations"]
        assert len(data1["rejected_operations"]) == 0

        # 3. Duplicate submission with identical idempotency key -> idempotent acceptance
        res2 = await client.post("/api/v1/sync/operations", json=batch_payload)
        assert res2.status_code == 200
        data2 = res2.json()
        assert op_id_1 in data2["accepted_operations"]

        # 4. Idempotency collision with DIFFERENT payload -> rejected
        different_payload_batch = {
            "session_id": session_id,
            "operations": [
                {
                    "operation_id": str(uuid.uuid4()),
                    "operation_type": "RECORD_EXPENSE",
                    "idempotency_key": idem_key_1,
                    "client_timestamp": "2026-11-10T11:00:00Z",
                    "payload": {"amount": "999999.00", "category": "Luxury Yacht"}, # Altered payload
                }
            ],
        }
        res3 = await client.post("/api/v1/sync/operations", json=different_payload_batch)
        assert res3.status_code == 200
        data3 = res3.json()
        assert len(data3["rejected_operations"]) == 1
        assert "IDEMPOTENCY_CONFLICT" in data3["rejected_operations"][0]["error"]


@pytest.mark.asyncio
async def test_sync_conflict_detection_and_resolution(mock_tenant_context):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Submit operation against closed account -> triggers conflict
        op_conflict_id = str(uuid.uuid4())
        batch_payload = {
            "session_id": "test-session",
            "operations": [
                {
                    "operation_id": op_conflict_id,
                    "operation_type": "RECORD_EXPENSE",
                    "idempotency_key": f"idem-{uuid.uuid4().hex}",
                    "client_timestamp": "2026-11-10T11:00:00Z",
                    "payload": {
                        "amount": "2500.00",
                        "account_id": "acc-old-closed",
                        "account_status": "CLOSED",
                    },
                }
            ],
        }
        batch_res = await client.post("/api/v1/sync/operations", json=batch_payload)
        assert batch_res.status_code == 200
        batch_data = batch_res.json()
        assert len(batch_data["conflict_operations"]) == 1
        conflict_item = batch_data["conflict_operations"][0]
        conflict_id = conflict_item["conflict_id"]

        # 2. Query active conflicts
        conflicts_res = await client.get("/api/v1/sync/conflicts")
        assert conflicts_res.status_code == 200
        conflicts_list = conflicts_res.json()
        assert any(c["conflict_id"] == conflict_id for c in conflicts_list)

        # 3. Attempt CLIENT_WIN on CLOSED account -> rejected (backend remains authoritative)
        invalid_resolve = await client.post(
            f"/api/v1/sync/conflicts/{conflict_id}/resolve",
            json={"resolution_strategy": "CLIENT_WIN"},
        )
        assert invalid_resolve.status_code == 404
        assert "CLIENT_WIN cannot post to a CLOSED account" in str(invalid_resolve.json())

        # 4. Resolve conflict with SERVER_WIN -> succeeds
        resolve_res = await client.post(
            f"/api/v1/sync/conflicts/{conflict_id}/resolve",
            json={"resolution_strategy": "SERVER_WIN"},
        )
        assert resolve_res.status_code == 200
        assert resolve_res.json()["status"] == "RESOLVED"


@pytest.mark.asyncio
async def test_sync_delta_and_device_management(mock_tenant_context):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Delta stream
        delta_res = await client.get("/api/v1/sync/delta?since_cursor=cur-initial")
        assert delta_res.status_code == 200
        delta_data = delta_res.json()
        assert "cursor" in delta_data
        assert "changes" in delta_data

        # 2. Register device
        dev_id = f"hw-{uuid.uuid4().hex[:8]}"
        reg_res = await client.post(
            "/api/v1/sync/devices",
            json={
                "device_id": dev_id,
                "device_name": "Pixel 8 Pro (Staging)",
                "platform": "android",
                "app_version": "1.0.1",
            },
        )
        assert reg_res.status_code == 201
        assert reg_res.json()["status"] == "ACTIVE"

        # 3. Revoke device
        revoke_res = await client.post(f"/api/v1/sync/devices/{dev_id}/revoke")
        assert revoke_res.status_code == 200
        assert revoke_res.json()["status"] == "REVOKED"
