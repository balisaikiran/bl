# Fullstack Engineer Assessment — Candidate README

This README is your **runbook**. Add the exact steps and notes needed to run **your** solution end-to-end.

## 1) Quickstart
- Python version required (3.11+)
- Node.js version required (18+)
- How to install deps:
  - API: `cd src/api && uv pip install -r requirements.txt`
  - SDK: `cd src/sdk && npm install`
  - App: `cd src/app && npm install`
- Any environment variables or local config needed

## 2) Run the API
- Command to start the API server (e.g., `cd src/api && uv run uvicorn main:app --reload`)
- Base URL: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- Sample curl/httpie commands to test endpoints

## 3) Run the SDK tests
- Command: `cd src/sdk && npm test`
- What the tests cover

## 4) Run the Next.js App
- Command: `cd src/app && npm run dev`
- URL: `http://localhost:3000`
- Any setup needed (API must be running, etc.)

## 5) Terraform / IaC
- Choose Azure (`infra/terraform/azure/`) or AWS (`infra/terraform/aws/`)
- What resources would be created
- Least-privilege rationale
- State management approach

## 6) Docker (Optional — reference only)
- Scaffolding provided in `infra/docker/` for reference
- **Prioritize written responses over completing Dockerfiles**
- If time permits: `docker build -f infra/docker/api.Dockerfile -t analytics-api .`

## 7) Helm / Kubernetes (Optional — reference only)
- Chart scaffolding in `infra/helm/analytics-platform/`
- **Prioritize written responses over completing Helm charts**
- If time permits: `helm template my-release ./infra/helm/analytics-platform`

## 8) Tests
- How to run all tests:
  - API: `pytest tests/`
  - SDK: `cd src/sdk && npm test`
- What they cover (summary)

## 9) Assumptions & decisions
- Key trade-offs (e.g., cursor pagination strategy, batching approach)
- Auth implementation notes
- Schema evolution approach

## 10) Known limitations & next steps (optional)
- Gaps you'd close with more time
- Scaling/production hardening ideas

---
_Hint: Full instructions, tasks, and scoring live in `candidate_brief.md`._


