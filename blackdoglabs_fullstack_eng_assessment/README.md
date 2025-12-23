# Fullstack Engineer Assessment — Candidate README

This README is your **runbook**. Add the exact steps and notes needed to run **your** solution end-to-end.

**📋 For detailed testing instructions, see [TESTING.md](./TESTING.md)**

## 1) Quickstart

### Prerequisites
- **Python**: 3.11+ (tested with 3.11)
- **Node.js**: 18+ (tested with 18.x)
- **uv**: Python package manager (install via `curl -LsSf https://astral.sh/uv/install.sh | sh`)

**Important**: Always run commands from the **project root** directory (`blackdoglabs_fullstack_eng_assessment/`) unless otherwise specified.

### Install Dependencies

**API**:
```bash
cd src/api
uv pip install -r requirements.txt
cd ../..  # Return to project root
```

**SDK**:
```bash
cd src/sdk
npm install
```

**App**:
```bash
cd src/app
npm install
```

### Environment Variables

**API** (optional - defaults provided):
- No environment variables required for local development
- API uses in-memory storage by default

**App** (optional - defaults provided):
- `NEXT_PUBLIC_ANALYTICS_API_KEY`: API key for authentication (default: `dev-api-key`)
- `NEXT_PUBLIC_ANALYTICS_API_URL`: API base URL (default: `http://localhost:8000`)

Create `.env.local` in `src/app/` if you want to override:
```
NEXT_PUBLIC_ANALYTICS_API_KEY=dev-api-key
NEXT_PUBLIC_ANALYTICS_API_URL=http://localhost:8000
```

## 2) Run the API

**⚠️ IMPORTANT: Always run from the project root directory!**

**Start the API server** (from project root):
```bash
# Make sure you're in the project root (blackdoglabs_fullstack_eng_assessment/)
cd /Users/saikiran/Downloads/bl/blackdoglabs_fullstack_eng_assessment

# Then run:
uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

**Or use the convenience script**:
```bash
# From project root
./run-api.sh
```

**Why?** The API uses relative imports (`from .schemas import`), which only work when Python recognizes `src.api` as a package. Running from the project root ensures Python can resolve these imports correctly.

**Alternative using Python module syntax**:
```bash
# From project root
python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

**Common Error**: If you see `ImportError: attempted relative import with no known parent package`, you're running from the wrong directory. Make sure you're in the project root, not `src/api/`.

**Base URL**: `http://localhost:8000`

**API Documentation**:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

**Health Check**:
```bash
curl http://localhost:8000/health
```

**Sample API Requests**:

**Ingest Events**:
```bash
curl -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer org001:u001" \
  -H "X-Idempotency-Key: test-key-123" \
  -d '{
    "events": [
      {
        "event_type": "page_view",
        "user_id": "u001",
        "properties": {
          "path": "/dashboard",
          "referrer": "google.com"
        }
      }
    ]
  }'
```

**Query Events**:
```bash
curl "http://localhost:8000/api/v1/events?limit=10" \
  -H "Authorization: Bearer org001:u001"
```

**Get Metrics Summary**:
```bash
curl "http://localhost:8000/api/v1/metrics/summary?start_date=2025-12-01&end_date=2025-12-31" \
  -H "Authorization: Bearer org001:u001"
```

**Note**: The API uses mock JWT authentication. Tokens can be in format:
- `Bearer org001:u001` (extracts org_id from token)
- `Bearer <any-token>` (defaults to org001)

## 3) Run the SDK tests

**Command**:
```bash
cd src/sdk
npm test
```

**What the tests cover**:
- Event batching logic (flush after interval or batch size)
- Cursor-based pagination iteration
- Idempotency key generation
- Error handling
- Authorization header inclusion

**Watch mode**:
```bash
npm run test:watch
```

## 4) Run the Next.js App

**Prerequisites**: API must be running (see section 2)

**Start the development server**:
```bash
cd src/app
npm run dev
```

**Note**: If you see import errors for the SDK, make sure:
1. The `next.config.js` file exists (it configures webpack to resolve SDK imports)
2. Restart the dev server after any config changes
3. The SDK files are in `src/sdk/src/`

**URL**: `http://localhost:3000`

**Pages**:
- Home: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`

**Setup Notes**:
- The app connects to the API at `http://localhost:8000` by default
- SDK is imported directly from source (monorepo structure)
- Authentication uses mock tokens (see API section)
- The dashboard displays metrics summary and events table with infinite scroll

**Build for production**:
```bash
cd src/app
npm run build
npm start
```

## 5) Terraform / IaC

**Azure Infrastructure** (`infra/terraform/azure/`)

**What resources would be created**:
- Resource Group
- Container App Environment
- Container App (API)
- Azure SQL Database OR Cosmos DB (configurable)
- Key Vault (secrets management)
- Log Analytics Workspace
- API Management (optional)
- VNet and Private Endpoints (commented out, ready for production)

**Initialize Terraform**:
```bash
cd infra/terraform/azure
terraform init
```

**Plan** (dry-run):
```bash
terraform plan \
  -var="environment=dev" \
  -var="location=eastus" \
  -var="project_name=analytics"
```

**Note**: This is plan-ready only. Do not deploy without proper Azure credentials and review.

**Least-privilege rationale**:
- Container App uses System-Assigned Managed Identity
- Key Vault access policy grants only `Get` and `List` secrets (read-only)
- No public database endpoints (use private endpoints in production)
- Network Security Groups restrict subnet communication
- Separate service principals for different environments

**State management approach**:
- **Local state** (default): `.terraform/terraform.tfstate`
- **Remote state** (production): Use Azure Storage backend
  - Uncomment backend configuration in `main.tf`
  - Configure storage account and container
  - Enable state locking
- **Workspaces**: Use Terraform workspaces for environment separation
  ```bash
  terraform workspace new dev
  terraform workspace new staging
  terraform workspace new prod
  ```

**Variables**:
See `variables.tf` for all configurable options:
- `environment`: dev, staging, prod
- `location`: Azure region
- `database_type`: sql or cosmos
- `enable_apim`: Enable API Management

## 6) Docker (Optional — reference only)

**Scaffolding provided** in `infra/docker/` for reference.

**Prioritize written responses over completing Dockerfiles** (see `answers.md` section E).

**If time permits**:

**Build API image**:
```bash
docker build -f infra/docker/api.Dockerfile -t analytics-api .
```

**Build App image**:
```bash
docker build -f infra/docker/app.Dockerfile -t analytics-app .
```

**Run with docker-compose**:
```bash
cd infra/docker
docker-compose up
```

## 7) Helm / Kubernetes (Optional — reference only)

**Chart scaffolding** in `infra/helm/analytics-platform/`

**Prioritize written responses over completing Helm charts**.

**If time permits**:
```bash
cd infra/helm/analytics-platform
helm template my-release . --values values.yaml
```

## 8) Tests

### How to run all tests

**API Tests**:
```bash
# From project root (recommended)
pytest tests/ -v

# Or from tests directory
cd tests
pytest test_api.py -v

# Note: Make sure you're in the project root so imports work correctly
```

**SDK Tests**:
```bash
cd src/sdk
npm test
```

### What they cover

**API Tests** (`tests/test_api.py`):
- Health check endpoint
- Auth middleware (401 on missing/invalid tokens)
- Idempotency (409 on duplicate keys)
- Cursor pagination (cursor encoding/decoding, has_more flag)
- Validation (empty arrays, too many events, missing fields)
- OpenAPI docs availability

**SDK Tests** (`src/sdk/src/__tests__/client.test.ts`):
- Event batching (time-based and size-based)
- Cursor pagination iteration
- Idempotency key generation
- Error handling
- Authorization headers

## 9) Assumptions & decisions

### Key trade-offs

**Cursor Pagination Strategy**:
- **Choice**: Opaque cursor encoding event_id + timestamp
- **Rationale**: 
  - More stable than offset-based (no duplicates on concurrent writes)
  - Simpler than composite keys
  - Works well with time-ordered queries
- **Trade-off**: Cursor size (base64 encoded JSON), but acceptable for API responses

**Batching Approach**:
- **Choice**: Time-based (5s) OR size-based (10 events), whichever comes first
- **Rationale**: 
  - Balances latency (don't wait too long) with efficiency (batch multiple events)
  - Configurable per client instance
- **Trade-off**: More complex than single-event sends, but reduces API calls

**Auth Implementation**:
- **Choice**: Mock JWT verification with token parsing fallback
- **Rationale**: 
  - Structured properly for production (dependency injection)
  - Supports simple token format for testing (`org001:u001`)
  - Can be swapped for real JWT library without code changes
- **Trade-off**: Not production-ready, but demonstrates pattern

**Schema Evolution Approach**:
- **Choice**: JSONB properties + schema_version field
- **Rationale**: 
  - Flexible for new event types
  - Backward compatible (old events still queryable)
  - Version tracking without proliferating event types
- **Trade-off**: Slightly more complex queries, but better than event type versioning

### Auth implementation notes

- JWT verification is mocked but structured as FastAPI dependency
- Token format supports: `Bearer org001:u001` (extracts org_id) or any token (defaults to org001)
- In production, replace `verify_token` function with `python-jose` JWT decoding
- Tenant isolation enforced at API layer (org_id from token, never from request)

### Schema evolution approach

- `properties` field is JSONB (PostgreSQL) or flexible JSON (CosmosDB)
- `schema_version` field tracks structure version
- API validates new schemas via Pydantic discriminated unions
- Database queries use JSONB path operators for flexible property access
- Old events remain queryable without migration

## 10) Known limitations & next steps

### Gaps to close with more time

1. **Database Integration**:
   - Replace in-memory stores with PostgreSQL/CosmosDB
   - Add connection pooling
   - Implement database migrations

2. **Production Auth**:
   - Implement real JWT verification with `python-jose`
   - Add refresh token endpoint
   - Implement token rotation

3. **Error Handling**:
   - More detailed error responses
   - Retry logic for transient failures
   - Dead letter queue for failed events

4. **Observability**:
   - Structured logging (JSON format)
   - Metrics export (Prometheus)
   - Distributed tracing (OpenTelemetry)

5. **Testing**:
   - Integration tests with test database
   - Load testing for high throughput
   - End-to-end tests for full flow

6. **SDK Improvements**:
   - Offline queue (IndexedDB)
   - Automatic retry with exponential backoff
   - Batch compression

### Scaling/production hardening ideas

1. **High Write Throughput**:
   - Use message queue (Kafka, Azure Event Hubs) for async ingestion
   - Batch writes to database
   - Partition events table by timestamp

2. **Query Performance**:
   - Materialized views for common aggregations
   - Read replicas for analytics queries
   - Caching layer (Redis) for metrics

3. **Multi-Region**:
   - Replicate database across regions
   - Route API requests to nearest region
   - Eventual consistency for metrics

4. **Cost Optimization**:
   - Archive old events to cold storage
   - Use serverless compute (Azure Functions) for batch jobs
   - Auto-scale Container Apps based on load

5. **Security**:
   - Rate limiting per org_id
   - IP allowlisting for API
   - Audit logging for compliance

---

## Project Structure

```
blackdoglabs_fullstack_eng_assessment/
├── src/
│   ├── api/              # FastAPI backend
│   │   ├── main.py       # API endpoints
│   │   └── schemas.py    # Pydantic models
│   ├── sdk/              # TypeScript SDK
│   │   └── src/
│   │       ├── client.ts    # Core SDK client
│   │       ├── react.tsx    # React hooks
│   │       └── types.ts     # TypeScript types
│   └── app/              # Next.js frontend
│       └── app/
│           └── dashboard/  # Dashboard page
├── tests/                # API tests
├── sql/                  # SQL queries and DDL
├── infra/                # Infrastructure as code
│   ├── terraform/        # Terraform configs
│   ├── docker/           # Dockerfiles
│   └── helm/             # Helm charts
├── answers.md            # Written responses
├── WORKLOG.md           # Time tracking
└── README.md            # This file
```

---

_Hint: Full instructions, tasks, and scoring live in `candidate_brief.md`._
