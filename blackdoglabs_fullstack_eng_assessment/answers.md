# answers.md — Short written responses (fill this in)

Please answer briefly and in your own words. Bullet points are fine.

---

## A) API Design & Evolution

### How would you version your API? (path, header, or query param — pros/cons of your choice)

**Path-based versioning** (`/api/v1/events`, `/api/v2/events`):
- **Pros**: 
  - Clear and explicit in the URL
  - Easy to route different versions to different services
  - Works well with API gateways and reverse proxies
  - RESTful and intuitive for developers
- **Cons**: 
  - Requires updating URLs in clients
  - Can lead to URL proliferation if many versions exist
  - Harder to deprecate old versions cleanly

**Header-based versioning** (`Accept: application/vnd.api+json;version=2`):
- **Pros**: 
  - Keeps URLs clean
  - Follows HTTP standards (content negotiation)
  - Good for gradual migration
- **Cons**: 
  - Less discoverable (not visible in URLs)
  - Requires client changes to headers
  - Can be forgotten by developers

**Query param versioning** (`/api/events?version=2`):
- **Pros**: 
  - Simple to implement
  - Easy to test in browsers
- **Cons**: 
  - Can be accidentally omitted
  - Not RESTful
  - Caching complications

**My choice: Path-based versioning** (`/api/v1/`, `/api/v2/`) because it's explicit, works well with infrastructure, and makes versioning decisions clear to API consumers.

### Describe your strategy for **backward-compatible changes** vs **breaking changes**

**Backward-compatible changes** (no version bump):
- Add new optional fields to request/response schemas
- Add new endpoints without modifying existing ones
- Extend enum values (if clients handle unknown values gracefully)
- Add new query parameters (optional)
- Add new HTTP methods for new resources

**Breaking changes** (require version bump):
- Remove or rename fields
- Change field types (string → number)
- Make optional fields required
- Remove endpoints
- Change response structure significantly
- Change authentication/authorization behavior

**Strategy**:
1. **Deprecation period**: Announce breaking changes 3-6 months in advance
2. **Parallel support**: Run v1 and v2 simultaneously during migration window
3. **Documentation**: Clear migration guides with examples
4. **Monitoring**: Track v1 usage to plan sunset timeline
5. **SDK updates**: Release SDK versions aligned with API versions

### How would you handle SDK version compatibility with API versions?

- **SDK versioning**: Use semantic versioning (major.minor.patch)
  - Major version = API version (e.g., SDK v2.x → API v2)
  - Minor version = new features, backward compatible
  - Patch version = bug fixes

- **Compatibility matrix**: Document which SDK versions work with which API versions
- **Auto-detection**: SDK can detect API version from response headers or initial handshake
- **Fallback**: SDK defaults to latest supported API version, allows override
- **Deprecation warnings**: SDK warns when using deprecated API versions
- **Breaking changes**: Major SDK version bump when API version changes

---

## B) Auth & Security

### Explain your auth token structure (what claims, expiry, refresh strategy)

**JWT Token Structure**:
```json
{
  "sub": "u001",              // User ID (subject)
  "org_id": "org001",          // Organization ID (critical for tenant isolation)
  "role": "admin|member|viewer",  // User role within org
  "iat": 1234567890,          // Issued at timestamp
  "exp": 1234571490,          // Expiry timestamp (1 hour)
  "jti": "token-id-123"       // JWT ID (for revocation)
}
```

**Expiry**: 
- Access tokens: 1 hour (short-lived for security)
- Refresh tokens: 7-30 days (longer-lived, stored securely)

**Refresh Strategy**:
1. Client stores refresh token in httpOnly cookie (or secure storage)
2. When access token expires (401 response), client calls `/auth/refresh` with refresh token
3. Server validates refresh token, issues new access token
4. SDK automatically handles refresh without user interruption
5. If refresh token expired, redirect to login

**Token Storage**:
- Access token: Memory (JavaScript variable) - not localStorage (XSS risk)
- Refresh token: httpOnly cookie (CSRF protection via SameSite) or secure storage

### How do you ensure tenant isolation across the stack (API, DB, SDK)?

**API Layer**:
- Extract `org_id` from JWT token claims in auth dependency
- All queries automatically filter by `org_id` (never trust client-provided org_id)
- Row-level security policies in database

**Database Layer**:
- Composite indexes on `(org_id, ...)` for efficient filtering
- Database-level RLS (Row Level Security) policies
- Partitioning by `org_id` for large-scale multi-tenant systems

**SDK Layer**:
- SDK doesn't need to know about `org_id` - it's embedded in the token
- SDK sends token with every request
- No client-side filtering by org_id (security risk)

**Additional safeguards**:
- API middleware validates `org_id` matches token claims
- Database queries always include `WHERE org_id = ?`
- Audit logs include `org_id` for compliance
- Rate limiting per `org_id`

### What secrets need managing, and how would you rotate them without downtime?

**Secrets to manage**:
- JWT signing keys (HS256 secret or RSA private key)
- Database connection strings
- API keys for external services
- OAuth client secrets
- Encryption keys for sensitive data

**Rotation strategy**:

1. **JWT Keys** (most critical):
   - Use key versioning: `kid` (key ID) in JWT header
   - Deploy new key alongside old key
   - Update token issuer to use new key with new `kid`
   - Old tokens continue working until expiry
   - After old tokens expire, remove old key

2. **Database credentials**:
   - Create new credentials in database
   - Update Key Vault with new credentials
   - Deploy new app version reading from Key Vault
   - Old connections continue until app restart
   - After all instances updated, revoke old credentials

3. **Zero-downtime approach**:
   - Dual-write period: Support both old and new secrets
   - Gradual rollout: Update instances incrementally
   - Feature flags: Toggle secret sources
   - Monitoring: Alert on auth failures during rotation

---

## C) Schema Evolution

### Your `events.properties` field contains arbitrary JSON. A new event type needs validated structure. How do you evolve the schema without breaking existing data/queries?

**Approach: Layered validation**

1. **API Layer (Pydantic)**:
   - Use discriminated unions based on `event_type`
   - New event types get strict schemas, old types remain flexible
   ```python
   class PageViewV2(EventPayload):
       event_type: Literal["page_view_v2"]
       properties: PageViewV2Properties  # Strict schema
   
   class LegacyEvent(EventPayload):
       event_type: str
       properties: dict[str, Any]  # Flexible
   ```

2. **Database Layer**:
   - Keep `properties` as JSONB (flexible)
   - Add `schema_version` field to track structure version
   - Use JSONB path queries for new structured fields
   - Index commonly queried paths: `CREATE INDEX ON events ((properties->>'button_id'))`

3. **Migration Strategy**:
   - **Backward compatible**: Old events remain queryable
   - **Forward compatible**: API accepts both old and new formats
   - **Gradual migration**: Clients migrate to new schema over time
   - **Dual write**: Write both formats during transition

4. **Querying**:
   ```sql
   -- Query new structured events
   SELECT * FROM events 
   WHERE event_type = 'page_view_v2' 
     AND properties->>'path' = '/dashboard'
   
   -- Query legacy events (still works)
   SELECT * FROM events 
   WHERE event_type = 'page_view'
   ```

### Describe your approach to **event versioning** (e.g., `page_view_v1` vs `page_view_v2` vs a `schema_version` field) — what are the trade-offs?

**Option 1: Event type versioning** (`page_view_v1`, `page_view_v2`):
- **Pros**: 
  - Clear separation, easy to query by version
  - No schema changes needed
  - Can run different validation logic per version
- **Cons**: 
  - Proliferates event types
  - Requires client updates to use new version
  - Harder to aggregate across versions

**Option 2: `schema_version` field** (recommended):
- **Pros**: 
  - Single `event_type` (`page_view`)
  - Version tracked separately
  - Easier to aggregate (can query all `page_view` events)
  - More flexible (can version properties independently)
- **Cons**: 
  - Need to filter by `schema_version` in queries
  - Slightly more complex queries

**Option 3: Properties-based versioning** (`properties.schema_version`):
- **Pros**: 
  - Very flexible, versioned at property level
  - No schema changes
- **Cons**: 
  - Harder to index efficiently
  - Requires JSON path queries
  - Less discoverable

**My choice: `schema_version` field** because it balances clarity with flexibility, allows aggregation across versions, and keeps event types clean.

---

## D) Observability

### What logs, metrics, and traces would you emit for: API requests, SDK usage, background jobs?

**API Requests**:
- **Logs**: Method, path, status, duration, org_id, user_id, request_id
- **Metrics**: Request rate, latency (p50/p95/p99), error rate (4xx/5xx), throughput
- **Traces**: Full request lifecycle, database query timing, external API calls

**SDK Usage**:
- **Logs**: SDK version, event types tracked, batch sizes, errors
- **Metrics**: Events ingested per org, SDK version distribution, batch flush frequency, error rates
- **Traces**: End-to-end flow from SDK → API → Database

**Background Jobs**:
- **Logs**: Job name, execution time, records processed, errors
- **Metrics**: Job duration, success/failure rate, queue depth, processing rate
- **Traces**: Job execution timeline, retry attempts

**Key metrics**:
- `analytics.events.ingested` (counter, tags: org_id, event_type)
- `analytics.api.request.duration` (histogram, tags: method, path, status)
- `analytics.api.request.count` (counter, tags: method, path, status)
- `analytics.sdk.batch.size` (histogram, tags: org_id)

### Propose **2 SLOs** relevant to this system (with thresholds) and why they matter

**SLO 1: Event Ingestion Availability**
- **Target**: 99.9% of events successfully ingested within 5 seconds
- **Why**: Core business function - lost events = lost analytics insights
- **Measurement**: Track events that fail or exceed 5s processing time
- **Error budget**: 0.1% = ~43 minutes of downtime per month

**SLO 2: API Latency**
- **Target**: 95% of API requests complete in under 200ms (p95)
- **Why**: User experience - slow APIs degrade dashboard performance
- **Measurement**: Track request duration percentiles
- **Error budget**: 5% of requests can exceed 200ms

**Additional considerations**:
- Data freshness: Events queryable within 30 seconds of ingestion
- Query performance: 99% of queries complete in under 1 second

### Brief runbook (3–5 bullets) for debugging a reported "events not appearing" issue

1. **Check ingestion pipeline**:
   - Verify API is receiving events: Check logs for `POST /api/v1/events` requests
   - Check for 4xx/5xx errors in API logs
   - Verify idempotency keys aren't causing false duplicates

2. **Verify tenant isolation**:
   - Confirm `org_id` in JWT token matches expected organization
   - Check database queries include correct `org_id` filter
   - Verify events are stored with correct `org_id`

3. **Check query filters**:
   - Verify date range includes event timestamps
   - Check `event_type` filter isn't excluding events
   - Confirm cursor pagination isn't skipping events

4. **Database verification**:
   - Query database directly: `SELECT * FROM events WHERE org_id = ? AND timestamp > ?`
   - Check for database connection issues or timeouts
   - Verify indexes are being used (EXPLAIN query)

5. **SDK/client check**:
   - Verify SDK is sending events (check network tab)
   - Check for client-side errors or batching delays
   - Confirm API endpoint URL is correct

---

## E) Containerization

### How would you create Docker images for the **FastAPI backend** and **Next.js frontend**? (base images, multi-stage builds, health checks, env config)

**FastAPI Backend**:
```dockerfile
# Multi-stage build
FROM python:3.11-slim as builder
WORKDIR /app
RUN pip install uv
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY src/api/ .

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD curl -f http://localhost:8000/health || exit 1

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Next.js Frontend**:
```dockerfile
# Multi-stage build
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 3000
CMD ["node", "server.js"]
```

**Key considerations**:
- Use slim/alpine images for smaller size
- Multi-stage builds reduce final image size
- Health checks for orchestration (K8s, ECS)
- Non-root user for security
- Layer caching optimization (dependencies before code)

### When deploying the Next.js app, when might you use **nginx** vs serving directly from Node? What are the trade-offs?

**Use nginx** when:
- **Static assets**: Serve static files efficiently (better caching, compression)
- **SSL termination**: Handle TLS/HTTPS at edge
- **Rate limiting**: Protect Node.js from overload
- **Reverse proxy**: Route to multiple Node.js instances
- **Caching**: Cache API responses or static content
- **Security**: Additional security headers, DDoS protection

**Serve directly from Node** when:
- **Simpler deployment**: Fewer moving parts
- **Dynamic content**: SSR/API routes need Node.js anyway
- **Development**: Faster iteration, no nginx config
- **Small scale**: Low traffic doesn't need nginx optimization

**Hybrid approach** (recommended):
- Next.js standalone mode + nginx
- nginx serves static assets and proxies API routes to Node
- Best of both worlds: performance + simplicity

### For this analytics dashboard, would you choose **static export**, **SSR**, or a **hybrid**? Why?

**Hybrid approach** (recommended):

- **Static export** for:
  - Public pages (landing, docs)
  - Dashboard pages that don't need real-time data
  
- **SSR/ISR** for:
  - Dashboard pages with user-specific data
  - Pages requiring authentication
  - Real-time analytics views

**Why hybrid**:
- **Performance**: Static pages are fast, cached at CDN
- **Flexibility**: SSR for dynamic content, static for marketing pages
- **Cost**: Static pages cheaper to serve (CDN vs compute)
- **SEO**: Static pages better for public content

**For this dashboard specifically**:
- Use **SSR** because:
  - User-specific data (org_id from auth)
  - Real-time metrics require server-side data fetching
  - Authentication required (can't be static)
  - ISR (Incremental Static Regeneration) for semi-static content

---

## F) Frontend Auth & Token Flow

### Describe your preferred frontend auth approach (cookies, JWT, OAuth2/OIDC) and the security trade-offs (XSS, CSRF, token theft)

**Approach: OAuth2/OIDC with httpOnly cookies + JWT in memory**

**Flow**:
1. User logs in via OAuth provider (Google, Auth0, etc.)
2. Backend exchanges OAuth code for tokens
3. Backend sets httpOnly cookie with refresh token
4. Backend returns JWT access token in response body
5. Frontend stores access token in memory (not localStorage)
6. Frontend includes access token in Authorization header
7. On expiry, frontend calls `/auth/refresh` endpoint with cookie

**Security trade-offs**:

**XSS (Cross-Site Scripting)**:
- **Risk**: Malicious scripts can steal tokens from localStorage
- **Mitigation**: Store access token in memory (JavaScript variable), not localStorage
- **Trade-off**: Token lost on page refresh (use refresh token to get new one)

**CSRF (Cross-Site Request Forgery)**:
- **Risk**: Malicious sites can make requests with user's cookies
- **Mitigation**: httpOnly cookies with SameSite=Strict, CSRF tokens for state-changing operations
- **Trade-off**: Slightly more complex implementation

**Token Theft**:
- **Risk**: Tokens intercepted in transit or stolen from client
- **Mitigation**: HTTPS only, short-lived access tokens (1 hour), refresh token rotation
- **Trade-off**: More frequent token refreshes

**Why this approach**:
- httpOnly cookies protect refresh tokens from XSS
- Memory storage protects access tokens from XSS
- SameSite cookies protect against CSRF
- Short-lived tokens limit exposure window

### Describe a **token exchange** flow: user logs in via OAuth (e.g., Google) → how does your API validate/authorize subsequent requests?

**Flow**:

1. **Initial OAuth Login**:
   ```
   User → Frontend → Google OAuth
   Google → Frontend (redirect with code)
   Frontend → Backend API: POST /auth/callback?code=xyz
   ```

2. **Backend Token Exchange**:
   ```
   Backend → Google: Exchange code for access_token + id_token
   Backend validates id_token (signature, expiry, audience)
   Backend creates session + issues own JWT
   Backend → Frontend: 
     - Sets httpOnly cookie: refresh_token=abc
     - Returns: { access_token: "jwt...", user: {...}, org_id: "org001" }
   ```

3. **Subsequent API Requests**:
   ```
   Frontend → API: GET /api/v1/events
     Headers: Authorization: Bearer <access_token>
   
   API middleware:
     - Extracts token from Authorization header
     - Verifies JWT signature (using secret/public key)
     - Checks expiry (exp claim)
     - Extracts org_id from claims
     - Attaches user context to request
   ```

4. **Token Refresh** (when access token expires):
   ```
   Frontend detects 401 response
   Frontend → API: POST /auth/refresh
     Cookie: refresh_token=abc
   
   API:
     - Validates refresh token (checks DB/cache)
     - Issues new access token
     - Optionally rotates refresh token
     - Returns new access token
   ```

**Validation details**:
- JWT signature verification using shared secret (HS256) or public key (RS256)
- Claims validation: `exp`, `iat`, `aud`, `iss`
- Database lookup for user/org permissions (if needed)
- Rate limiting per user/org

### How would you handle **token refresh** in the SDK without interrupting user experience?

**Automatic refresh strategy**:

1. **Proactive refresh**:
   - SDK checks token expiry before each request
   - If token expires in <5 minutes, refresh proactively
   - Refresh happens in background, user doesn't notice

2. **Reactive refresh** (on 401):
   - SDK intercepts 401 responses
   - Automatically calls `/auth/refresh` endpoint
   - Retries original request with new token
   - User sees no interruption

3. **Implementation**:
   ```typescript
   class AnalyticsClient {
     private async request(path, options) {
       // Check if token needs refresh
       if (this.isTokenExpiringSoon()) {
         await this.refreshToken();
       }
       
       let response = await fetch(path, {
         ...options,
         headers: { Authorization: `Bearer ${this.accessToken}` }
       });
       
       // Handle 401 - refresh and retry
       if (response.status === 401) {
         await this.refreshToken();
         response = await fetch(path, options); // Retry
       }
       
       return response;
     }
   }
   ```

4. **Queue requests during refresh**:
   - If refresh is in progress, queue new requests
   - Once refresh completes, process queued requests
   - Prevents multiple refresh calls

5. **Error handling**:
   - If refresh fails, clear tokens and redirect to login
   - Show user-friendly error message
   - Don't retry indefinitely

**User experience**:
- No loading spinners during refresh
- Requests appear to complete normally
- Only shows login if refresh token expired

---

## G) Cloud Networking & Architecture

### How would you design the network architecture for this application in production?

**VNet/VPC Design**:

**Azure VNet Structure**:
```
VNet: analytics-vnet (10.0.0.0/16)
├── Subnet: public-subnet (10.0.1.0/24)
│   └── Application Gateway / Front Door
├── Subnet: app-subnet (10.0.2.0/24)
│   └── Container Apps (API)
└── Subnet: data-subnet (10.0.3.0/24)
    └── Azure SQL / Cosmos DB (private endpoints)
```

**Key principles**:
- **Public subnet**: Only load balancers, no direct internet access to apps
- **App subnet**: Container Apps with private ingress, outbound internet via NAT Gateway
- **Data subnet**: Database private endpoints only, no public access

**Private Endpoints**:
- Azure SQL: Private endpoint in data subnet
- Cosmos DB: Private endpoint in data subnet
- Key Vault: Private endpoint for secret access
- Storage: Private endpoint for logs/backups

**Benefits**:
- Database not exposed to internet
- Reduced attack surface
- Compliance (PCI-DSS, HIPAA)
- Network isolation between tiers

**API Gateway Placement**:

**Option 1: Azure Front Door** (recommended for global):
- Edge locations worldwide
- DDoS protection
- SSL termination
- WAF (Web Application Firewall)
- Routes to Container Apps via private endpoints

**Option 2: Application Gateway** (regional):
- Regional deployment
- SSL termination
- WAF
- Path-based routing
- Health probes

**Option 3: API Management** (for API versioning):
- API versioning and routing
- Rate limiting per subscription
- Request/response transformation
- Developer portal
- Placed behind Front Door or Gateway

**Architecture Flow**:
```
Internet → Front Door → Application Gateway → Container Apps (API)
                                              ↓
                                         Private Endpoint
                                              ↓
                                         Azure SQL / Cosmos DB
```

**Security**:
- Network Security Groups (NSGs) restrict traffic between subnets
- Private endpoints eliminate public database exposure
- Managed Identity for service-to-service auth (no secrets in network)
- VNet peering for multi-region (if needed)

---

## H) Data Platform Collaboration

### Why are you interested in learning more about **data engineering / data platform** work?

- **End-to-end understanding**: Understanding how data flows from application events to analytics dashboards helps build better products
- **Scale challenges**: Data engineering solves interesting problems at scale (streaming, batch processing, data quality)
- **Impact**: Data platforms enable data-driven decisions across the organization
- **Career growth**: Fullstack + data engineering = versatile skill set
- **Modern stack**: Interested in learning modern tools (dbt, Airflow, Snowflake, Kafka, etc.)

### What data-related skills would you like to add to your toolbox?

- **ETL/ELT pipelines**: Building robust data pipelines (dbt, Airbyte, Fivetran)
- **Streaming**: Real-time data processing (Kafka, Kafka Streams, Flink)
- **Data modeling**: Dimensional modeling, star schemas, data vault
- **Data warehouses**: Snowflake, BigQuery, Redshift optimization
- **Orchestration**: Airflow, Prefect, Dagster for workflow management
- **Data quality**: Great Expectations, data profiling, anomaly detection
- **Analytics engineering**: dbt for transforming raw data into analytics-ready tables

### Describe how you've worked (or would work) with a **data platform team**:

**Shared concerns**:

- **Schema contracts**: 
  - Product engineers define event schemas (Pydantic models)
  - Data engineers consume events and validate against contracts
  - Shared schema registry (e.g., Confluent Schema Registry, Avro schemas)
  - Versioning strategy for schema evolution

- **Event formats**:
  - Standardized event structure (event_type, properties, timestamp)
  - Consistent naming conventions
  - Documentation of event semantics
  - Example events for testing

- **Data quality**:
  - Monitoring event volume (detect drops)
  - Validating event schemas in pipelines
  - Alerting on schema violations
  - Data freshness SLAs

**Handling schema changes**:

**Scenario**: Events schema needs to change, but downstream pipelines depend on it.

**Process**:
1. **Communication**: Product eng notifies data eng of proposed change
2. **Impact analysis**: Data eng identifies downstream consumers
3. **Backward compatibility**: 
   - Add new fields as optional (don't remove old fields yet)
   - Use schema versioning (`schema_version` field)
   - Support both old and new formats during transition
4. **Migration plan**:
   - Dual write period: Write both old and new formats
   - Gradual migration: Update pipelines one by one
   - Deprecation timeline: Remove old format after all consumers migrated
5. **Testing**: 
   - Test changes in staging environment
   - Validate downstream pipelines still work
   - Monitor for data quality issues

**Example**:
- Product eng: "We're adding `button_id` to `button_click` events"
- Data eng: "We have 3 pipelines consuming this. Let's add it as optional first."
- Timeline: 
  - Week 1: Deploy API change (optional field)
  - Week 2-3: Update pipelines to handle new field
  - Week 4: Make field required (if needed)
  - Week 5: Remove old format support

**Ownership of event data contract**:

**Shared ownership** (recommended):
- **Product engineers**: Define event semantics, business logic, when events fire
- **Data engineers**: Define technical format, schema structure, validation rules
- **Shared**: Schema registry, versioning strategy, documentation

**Why shared**:
- Product eng understands business context
- Data eng understands technical constraints
- Collaboration prevents misalignment
- Shared responsibility for data quality

**Process**:
- RFC (Request for Comments) for new events or schema changes
- Review process with both teams
- Schema registry as source of truth
- Automated validation in CI/CD
