# src/api/schemas.py
# Pydantic models for request/response validation and OpenAPI documentation.

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# =============================================================================
# Auth Schemas
# =============================================================================
class TokenClaims(BaseModel):
    """JWT token claims extracted from Authorization header."""
    sub: str = Field(..., description="User ID (subject)")
    org_id: str = Field(..., description="Organization ID for tenant isolation")
    role: str = Field(..., description="User role within organization")
    iat: int = Field(..., description="Issued at timestamp")
    exp: int = Field(..., description="Expiry timestamp")


# =============================================================================
# Event Schemas
# =============================================================================
class EventPayload(BaseModel):
    """Single event payload for ingestion."""
    event_type: str = Field(..., description="Type of event (e.g., page_view, button_click)")
    user_id: str = Field(..., description="User who triggered the event")
    properties: dict[str, Any] = Field(default_factory=dict, description="Event properties (flexible schema)")
    timestamp: datetime | None = Field(None, description="Event timestamp (server sets if not provided)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "event_type": "page_view",
                    "user_id": "u001",
                    "properties": {"path": "/dashboard", "referrer": "google.com"},
                    "timestamp": "2025-12-15T09:00:00Z",
                }
            ]
        }
    }


class EventsIngestRequest(BaseModel):
    """Request body for event ingestion."""
    events: list[EventPayload] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Batch of events to ingest (1-100)",
    )


class EventsIngestResponse(BaseModel):
    """Response for successful event ingestion."""
    accepted: int = Field(..., description="Number of events accepted")
    org_id: str = Field(..., description="Organization ID events were associated with")


class Event(BaseModel):
    """Full event record returned from queries."""
    event_id: str
    org_id: str
    user_id: str
    event_type: str
    properties: dict[str, Any]
    timestamp: datetime


class EventsQueryResponse(BaseModel):
    """Response for event queries with cursor pagination."""
    data: list[Event] = Field(..., description="List of events")
    cursor: str | None = Field(None, description="Cursor for next page (null if no more results)")
    has_more: bool = Field(..., description="Whether more results exist")


# =============================================================================
# Metrics Schemas
# =============================================================================
class DailyMetrics(BaseModel):
    """Metrics for a single day."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    metrics: dict[str, float] = Field(..., description="Metric name to value mapping")


class MetricsSummaryResponse(BaseModel):
    """Response for metrics summary endpoint."""
    data: list[DailyMetrics] = Field(..., description="Daily breakdown of metrics")
    totals: dict[str, float] = Field(..., description="Aggregated totals across all dates")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "data": [
                        {"date": "2025-12-15", "metrics": {"page_views": 150, "unique_users": 12}},
                        {"date": "2025-12-16", "metrics": {"page_views": 180, "unique_users": 15}},
                    ],
                    "totals": {"page_views": 330, "unique_users": 27},
                }
            ]
        }
    }


# =============================================================================
# Error Schemas
# =============================================================================
class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str = Field(..., description="Error message")
    errors: dict[str, list[str]] | None = Field(None, description="Field-level validation errors")

