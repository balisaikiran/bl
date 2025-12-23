# Candidate Brief — Fullstack Engineer Assessment (Remote)

**Timebox:** ~2.5 hours of focused work
- Time taken to configure your environment doesn't count, but please note it in the `WORKLOG.md`

**Window:** 72 hours from when you receive this brief (or longer if needed, just let us know)

**Submission:** Repo link or zip containing:
- `README.md` (how to run your solution — your runbook)
- `src/api/`, `src/sdk/`, `src/app/`, `infra/`, `sql/`, `tests/`
- `answers.md` (short written responses)
- `WORKLOG.md` (time spent + AI usage: where/how - doesn't need to be a perfect accounting, just time per task number is helpful)
  - **Don't just slap the whole zip into chatgpt and tell it to solve it/do each task.**
  - Do this like you would real work to a reasonable extent. Ideally, AI can help you with a component of a task at a time. Remember you need to be able to explain your answers when we connect.

**Tooling:** Python 3.11+ with FastAPI for API (use `uv` for dependency management). TypeScript for SDK. Next.js + React for frontend. SQL of your choice. **Azure preferred** (AWS OK). **Terraform required** (plan-ready or pseudo-HCL, no need to deploy).

**Local development:** While you won't deploy to the cloud, your solution **must build and run locally**. We should be able to:
- Start the API (`uv run uvicorn ...`) and hit endpoints
- Build and run the Next.js app (`npm run dev`)
- Run all tests (`pytest` and `npm test`)

**AI policy:** Use AI assistants to accelerate, but log usage in `WORKLOG.md` and ensure the code is yours.
- Please try to comment/indicate the stuff you write vs. AI output
---

## Domain (provided)
You're building part of a **customer analytics platform**. The platform exposes APIs that product teams consume via an SDK embedded in their Next.js applications.

Sample data under `sample_data/`:
- `users.csv` — `(user_id, email, name, role, created_at, updated_at)`
- `organizations.csv` — `(org_id, name, plan, created_at)`
- `user_orgs.csv` — `(user_id, org_id, role, joined_at)`
- `events.ndjson` — `(event_id, org_id, user_id, event_type, properties, timestamp)`
- `metrics.csv` — `(org_id, date, metric_name, value)`

You may augment data if useful (20–100 rows total is fine).

---

## Tasks (complete within ~3 hours)

### 1) SQL & Schema Design
- **T1.1**: Query to find the **top 5 organizations by total event count** in the **last 30 days**, including org name and plan.
- **T1.2**: Query to calculate **daily active users (DAU)** per organization for a given date range.
- **T1.3**: Design DDL for an `events` table that supports:
  - High write throughput
  - Efficient querying by org, user, event_type, and time range
  - **Schema evolution** (new event types, new properties) — explain your approach
  - Include PK/indexes and a note on partitioning strategy

Place queries/DDL in `sql/queries.sql` with brief comments. If you can't execute, add `EXPLAIN`-style commentary.

### 2) Backend API
Implement a REST API using **Python 3.11+ and FastAPI** with the following:

**Setup requirements:**
- Configure **CORS middleware** (allow configurable origins for dev/prod)
- Implement **request logging middleware** (log method, path, status, duration)
- Ensure **automatic OpenAPI docs** work (`/docs` and `/redoc`)

**Events API:**
- `POST /api/v1/events` — Ingest events (batch of 1-100)
  - Implement **idempotency** using a client-provided idempotency key
  - Validate payload schema using Pydantic models
  - Return appropriate status codes
  
- `GET /api/v1/events` — Query events with:
  - Filters: `org_id`, `user_id`, `event_type`, `start_date`, `end_date`
  - **Cursor-based pagination** (not offset-based)
  - Reasonable defaults and limits

**Metrics API:**
- `GET /api/v1/metrics/summary` — Aggregate metrics for an org
  - Params: `org_id`, `start_date`, `end_date`, `metrics[]`
  - Return daily breakdown with totals

**Auth requirements:**
- Implement JWT validation as a **FastAPI dependency** (mock the token verification, but structure it properly)
- Extract `org_id` from token claims and enforce **tenant isolation**
- Include proper error responses (401, 403, 400, 422, etc.)

Include at least **3 unit/integration tests** (pytest) covering: idempotency, pagination cursor, and auth dependency.

### 3) Frontend SDK
Build a small TypeScript SDK (`src/sdk/`) that wraps your API:

**Core SDK (`@acme/analytics-sdk`):**
- `AnalyticsClient` class with:
  - Constructor accepting `{ apiKey, baseUrl, onError? }`
  - `trackEvent(event: EventPayload): Promise<void>` — with automatic batching (queue events, flush every N ms or N events)
  - `trackEvents(events: EventPayload[]): Promise<void>` — batch track with idempotency key generation
  - `getEvents(filters: EventFilters): AsyncGenerator<Event>` — auto-paginating iterator using cursor
  - `getMetricsSummary(params: MetricsParams): Promise<MetricsSummary>`
  - Proper TypeScript types exported

**React hooks (`@acme/analytics-react`):**
- `AnalyticsProvider` — context provider that initializes the client
- `useTrackEvent()` — hook that returns a track function
- `useEvents(filters)` — hook with loading/error states and infinite scroll support
- `useMetrics(params)` — hook for metrics summary with caching

Include type definitions and at least **2 tests** for the SDK (e.g., batching logic, cursor iteration).

### 4) Next.js Integration
Create a minimal Next.js app (`src/app/`) demonstrating SDK usage:

- **Dashboard page** (`/dashboard`):
  - Use `useMetrics` to display a metrics summary card
  - Use `useEvents` with infinite scroll to show recent events
  - Include a filter dropdown (by event_type)
  
- **Pre-built component**:
  - Create an `<EventsTable />` component that:
    - Uses the SDK hooks internally
    - Accepts props for filtering (org_id, event_type)
    - Handles loading, error, and empty states
    - Supports infinite scroll pagination
  - This component should be "drop-in ready" for other teams

Keep styling minimal (Tailwind or basic CSS). Focus on SDK integration patterns.

### 5) Infrastructure (Terraform)
Author minimal IaC (`infra/terraform/`) that provisions:

**Azure (preferred) — see `infra/terraform/azure/`:**
- Container App (or App Service) for the API
- Azure SQL or Cosmos DB for data
- Azure Front Door or API Management for routing
- Key Vault for secrets
- Managed Identity with least-privilege access

**AWS (alternative) — see `infra/terraform/aws/`:**
- Lambda + API Gateway or ECS/Fargate
- RDS or DynamoDB
- Secrets Manager
- IAM roles with least privilege

Include:
- Variables for environment (dev/staging/prod)
- Outputs for API endpoint URL
- Note on state management and workspaces
- Brief explanation of networking/security choices

### 6) Written Responses (answers.md)

**⚠️ Priority: Complete all written responses before attempting optional tasks.**

Answer the following sections. Bullet points are fine — focus on demonstrating understanding.

**A) API Design & Evolution:**
- How would you version your API? (path, header, or query param — pros/cons)
- Describe your strategy for **backward-compatible changes** vs **breaking changes**
- How would you handle SDK version compatibility with API versions?

**B) Auth & Security:**
- Explain your auth token structure (claims, expiry, refresh strategy)
- How do you ensure tenant isolation across the stack (API, DB, SDK)?
- What secrets need managing, and how would you rotate them?

**C) Schema Evolution:**
- Your `events.properties` field contains arbitrary JSON. A new event type needs validated structure. How do you evolve the schema without breaking existing data/queries? (Consider both API validation and database layers)
- Describe your approach to **event versioning** and the trade-offs

**D) Observability:**
- What logs, metrics, and traces would you emit for: API requests, SDK usage, background jobs?
- Propose **2 SLOs** relevant to this system (with thresholds)
- Brief runbook (3–5 bullets) for debugging a reported "events not appearing" issue

**E) Containerization:**
- How would you create Docker images for the backend (FastAPI) and frontend (Next.js)? (multi-stage builds, health checks, env config)
- When might you use **nginx** vs serving Next.js directly from Node? For this dashboard, would you choose static export, SSR, or hybrid?

**F) Frontend Auth & Token Flow:**
- Describe your preferred frontend auth approach and the security trade-offs (XSS, CSRF, token theft)
- Describe a **token exchange** flow: user logs in via OAuth → how does your API validate subsequent requests?
- How would you handle **token refresh** in the SDK without interrupting user experience?

**G) Cloud Networking & Architecture:**
- How would you design the network architecture for production? (VNet/VPC, private endpoints, API gateway placement)

**H) Data Platform Collaboration:**
- Why are you interested in learning more about **data engineering / data platform** work?
- What data-related skills would you like to add to your toolbox? (e.g., ETL/ELT, data modeling, streaming, warehouses, orchestration)
- Describe how you've worked (or would work) with a **data platform team**:
  - What are the **shared concerns** between fullstack and data engineers? (e.g., schema contracts, event formats, data quality)
  - How would you handle a situation where the **events schema** you're emitting needs to change, but downstream data pipelines depend on it?
  - Who owns the "contract" for event data — product eng, data eng, or shared?

---

### 7) OPTIONAL: Containerization (only if time permits)

**⚠️ Prioritize completing Tasks 1-6 and all written responses before attempting this.**

If you have extra time, demonstrate production-readiness by completing the Dockerfiles and Helm charts in `infra/docker/` and `infra/helm/`. Reference scaffolding is provided.

- Complete the **Dockerfile for FastAPI** (`infra/docker/api.Dockerfile`) — multi-stage build
- Complete the **Dockerfile for Next.js** (`infra/docker/app.Dockerfile`) — consider SSR vs static export
- Review/extend the **Helm chart** (`infra/helm/analytics-platform/`)

The written responses in Section 6E ask about these concepts — **answering those questions is more important than building working images**.

---

## What to submit
- `README.md` (your runbook with exact steps to run everything)
- `WORKLOG.md` (time spent; where/how you used AI)
- Code in `src/api/`, `src/sdk/`, `src/app/`
- SQL in `sql/queries.sql`
- Terraform in `infra/terraform/azure/` or `infra/terraform/aws/`
- Written responses in `answers.md`
- *(Optional)* Dockerfiles in `infra/docker/`
- *(Optional)* Helm charts in `infra/helm/`

**Optional:** Share an unlisted **Loom** (≤5 min) walking through:
- API running with a sample request
- SDK tests passing  
- Next.js dashboard loading data
- Quick IaC walkthrough

---

## Getting started
- Templates are scaffolds to save setup time; reorganize if you prefer
- Sample data is minimal — augment as needed
- Terraform shouldn't be deployed, just **plan-ready**
- Docker/Helm scaffolding is provided for reference — completing it is optional
- **Focus on demonstrating patterns over completeness** — well-structured partial solutions beat rushed complete ones
- **Prioritize written responses** — they reveal understanding even if code is incomplete

Thanks for taking the time — we're looking forward to your solution!

