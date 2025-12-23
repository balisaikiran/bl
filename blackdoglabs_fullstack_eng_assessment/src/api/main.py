# src/api/main.py
# Minimal scaffold for the FastAPI portion of the assessment.
# Implement REST endpoints for events and metrics with CORS, logging, and OpenAPI docs.

import time
import logging
import base64
import json
from datetime import datetime, timedelta
from typing import Annotated
from contextlib import asynccontextmanager
from collections import defaultdict

from fastapi import FastAPI, Request, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .schemas import (
    EventPayload,
    EventsIngestRequest,
    EventsIngestResponse,
    EventsQueryResponse,
    Event,
    MetricsSummaryResponse,
    DailyMetrics,
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
    # Initialize in-memory stores with sample data
    _initialize_sample_data()
    yield
    logger.info("Shutting down Analytics API...")
    # Cleanup resources (in-memory stores will be cleared on shutdown)


def _initialize_sample_data():
    """Initialize in-memory stores with sample data for testing."""
    # Sample events for org001
    sample_events = [
        Event(
            event_id="evt_001",
            org_id="org001",
            user_id="u001",
            event_type="page_view",
            properties={"path": "/dashboard", "referrer": "google.com"},
            timestamp=datetime(2025, 12, 15, 9, 0, 0),
        ),
        Event(
            event_id="evt_002",
            org_id="org001",
            user_id="u002",
            event_type="button_click",
            properties={"button_id": "submit_form", "page": "/settings"},
            timestamp=datetime(2025, 12, 15, 9, 15, 0),
        ),
        Event(
            event_id="evt_003",
            org_id="org001",
            user_id="u001",
            event_type="page_view",
            properties={"path": "/reports"},
            timestamp=datetime(2025, 12, 15, 10, 0, 0),
        ),
    ]
    _events_store["org001"].extend(sample_events)

    # Note: Metrics are now calculated dynamically from events
    # No hardcoded metrics - they will be computed on-demand


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
    #     return TokenClaims(
    #         sub=payload.get("sub"),
    #         org_id=payload.get("org_id"),
    #         role=payload.get("role"),
    #         iat=payload.get("iat"),
    #         exp=payload.get("exp"),
    #     )
    # except JWTError:
    #     raise HTTPException(status_code=401, detail="Invalid token")

    # Mock implementation: Try to extract org_id from token
    # In production, this would be decoded from JWT claims
    # For now, support simple format: "org001:u001" or just use default
    try:
        # Try to decode as base64 JSON (mock JWT payload)
        import base64
        parts = token.split(".")
        if len(parts) >= 2:
            # Mock JWT structure: header.payload.signature
            payload_b64 = parts[1]
            # Add padding if needed
            payload_b64 += "=" * (4 - len(payload_b64) % 4)
            payload_json = base64.urlsafe_b64decode(payload_b64)
            payload = json.loads(payload_json)
            return TokenClaims(
                sub=payload.get("sub", "u001"),
                org_id=payload.get("org_id", "org001"),
                role=payload.get("role", "admin"),
                iat=payload.get("iat", int(time.time())),
                exp=payload.get("exp", int(time.time()) + 3600),
            )
    except Exception:
        pass

    # Fallback: Extract org_id from token if it's in format "org001:..."
    if ":" in token:
        org_id = token.split(":")[0]
        return TokenClaims(
            sub=token.split(":")[1] if len(token.split(":")) > 1 else "u001",
            org_id=org_id,
            role="admin",
            iat=int(time.time()),
            exp=int(time.time()) + 3600,
        )

    # Default mock claims for development
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
# In-Memory Data Stores
# =============================================================================

# In-memory store for events (use PostgreSQL/CosmosDB in production)
# Structure: {org_id: [Event, ...]}
_events_store: dict[str, list[Event]] = defaultdict(list)

# In-memory store for idempotency keys (use Redis in production)
# Structure: {idempotency_key: response_data}
_idempotency_store: dict[str, dict] = {}

# In-memory store for metrics (use database in production)
# Structure: {org_id: {date: {metric_name: value}}}
_metrics_store: dict[str, dict[str, dict[str, float]]] = defaultdict(lambda: defaultdict(dict))


def _generate_event_id() -> str:
    """Generate a unique event ID."""
    timestamp = int(time.time() * 1000)
    random_suffix = base64.urlsafe_b64encode(str(time.perf_counter()).encode()).decode()[:8]
    return f"evt_{timestamp}_{random_suffix}"


def _encode_cursor(event_id: str, timestamp: datetime) -> str:
    """Encode cursor from event_id and timestamp."""
    cursor_data = {"event_id": event_id, "timestamp": timestamp.isoformat()}
    cursor_json = json.dumps(cursor_data)
    return base64.urlsafe_b64encode(cursor_json.encode()).decode()


def _decode_cursor(cursor: str) -> dict | None:
    """Decode cursor to get event_id and timestamp."""
    try:
        cursor_json = base64.urlsafe_b64decode(cursor.encode()).decode()
        return json.loads(cursor_json)
    except Exception:
        return None


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
    org_id = user.org_id

    # Check idempotency: if key exists, return 409 Conflict
    if x_idempotency_key:
        # Create a composite key with org_id to ensure tenant isolation
        composite_key = f"{org_id}:{x_idempotency_key}"
        if composite_key in _idempotency_store:
            # Return 409 Conflict for duplicate idempotency key
            raise HTTPException(
                status_code=409,
                detail="Duplicate request - idempotency key already processed",
            )

    # Validate batch size (1-100 events)
    if len(request.events) < 1 or len(request.events) > 100:
        raise HTTPException(
            status_code=400,
            detail="Batch must contain 1-100 events",
        )

    # Process and store events
    stored_events = []
    for event_payload in request.events:
        # Generate event ID
        event_id = _generate_event_id()
        
        # Use server timestamp if not provided
        event_timestamp = event_payload.timestamp or datetime.utcnow()
        
        # Create Event object
        event = Event(
            event_id=event_id,
            org_id=org_id,
            user_id=event_payload.user_id,
            event_type=event_payload.event_type,
            properties=event_payload.properties or {},
            timestamp=event_timestamp,
        )
        
        # Store event
        _events_store[org_id].append(event)
        stored_events.append(event)

    # Create response
    response = EventsIngestResponse(
        accepted=len(stored_events),
        org_id=org_id,
    )

    # Store idempotency key with composite key for tenant isolation
    if x_idempotency_key:
        composite_key = f"{org_id}:{x_idempotency_key}"
        _idempotency_store[composite_key] = response.model_dump()

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

    # Get events for this org
    org_events = _events_store.get(org_id, [])

    # Parse date filters
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")

    # Decode cursor to get starting point
    cursor_event_id = None
    cursor_timestamp = None
    if cursor:
        cursor_data = _decode_cursor(cursor)
        if cursor_data:
            cursor_event_id = cursor_data.get("event_id")
            if cursor_data.get("timestamp"):
                try:
                    cursor_timestamp = datetime.fromisoformat(cursor_data["timestamp"])
                except ValueError:
                    pass

    # Filter events
    filtered_events = []
    for event in org_events:
        # Skip events before cursor
        if cursor_event_id and event.event_id <= cursor_event_id:
            continue
        if cursor_timestamp and event.timestamp <= cursor_timestamp:
            continue

        # Apply filters
        if user_id and event.user_id != user_id:
            continue
        if event_type and event.event_type != event_type:
            continue
        if start_dt and event.timestamp < start_dt:
            continue
        if end_dt and event.timestamp > end_dt:
            continue

        filtered_events.append(event)

    # Sort by timestamp descending (most recent first)
    filtered_events.sort(key=lambda e: e.timestamp, reverse=True)

    # Apply pagination: fetch limit+1 to check if there are more
    has_more = len(filtered_events) > limit
    paginated_events = filtered_events[:limit]

    # Generate next cursor from last event
    next_cursor = None
    if has_more and paginated_events:
        last_event = paginated_events[-1]
        next_cursor = _encode_cursor(last_event.event_id, last_event.timestamp)

    return EventsQueryResponse(
        data=paginated_events,
        cursor=next_cursor,
        has_more=has_more,
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

    # Parse date range
    try:
        start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    if start_dt > end_dt:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    # Calculate metrics dynamically from events
    org_events = _events_store.get(org_id, [])

    # Aggregate metrics by date from events
    daily_breakdown: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    daily_unique_users: dict[str, set[str]] = defaultdict(set)  # Track unique users per day
    totals: dict[str, float] = defaultdict(float)

    # Process events and calculate metrics
    for event in org_events:
        event_date = event.timestamp.date()
        
        # Check if event is within date range
        if event_date < start_dt.date() or event_date > end_dt.date():
            continue

        date_str = event_date.isoformat()

        # Map event types to metric names
        event_type_to_metric = {
            "page_view": "page_views",
            "button_click": "button_clicks",
            "feature_used": "feature_uses",
            "api_call": "api_calls",
        }

        # Count events by type
        metric_name = event_type_to_metric.get(event.event_type, f"{event.event_type}_count")
        
        # Filter by requested metrics if specified
        if metrics and metric_name not in metrics:
            continue

        # Increment metric count
        daily_breakdown[date_str][metric_name] += 1.0
        totals[metric_name] += 1.0

        # Track unique users per day
        daily_unique_users[date_str].add(event.user_id)

    # Add unique users count to daily breakdown
    all_unique_users = set()
    for date_str, unique_user_set in daily_unique_users.items():
        unique_count = float(len(unique_user_set))
        daily_breakdown[date_str]["unique_users"] = unique_count
        all_unique_users.update(unique_user_set)
    
    # Total unique users across entire date range (not sum of daily counts)
    totals["unique_users"] = float(len(all_unique_users))

    # Ensure all dates in range are included (even if no events)
    current_date = start_dt.date()
    end_date_obj = end_dt.date()
    
    while current_date <= end_date_obj:
        date_str = current_date.isoformat()
        if date_str not in daily_breakdown:
            daily_breakdown[date_str] = {}
        current_date += timedelta(days=1)

    # Convert to response format
    daily_data = [
        DailyMetrics(date=date, metrics=metrics_dict)
        for date, metrics_dict in sorted(daily_breakdown.items())
        if metrics_dict  # Only include dates with metrics
    ]

    return MetricsSummaryResponse(
        data=daily_data,
        totals=dict(totals),
    )


if __name__ == "__main__":
    import uvicorn
    import sys
    import os
    
    # Add parent directory to path to allow imports when running directly
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
    
    # Run as module from project root: python -m src.api.main
    # Or use: uvicorn src.api.main:app --reload
    # Or run from project root: uv run uvicorn src.api.main:app --reload
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)

