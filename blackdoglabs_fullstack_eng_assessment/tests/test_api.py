# tests/test_api.py
# Unit and integration tests for the Analytics API.
# Run with: pytest tests/test_api.py -v

import pytest
from fastapi.testclient import TestClient

# Adjust import path as needed based on your project structure
from src.api.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def auth_headers():
    """Mock authorization headers with a valid token."""
    # In real tests, you'd generate a proper JWT
    return {"Authorization": "Bearer mock-token-for-testing"}


# =============================================================================
# Health Check Tests
# =============================================================================
class TestHealthCheck:
    def test_health_returns_ok(self, client):
        """Health endpoint should return status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


# =============================================================================
# Auth Middleware Tests
# =============================================================================
class TestAuthMiddleware:
    def test_missing_auth_header_returns_401(self, client):
        """Requests without Authorization header should fail."""
        response = client.get("/api/v1/events")
        assert response.status_code == 401
        assert "authorization" in response.json()["detail"].lower()

    def test_invalid_auth_header_format_returns_401(self, client):
        """Authorization header must start with 'Bearer '."""
        response = client.get(
            "/api/v1/events",
            headers={"Authorization": "Basic sometoken"},
        )
        assert response.status_code == 401

    def test_valid_auth_header_passes(self, client, auth_headers):
        """Valid Bearer token should pass auth check."""
        response = client.get("/api/v1/events", headers=auth_headers)
        # Should not be 401 - might be 200 or other status
        assert response.status_code != 401


# =============================================================================
# Idempotency Tests
# =============================================================================
class TestIdempotency:
    def test_duplicate_idempotency_key_returns_409(self, client, auth_headers):
        """Second request with same idempotency key should return 409."""
        idempotency_key = "unique-key-12345"
        headers = {**auth_headers, "X-Idempotency-Key": idempotency_key}
        payload = {
            "events": [
                {
                    "event_type": "page_view",
                    "user_id": "u001",
                    "properties": {"path": "/test"},
                }
            ]
        }

        # First request should succeed
        response1 = client.post("/api/v1/events", json=payload, headers=headers)
        assert response1.status_code == 201

        # Second request with same key should return 409
        response2 = client.post("/api/v1/events", json=payload, headers=headers)
        assert response2.status_code == 409

    def test_different_idempotency_keys_both_succeed(self, client, auth_headers):
        """Different idempotency keys should both process successfully."""
        payload = {
            "events": [
                {
                    "event_type": "page_view",
                    "user_id": "u001",
                    "properties": {},
                }
            ]
        }

        headers1 = {**auth_headers, "X-Idempotency-Key": "key-a"}
        headers2 = {**auth_headers, "X-Idempotency-Key": "key-b"}

        response1 = client.post("/api/v1/events", json=payload, headers=headers1)
        response2 = client.post("/api/v1/events", json=payload, headers=headers2)

        assert response1.status_code == 201
        assert response2.status_code == 201


# =============================================================================
# Cursor Pagination Tests
# =============================================================================
class TestCursorPagination:
    def test_events_response_includes_pagination_fields(self, client, auth_headers):
        """Events query response should include cursor and has_more."""
        response = client.get("/api/v1/events", headers=auth_headers)
        assert response.status_code == 200

        data = response.json()
        assert "data" in data
        assert "cursor" in data
        assert "has_more" in data
        assert isinstance(data["has_more"], bool)

    def test_cursor_parameter_accepted(self, client, auth_headers):
        """Cursor parameter should be accepted in query."""
        response = client.get(
            "/api/v1/events",
            params={"cursor": "some-cursor-value"},
            headers=auth_headers,
        )
        # Should not error on cursor param
        assert response.status_code == 200

    def test_cursor_pagination_works(self, client, auth_headers):
        """Cursor pagination should return different pages of results."""
        # First, ingest some events
        payload = {
            "events": [
                {
                    "event_type": "test",
                    "user_id": "u001",
                    "properties": {},
                    "timestamp": f"2025-01-01T{hour:02d}:00:00Z",
                }
                for hour in range(10)  # Create 10 events
            ]
        }
        client.post("/api/v1/events", json=payload, headers=auth_headers)

        # Get first page
        response1 = client.get(
            "/api/v1/events",
            params={"limit": 5},
            headers=auth_headers,
        )
        assert response1.status_code == 200
        data1 = response1.json()
        assert len(data1["data"]) == 5
        assert data1["has_more"] is True
        assert data1["cursor"] is not None

        # Get second page using cursor
        response2 = client.get(
            "/api/v1/events",
            params={"limit": 5, "cursor": data1["cursor"]},
            headers=auth_headers,
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert len(data2["data"]) <= 5
        # Events should be different (or empty if we've seen all)
        assert data2["data"] != data1["data"] or len(data2["data"]) == 0


# =============================================================================
# Validation Tests
# =============================================================================
class TestValidation:
    def test_empty_events_array_returns_422(self, client, auth_headers):
        """Empty events array should fail validation."""
        payload = {"events": []}
        response = client.post(
            "/api/v1/events",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_too_many_events_returns_400(self, client, auth_headers):
        """More than 100 events should fail."""
        payload = {
            "events": [
                {"event_type": "test", "user_id": "u001", "properties": {}}
                for _ in range(101)
            ]
        }
        response = client.post(
            "/api/v1/events",
            json=payload,
            headers=auth_headers,
        )
        # Could be 400 or 422 depending on where validation happens
        assert response.status_code in (400, 422)

    def test_missing_required_field_returns_422(self, client, auth_headers):
        """Missing required fields should return 422."""
        payload = {
            "events": [
                {"properties": {}}  # Missing event_type and user_id
            ]
        }
        response = client.post(
            "/api/v1/events",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 422


# =============================================================================
# OpenAPI Docs Tests
# =============================================================================
class TestOpenAPIDocs:
    def test_openapi_json_available(self, client):
        """OpenAPI JSON spec should be available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data

    def test_swagger_ui_available(self, client):
        """Swagger UI should be available at /docs."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "swagger" in response.text.lower() or "html" in response.headers.get("content-type", "")

    def test_redoc_available(self, client):
        """ReDoc should be available at /redoc."""
        response = client.get("/redoc")
        assert response.status_code == 200

