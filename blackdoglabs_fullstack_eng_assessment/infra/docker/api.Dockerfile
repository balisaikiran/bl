# infra/docker/api.Dockerfile
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
# TODO: Add proper entrypoint
# Run the application

    CMD curl -f http://localhost:8000/health || exit 1
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
# Health check

EXPOSE 8000
# Expose port

USER appuser
# Switch to non-root user

COPY --from=builder /app .
# Copy application code

# COPY --from=builder ...
# Copy dependencies from builder

RUN useradd --create-home --shell /bin/bash appuser
# Create non-root user for security

WORKDIR /app

FROM python:3.11-slim as production
# =============================================================================
# Stage 2: Production stage
# =============================================================================

COPY src/api/ .

# RUN ...
COPY src/api/requirements.txt .

# TODO: Install dependencies using uv or pip
# Install uv for fast dependency management

WORKDIR /app

FROM python:3.11-slim as builder
# =============================================================================
# Stage 1: Build stage
# =============================================================================

# TODO: Complete this Dockerfile
# Multi-stage Dockerfile for the FastAPI Analytics API

