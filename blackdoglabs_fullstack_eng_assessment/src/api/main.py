# src/api/main.py
# Minimal scaffold for the FastAPI portion of the assessment.
# Implement REST endpoints for events and metrics with CORS, logging, and OpenAPI docs.

import time
import logging
from typing import Annotated
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .schemas import (
    EventPayload,
    EventsIngestRequest,
    EventsIngestResponse,
    EventsQueryResponse,
    MetricsSummaryResponse,
    TokenClaims,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting Analytics API...")
    # TODO: Initialize DB connections, caches, etc.
    yield
    logger.info("Shutting down Analytics API...")
    # TODO: Cleanup resources


app = FastAPI(
    title="Analytics Platform API",
    description="REST API for event ingestion and metrics aggregation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",      # Swagger UI
    redoc_url="/redoc",    # ReDoc
    openapi_url="/openapi.json",
)

# =============================================================================
# CORS Middleware
# =============================================================================
# TODO: Configure origins from environment variable for dev/staging/prod
ALLOWED_ORIGINS = [
    "http://localhost:3000",    # Next.js dev
    "http://localhost:3001",    # Alternative dev port
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # In prod, load from env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Request Logging Middleware
# =============================================================================
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with method, path, status, and duration."""
    start_time = time.perf_counter()

    response = await call_next(request)

    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} "
        f"duration={duration_ms:.2f}ms"
    )

    return response


# =============================================================================
# Auth Dependency
# =============================================================================
async def verify_token(
    authorization: Annotated[str | None, Header()] = None
) -> TokenClaims:
    """
    Validate JWT token from Authorization header.
    Extract org_id from token claims for tenant isolation.

    TODO: Implement real JWT verification using python-jose.
    This is a mock implementation — structure it properly for production.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ")[1]

    # TODO: Verify token signature and expiry using python-jose
    # Example:
    # from jose import jwt, JWTError
    # try:
    #     payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    # except JWTError:
    #     raise HTTPException(status_code=401, detail="Invalid token")

    # Mock: Return fake claims for development
    # Replace with actual token parsing
    return TokenClaims(
        sub="u001",
        org_id="org001",
        role="admin",
        iat=int(time.time()),
        exp=int(time.time()) + 3600,
    )


# Annotated dependency for cleaner endpoint signatures
CurrentUser = Annotated[TokenClaims, Depends(verify_token)]


# =============================================================================
# Health Check
# =============================================================================
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {"status": "ok", "timestamp": time.time()}


# =============================================================================
# Events API
# =============================================================================

# In-memory store for idempotency keys (use Redis in production)
_idempotency_store: dict[str, dict] = {}


@app.post(
    "/api/v1/events",
    response_model=EventsIngestResponse,
    status_code=201,
    tags=["Events"],
    summary="Ingest events",
    description="Ingest a batch of 1-100 events with idempotency support.",
)
async def ingest_events(
    request: EventsIngestRequest,
    user: CurrentUser,
    x_idempotency_key: Annotated[str | None, Header()] = None,
):
    """
    Ingest events with idempotency.

    - Validates payload schema via Pydantic
    - Checks idempotency key to prevent duplicate processing
    - Associates events with org_id from auth token
    """
    # TODO: Implement idempotency check
    # 1. Check if x_idempotency_key exists in store
    # 2. If exists, return cached response (409 or replay original)
    # 3. If not, process events and store key with response

    if x_idempotency_key and x_idempotency_key in _idempotency_store:
        # Return cached response for duplicate request
        raise HTTPException(
            status_code=409,
            detail="Duplicate request - idempotency key already processed",
        )

    # TODO: Validate batch size (1-100 events)
    if len(request.events) < 1 or len(request.events) > 100:
        raise HTTPException(
            status_code=400,
            detail="Batch must contain 1-100 events",
        )

    # TODO: Store events with org_id from token
    # For now, just acknowledge receipt
    org_id = user.org_id

    response = EventsIngestResponse(
        accepted=len(request.events),
        org_id=org_id,
    )

    # Store idempotency key
    if x_idempotency_key:
        _idempotency_store[x_idempotency_key] = response.model_dump()

    return response


@app.get(
    "/api/v1/events",
    response_model=EventsQueryResponse,
    tags=["Events"],
    summary="Query events",
    description="Query events with filters and cursor-based pagination.",
)
async def query_events(
    user: CurrentUser,
    user_id: Annotated[str | None, Query(description="Filter by user ID")] = None,
    event_type: Annotated[str | None, Query(description="Filter by event type")] = None,
    start_date: Annotated[str | None, Query(description="Start date (ISO 8601)")] = None,
    end_date: Annotated[str | None, Query(description="End date (ISO 8601)")] = None,
    cursor: Annotated[str | None, Query(description="Pagination cursor")] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Results per page")] = 50,
):
    """
    Query events with cursor-based pagination.

    - org_id is automatically filtered from auth token (tenant isolation)
    - Cursor is opaque to client, encodes last seen event_id/timestamp
    - Returns has_more flag to indicate if more results exist
    """
    org_id = user.org_id

    # TODO: Implement cursor-based pagination
    # 1. Decode cursor to get last seen event_id or timestamp
    # 2. Query: WHERE org_id = ? AND id > cursor ORDER BY id LIMIT limit+1
    # 3. has_more = len(results) > limit
    # 4. Generate next cursor from last item

    # Mock response
    return EventsQueryResponse(
        data=[],
        cursor=None,
        has_more=False,
    )


# =============================================================================
# Metrics API
# =============================================================================
@app.get(
    "/api/v1/metrics/summary",
    response_model=MetricsSummaryResponse,
    tags=["Metrics"],
    summary="Get metrics summary",
    description="Get aggregated metrics for an organization within a date range.",
)
async def get_metrics_summary(
    user: CurrentUser,
    start_date: Annotated[str, Query(description="Start date (ISO 8601)")],
    end_date: Annotated[str, Query(description="End date (ISO 8601)")],
    metrics: Annotated[list[str] | None, Query(description="Metric names to include")] = None,
):
    """
    Get metrics summary with daily breakdown and totals.

    - org_id from auth token ensures tenant isolation
    - Optional metrics filter to include only specific metrics
    """
    org_id = user.org_id

    # TODO: Query metrics from database
    # 1. Filter by org_id, date range, and optional metrics list
    # 2. Aggregate by date
    # 3. Calculate totals across all dates

    # Mock response
    return MetricsSummaryResponse(
        data=[],
        totals={},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

