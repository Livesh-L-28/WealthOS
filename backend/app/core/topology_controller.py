"""WealthOS Safe Database Topology Controller.

Manages PostgreSQL database cluster topology, health monitoring, replication lag,
graceful connection draining, split-brain prevention fencing, and dynamic read/write routing.
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any

from app.core.logging import get_logger

logger = get_logger("wealthos.topology_controller")


class NodeRole(str, Enum):
    PRIMARY = "PRIMARY"
    STANDBY = "STANDBY"


class NodeHealth(str, Enum):
    HEALTHY = "HEALTHY"
    DEGRADED = "DEGRADED"
    UNAVAILABLE = "UNAVAILABLE"


class TopologyError(Exception):
    """Base exception for database topology errors."""


class NoPrimaryAvailableError(TopologyError):
    """Raised when no healthy primary node is available for write traffic."""


class NoReadNodeAvailableError(TopologyError):
    """Raised when no healthy read replica or primary fallback is available."""


class SplitBrainProtectionError(TopologyError):
    """Raised when an operation would violate single-primary / fencing invariants."""


@dataclass
class DatabaseNode:
    """Represents a database node in the cluster topology."""

    node_id: str
    role: NodeRole
    endpoint_ref: str
    health: NodeHealth = NodeHealth.HEALTHY
    readiness: bool = True
    replication_lag_ms: float = 0.0
    is_drained: bool = False
    active_requests: int = 0
    weight: int = 100
    registered_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    last_health_check_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def is_eligible_for_reads(self, max_lag_ms: float = 1000.0) -> bool:
        """Evaluate if the node is capable of safely serving read requests."""
        if self.is_drained or not self.readiness:
            return False
        if self.health == NodeHealth.UNAVAILABLE:
            return False
        if self.role == NodeRole.STANDBY and self.replication_lag_ms > max_lag_ms:
            return False
        return True

    def is_eligible_for_writes(self) -> bool:
        """Evaluate if the node is capable of safely serving write requests."""
        if self.is_drained or not self.readiness:
            return False
        if self.role != NodeRole.PRIMARY:
            return False
        if self.health != NodeHealth.HEALTHY:
            return False
        return True


class DatabaseTopologyController:
    """Enterprise Database Topology Controller.
    
    Provides thread-safe state management for database nodes, automated failover
    fencing, dynamic traffic routing, and graceful node draining.
    """

    def __init__(self, max_lag_ms: float = 1000.0) -> None:
        self.max_lag_ms = max_lag_ms
        self._nodes: dict[str, DatabaseNode] = {}
        self._lock = asyncio.Lock()
        self._fenced_nodes: set[str] = set()

    async def register_node(
        self,
        node_id: str,
        role: NodeRole | str,
        endpoint_ref: str,
        health: NodeHealth | str = NodeHealth.HEALTHY,
        readiness: bool = True,
        weight: int = 100,
    ) -> DatabaseNode:
        """Register a new or updated database node in the cluster."""
        role_enum = NodeRole(role) if isinstance(role, str) else role
        health_enum = NodeHealth(health) if isinstance(health, str) else health

        async with self._lock:
            # Single-primary invariant: reject second PRIMARY registration unless existing is demoted
            if role_enum == NodeRole.PRIMARY:
                for existing_id, existing_node in self._nodes.items():
                    if (
                        existing_node.role == NodeRole.PRIMARY
                        and existing_id != node_id
                        and existing_id not in self._fenced_nodes
                    ):
                        raise SplitBrainProtectionError(
                            f"Cannot register PRIMARY '{node_id}': active PRIMARY '{existing_id}' already exists."
                        )

            node = DatabaseNode(
                node_id=node_id,
                role=role_enum,
                endpoint_ref=endpoint_ref,
                health=health_enum,
                readiness=readiness,
                weight=weight,
            )
            self._nodes[node_id] = node
            logger.info(f"Registered topology node: {node_id} (role={role_enum.value}, health={health_enum.value})")
            return node

    async def deregister_node(self, node_id: str) -> None:
        """Remove a node from the cluster topology."""
        async with self._lock:
            if node_id in self._nodes:
                del self._nodes[node_id]
                self._fenced_nodes.discard(node_id)
                logger.info(f"Deregistered topology node: {node_id}")

    async def drain_node(self, node_id: str) -> DatabaseNode:
        """Gracefully drain traffic from a node for maintenance or decommission."""
        async with self._lock:
            if node_id not in self._nodes:
                raise TopologyError(f"Node '{node_id}' not found in topology.")
            node = self._nodes[node_id]
            node.is_drained = True
            logger.warning(f"Node '{node_id}' marked as DRAINED. Disallowing new traffic.")
            return node

    async def undrain_node(self, node_id: str) -> DatabaseNode:
        """Restore traffic routing to a previously drained node."""
        async with self._lock:
            if node_id not in self._nodes:
                raise TopologyError(f"Node '{node_id}' not found in topology.")
            node = self._nodes[node_id]
            node.is_drained = False
            logger.info(f"Node '{node_id}' undrained. Restored to active traffic.")
            return node

    async def update_health(
        self,
        node_id: str,
        health: NodeHealth | str,
        replication_lag_ms: float = 0.0,
        readiness: bool | None = None,
    ) -> DatabaseNode:
        """Update node operational metrics, health, and replication lag."""
        health_enum = NodeHealth(health) if isinstance(health, str) else health
        async with self._lock:
            if node_id not in self._nodes:
                raise TopologyError(f"Node '{node_id}' not found in topology.")
            node = self._nodes[node_id]
            node.health = health_enum
            node.replication_lag_ms = max(0.0, float(replication_lag_ms))
            if readiness is not None:
                node.readiness = readiness
            node.last_health_check_at = datetime.now(UTC)
            return node

    async def get_write_node(self) -> DatabaseNode:
        """Select active PRIMARY node for write transactions (fails closed)."""
        async with self._lock:
            for node in self._nodes.values():
                if node.role == NodeRole.PRIMARY and node.is_eligible_for_writes():
                    return node
            raise NoPrimaryAvailableError("No eligible, healthy PRIMARY node available for write operations.")

    async def get_read_node(self) -> DatabaseNode:
        """Select optimal node for read queries.
        
        Prioritizes eligible Standby replicas with minimal replication lag;
        gracefully falls back to Primary if no Standby is healthy or ready.
        """
        async with self._lock:
            # 1. Filter eligible Standbys
            standbys = [
                n
                for n in self._nodes.values()
                if n.role == NodeRole.STANDBY and n.is_eligible_for_reads(self.max_lag_ms)
            ]
            if standbys:
                # Pick standby with least replication lag, then least active requests
                standbys.sort(key=lambda n: (n.replication_lag_ms, n.active_requests))
                return standbys[0]

            # 2. Fallback to Primary writer
            for node in self._nodes.values():
                if node.role == NodeRole.PRIMARY and not node.is_drained and node.health != NodeHealth.UNAVAILABLE:
                    return node

            raise NoReadNodeAvailableError("Zero healthy database nodes (standby or primary) available for reads.")

    async def promote_standby(
        self,
        new_primary_id: str,
        fence_old_primary: bool = True,
    ) -> DatabaseNode:
        """Safely promote a STANDBY node to PRIMARY with split-brain fencing."""
        async with self._lock:
            if new_primary_id not in self._nodes:
                raise TopologyError(f"Candidate node '{new_primary_id}' not found in topology.")
            candidate = self._nodes[new_primary_id]

            if candidate.role == NodeRole.PRIMARY:
                return candidate  # Already primary

            if candidate.health != NodeHealth.HEALTHY:
                raise TopologyError(f"Cannot promote unhealthy candidate '{new_primary_id}' ({candidate.health.value}).")

            if candidate.is_drained:
                raise TopologyError(f"Cannot promote drained candidate '{new_primary_id}'.")

            # 1. Fence all existing primaries to prevent split-brain dual writers
            for node_id, node in self._nodes.items():
                if node.role == NodeRole.PRIMARY and node_id != new_primary_id:
                    if fence_old_primary:
                        node.role = NodeRole.STANDBY
                        node.is_drained = True
                        self._fenced_nodes.add(node_id)
                        logger.warning(
                            f"[FENCING] Demoted and drained prior PRIMARY '{node_id}' to prevent split-brain."
                        )
                    else:
                        raise SplitBrainProtectionError(
                            f"Refusing promotion without fencing existing PRIMARY '{node_id}'."
                        )

            # 2. Promote candidate
            candidate.role = NodeRole.PRIMARY
            candidate.replication_lag_ms = 0.0
            self._fenced_nodes.discard(new_primary_id)
            logger.info(f"[PROMOTION] Standby '{new_primary_id}' successfully promoted to PRIMARY.")
            return candidate

    async def get_topology_status(self) -> dict[str, Any]:
        """Generate complete cluster topology telemetry dictionary."""
        async with self._lock:
            nodes_data = {}
            primary_id = None
            total_standbys = 0
            healthy_standbys = 0

            for nid, node in self._nodes.items():
                node_dict = asdict(node)
                node_dict["role"] = node.role.value
                node_dict["health"] = node.health.value
                node_dict["registered_at"] = node.registered_at.isoformat()
                node_dict["last_health_check_at"] = node.last_health_check_at.isoformat()
                nodes_data[nid] = node_dict

                if node.role == NodeRole.PRIMARY:
                    primary_id = nid
                elif node.role == NodeRole.STANDBY:
                    total_standbys += 1
                    if node.is_eligible_for_reads(self.max_lag_ms):
                        healthy_standbys += 1

            return {
                "primary_node_id": primary_id,
                "total_nodes": len(self._nodes),
                "total_standbys": total_standbys,
                "healthy_standbys": healthy_standbys,
                "max_lag_threshold_ms": self.max_lag_ms,
                "fenced_nodes": list(self._fenced_nodes),
                "nodes": nodes_data,
            }

