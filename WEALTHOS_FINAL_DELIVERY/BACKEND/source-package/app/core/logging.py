"""WealthOS Structured Logging Architecture.

Provides JSON-formatted structured logging with correlation ID tracing,
ISO-8601 timestamps, log level tagging, and request context injection.
"""

import contextvars
import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any

# Context variable to hold request correlation ID across async coroutines
correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default="system"
)
tenant_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "tenant_id", default="anonymous"
)


class StructuredJSONFormatter(logging.Formatter):
    """JSON log formatter compliant with cloud observability standards."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: dict[str, Any] = {
            "timestamp": datetime.now(UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id_ctx.get(),
            "tenant_id": tenant_id_ctx.get(),
            "module": record.module,
            "func_name": record.funcName,
            "line": record.lineno,
        }

        # Include exception traceback if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Include custom extra fields if passed
        if hasattr(record, "extra") and isinstance(record.extra, dict):
            log_obj.update(record.extra)

        return json.dumps(log_obj, default=str)


class DevelopmentFormatter(logging.Formatter):
    """Clean colorized-friendly formatter for local terminal development."""

    def format(self, record: logging.LogRecord) -> str:
        cid = correlation_id_ctx.get()
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = f"[{timestamp}] [{record.levelname:<8}] [CID:{cid[:8] if cid else 'none'}] {record.name}:"
        msg = f"{prefix} {record.getMessage()}"
        if record.exc_info:
            msg += "\n" + self.formatException(record.exc_info)
        return msg


def setup_logging(level: str = "INFO", environment: str = "development") -> None:
    """Initialize logging configuration for the WealthOS application."""
    root_logger = logging.getLogger()
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)

    # Clear existing handlers
    root_logger.handlers = []

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(numeric_level)

    if environment.lower() in ("production", "staging"):
        handler.setFormatter(StructuredJSONFormatter())
    else:
        handler.setFormatter(DevelopmentFormatter())

    root_logger.addHandler(handler)

    # Silence overly verbose external libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a configured logger instance."""
    return logging.getLogger(name)
