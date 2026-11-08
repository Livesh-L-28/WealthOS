"""WealthOS Enterprise Stateful Circuit Breaker.

Guards external network calls (broker APIs, OCR backends, market data vendors)
against cascading failures using a stateful CLOSED -> OPEN -> HALF_OPEN finite state machine.
"""

from __future__ import annotations

import asyncio
import time
from enum import Enum
from typing import Any, Callable, Coroutine

from app.core.logging import get_logger

logger = get_logger("wealthos.circuit_breaker")


class CircuitState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpenError(Exception):
    """Raised when an operation is rejected because the circuit breaker is OPEN."""

    def __init__(self, service_name: str, retry_after_seconds: float) -> None:
        super().__init__(
            f"Circuit breaker for '{service_name}' is OPEN. "
            f"Downstream service degraded. Retry in {retry_after_seconds:.1f}s."
        )
        self.service_name = service_name
        self.retry_after_seconds = retry_after_seconds


class CircuitBreaker:
    """Stateful circuit breaker protecting against cascading third-party API failures."""

    def __init__(
        self,
        service_name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_success_threshold: int = 2,
    ) -> None:
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_success_threshold = half_open_success_threshold

        self._state = CircuitState.CLOSED
        self._consecutive_failures = 0
        self._half_open_successes = 0
        self._last_state_change = time.monotonic()
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        """Return the current circuit state, checking for timeout transition to HALF_OPEN."""
        if self._state == CircuitState.OPEN:
            elapsed = time.monotonic() - self._last_state_change
            if elapsed >= self.recovery_timeout:
                return CircuitState.HALF_OPEN
        return self._state

    async def record_success(self) -> None:
        """Record successful downstream response."""
        async with self._lock:
            current_state = self.state
            if current_state == CircuitState.HALF_OPEN:
                self._half_open_successes += 1
                if self._half_open_successes >= self.half_open_success_threshold:
                    self._state = CircuitState.CLOSED
                    self._consecutive_failures = 0
                    self._half_open_successes = 0
                    self._last_state_change = time.monotonic()
                    logger.info(f"Circuit breaker '{self.service_name}' recovered to CLOSED.")
            elif current_state == CircuitState.CLOSED:
                self._consecutive_failures = 0

    async def record_failure(self) -> None:
        """Record downstream failure or timeout."""
        async with self._lock:
            current_state = self.state
            self._consecutive_failures += 1
            if current_state in (CircuitState.CLOSED, CircuitState.HALF_OPEN):
                if current_state == CircuitState.HALF_OPEN or self._consecutive_failures >= self.failure_threshold:
                    self._state = CircuitState.OPEN
                    self._last_state_change = time.monotonic()
                    self._half_open_successes = 0
                    logger.warning(
                        f"Circuit breaker '{self.service_name}' tripped to OPEN "
                        f"({self._consecutive_failures} consecutive failures)."
                    )

    async def call(
        self,
        func: Callable[..., Coroutine[Any, Any, Any]],
        *args: Any,
        **kwargs: Any,
    ) -> Any:
        """Execute async function guarded by circuit breaker state."""
        current_state = self.state
        if current_state == CircuitState.OPEN:
            elapsed = time.monotonic() - self._last_state_change
            remaining = max(0.0, self.recovery_timeout - elapsed)
            raise CircuitBreakerOpenError(self.service_name, remaining)

        try:
            result = await func(*args, **kwargs)
            await self.record_success()
            return result
        except Exception as e:
            await self.record_failure()
            raise e

    def get_telemetry(self) -> dict[str, Any]:
        """Telemetry representation for monitoring dashboards."""
        return {
            "service_name": self.service_name,
            "state": self.state.value,
            "consecutive_failures": self._consecutive_failures,
            "failure_threshold": self.failure_threshold,
            "recovery_timeout_seconds": self.recovery_timeout,
        }
