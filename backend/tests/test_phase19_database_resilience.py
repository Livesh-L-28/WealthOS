"""WealthOS Phase 19 Workstream 2: Database Resilience, Topology & Lag Tests.

Validates replication lag telemetry, safe database topology controller,
node draining, split-brain protection fencing, and read fallback circuits.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import check_replication_lag
from app.core.topology_controller import (
    DatabaseTopologyController,
    NodeHealth,
    NodeRole,
    NoPrimaryAvailableError,
    NoReadNodeAvailableError,
    SplitBrainProtectionError,
)


@pytest.mark.asyncio
async def test_check_replication_lag_on_primary(db_session: AsyncSession):
    """Verify replication lag query executes safely and reports primary state."""
    lag_info = await check_replication_lag(db_session)
    assert isinstance(lag_info, dict)
    assert "in_recovery" in lag_info
    assert "lag_ms" in lag_info
    assert "is_healthy" in lag_info
    assert lag_info["in_recovery"] is False
    assert lag_info["lag_ms"] == 0.0
    assert lag_info["is_healthy"] is True


@pytest.mark.asyncio
async def test_topology_controller_registration_and_split_brain():
    """Verify node registration and strict split-brain single-primary protection."""
    controller = DatabaseTopologyController(max_lag_ms=1000.0)

    # 1. Register Primary
    p_node = await controller.register_node(
        node_id="pg-primary-01",
        role=NodeRole.PRIMARY,
        endpoint_ref="postgres-primary:5432",
    )
    assert p_node.role == NodeRole.PRIMARY
    assert p_node.health == NodeHealth.HEALTHY

    # 2. Register Standby
    s_node = await controller.register_node(
        node_id="pg-standby-01",
        role=NodeRole.STANDBY,
        endpoint_ref="postgres-standby-01:5432",
    )
    assert s_node.role == NodeRole.STANDBY

    # 3. Attempt to register second Primary -> SplitBrainProtectionError
    with pytest.raises(SplitBrainProtectionError):
        await controller.register_node(
            node_id="pg-rogue-primary",
            role=NodeRole.PRIMARY,
            endpoint_ref="postgres-rogue:5432",
        )

    status = await controller.get_topology_status()
    assert status["primary_node_id"] == "pg-primary-01"
    assert status["total_nodes"] == 2
    assert status["total_standbys"] == 1
    assert status["healthy_standbys"] == 1


@pytest.mark.asyncio
async def test_topology_controller_routing_and_lag_circuit_breaker():
    """Verify read query routing prioritizes low-lag replicas and falls back to primary."""
    controller = DatabaseTopologyController(max_lag_ms=1000.0)

    await controller.register_node(
        node_id="pg-primary",
        role=NodeRole.PRIMARY,
        endpoint_ref="primary:5432",
    )
    await controller.register_node(
        node_id="pg-standby-1",
        role=NodeRole.STANDBY,
        endpoint_ref="standby1:5432",
    )
    await controller.register_node(
        node_id="pg-standby-2",
        role=NodeRole.STANDBY,
        endpoint_ref="standby2:5432",
    )

    # Both standbys healthy: routes to standby with lowest lag
    await controller.update_health("pg-standby-1", health=NodeHealth.HEALTHY, replication_lag_ms=45.0)
    await controller.update_health("pg-standby-2", health=NodeHealth.HEALTHY, replication_lag_ms=12.0)

    read_node = await controller.get_read_node()
    assert read_node.node_id == "pg-standby-2"  # Lowest lag

    # Degrade standby-2 with high replication lag (1500ms > 1000ms threshold)
    await controller.update_health("pg-standby-2", health=NodeHealth.HEALTHY, replication_lag_ms=1500.0)
    read_node = await controller.get_read_node()
    assert read_node.node_id == "pg-standby-1"  # Next eligible standby

    # Degrade standby-1 as well (2200ms)
    await controller.update_health("pg-standby-1", health=NodeHealth.HEALTHY, replication_lag_ms=2200.0)
    # Both standbys lagging: circuit breaker falls back to primary writer
    read_node = await controller.get_read_node()
    assert read_node.node_id == "pg-primary"


@pytest.mark.asyncio
async def test_topology_controller_draining_and_fenced_promotion():
    """Verify graceful node draining and safe promotion with old-primary fencing."""
    controller = DatabaseTopologyController(max_lag_ms=1000.0)

    await controller.register_node(
        node_id="pg-primary",
        role=NodeRole.PRIMARY,
        endpoint_ref="primary:5432",
    )
    await controller.register_node(
        node_id="pg-standby",
        role=NodeRole.STANDBY,
        endpoint_ref="standby:5432",
    )

    # 1. Drain standby
    await controller.drain_node("pg-standby")
    read_node = await controller.get_read_node()
    assert read_node.node_id == "pg-primary"  # Standby drained -> fallback to primary

    # Undrain standby
    await controller.undrain_node("pg-standby")
    read_node = await controller.get_read_node()
    assert read_node.node_id == "pg-standby"

    # 2. Promote standby to primary with fencing
    new_primary = await controller.promote_standby("pg-standby", fence_old_primary=True)
    assert new_primary.node_id == "pg-standby"
    assert new_primary.role == NodeRole.PRIMARY

    # Old primary must now be demoted, drained, and fenced
    status = await controller.get_topology_status()
    assert status["primary_node_id"] == "pg-standby"
    assert "pg-primary" in status["fenced_nodes"]
    assert status["nodes"]["pg-primary"]["is_drained"] is True
    assert status["nodes"]["pg-primary"]["role"] == "STANDBY"

    # Write traffic safely routes to new primary
    write_node = await controller.get_write_node()
    assert write_node.node_id == "pg-standby"
