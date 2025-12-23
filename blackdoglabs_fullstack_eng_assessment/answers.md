# answers.md — Short written responses (fill this in)

Please answer briefly and in your own words. Bullet points are fine.

---

## A) API Design & Evolution
- How would you version your API? (path, header, or query param — pros/cons of your choice)
- Describe your strategy for **backward-compatible changes** vs **breaking changes**
- How would you handle SDK version compatibility with API versions?

---

## B) Auth & Security
- Explain your auth token structure (what claims, expiry, refresh strategy)
- How do you ensure tenant isolation across the stack (API, DB, SDK)?
- What secrets need managing, and how would you rotate them without downtime?

---

## C) Schema Evolution
- Your `events.properties` field contains arbitrary JSON. A new event type needs validated structure. How do you evolve the schema without breaking existing data/queries? Consider both API validation and database layers.
- Describe your approach to **event versioning** (e.g., `page_view_v1` vs `page_view_v2` vs a `schema_version` field) — what are the trade-offs?

---

## D) Observability
- What logs, metrics, and traces would you emit for: API requests, SDK usage, background jobs?
- Propose **2 SLOs** relevant to this system (with thresholds) and why they matter
- Brief runbook (3–5 bullets) for debugging a reported "events not appearing" issue

---

## E) Containerization
- How would you create Docker images for the **FastAPI backend** and **Next.js frontend**? (base images, multi-stage builds, health checks, env config)
- When deploying the Next.js app, when might you use **nginx** vs serving directly from Node? What are the trade-offs?
- For this analytics dashboard, would you choose **static export**, **SSR**, or a **hybrid**? Why?

---

## F) Frontend Auth & Token Flow
- Describe your preferred frontend auth approach (cookies, JWT, OAuth2/OIDC) and the security trade-offs (XSS, CSRF, token theft)
- Describe a **token exchange** flow: user logs in via OAuth (e.g., Google) → how does your API validate/authorize subsequent requests?
- How would you handle **token refresh** in the SDK without interrupting user experience?

---

## G) Cloud Networking & Architecture
- How would you design the network architecture for this application in production?
  - **VNet/VPC design** (subnets, public vs private)
  - **Private endpoints** for database/storage access
  - **API Gateway** or **API Management** placement

---

## H) Data Platform Collaboration
- Why are you interested in learning more about **data engineering / data platform** work?
- What data-related skills would you like to add to your toolbox? (e.g., ETL/ELT, data modeling, streaming, warehouses, orchestration)
- Describe how you've worked (or would work) with a **data platform team**:
  - What are the **shared concerns** between fullstack and data engineers? (e.g., schema contracts, event formats, data quality)
  - How would you handle a situation where the **events schema** you're emitting needs to change, but downstream data pipelines depend on it?
  - Who owns the "contract" for event data — product eng, data eng, or shared?



