# ==============================================================================
# WealthOS Backend Dockerfile (Multi-stage Python 3.12)
# ==============================================================================

FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies for compiling binary wheels if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies into wheels
COPY pyproject.toml .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir build && \
    pip wheel --no-cache-dir --wheel-dir /build/wheels -e .


FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root system user for security compliance
RUN groupadd -r wealthos && useradd -r -g wealthos -u 1001 wealthos

# Copy installed wheels and install
COPY --from=builder /build/wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

# Copy application source
COPY --chown=wealthos:wealthos app /app/app
COPY --chown=wealthos:wealthos migrations /app/migrations
COPY --chown=wealthos:wealthos alembic.ini /app/alembic.ini
COPY --chown=wealthos:wealthos pyproject.toml /app/pyproject.toml

USER wealthos

EXPOSE 8000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/healthz || exit 1

# Default command: FastAPI API server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
