# Docker Reference Scaffolding

This folder contains **reference scaffolding** for containerizing the Analytics Platform.

## ⚠️ This is Optional

**Completing these Dockerfiles is NOT a required task.** They are provided as reference for the written response questions in `answers.md` Section E (Containerization & Kubernetes).

**Priority:**
1. Complete Tasks 1-6 in `candidate_brief.md`
2. Answer ALL written responses in `answers.md`
3. *Only if time permits:* Complete these Dockerfiles

## Contents

- `api.Dockerfile` — Multi-stage Dockerfile template for FastAPI backend
- `app.Dockerfile` — Multi-stage Dockerfile template for Next.js frontend
- `docker-compose.yml` — Local development compose file
- `nginx.conf` — Example nginx reverse proxy configuration

## If You Have Time

Feel free to complete the Dockerfiles to demonstrate production-readiness. Focus on:
- Multi-stage builds to minimize image size
- Non-root users for security
- Health checks
- Proper handling of environment variables

## Quick Reference

```bash
# Build images (from repo root)
docker build -f infra/docker/api.Dockerfile -t analytics-api .
docker build -f infra/docker/app.Dockerfile -t analytics-dashboard .

# Run with compose
cd infra/docker
docker-compose up --build
```

