# Testing Guide

This guide walks you through testing all components of the analytics platform.

## Prerequisites

1. **API Server** running on `http://localhost:8000`
2. **Next.js App** running on `http://localhost:3000`

## 1. Test the API Endpoints

### 1.1 Health Check
```bash
curl http://localhost:8000/health
```
**Expected**: `{"status":"ok","timestamp":...}`

### 1.2 Ingest Events (POST /api/v1/events)
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
      },
      {
        "event_type": "button_click",
        "user_id": "u002",
        "properties": {
          "button_id": "submit_form",
          "page": "/settings"
        }
      }
    ]
  }'
```
**Expected**: `{"accepted":2,"org_id":"org001"}`

### 1.3 Test Idempotency (Duplicate Request)
```bash
# Run the same request again with same idempotency key
curl -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer org001:u001" \
  -H "X-Idempotency-Key: test-key-123" \
  -d '{
    "events": [
      {
        "event_type": "page_view",
        "user_id": "u001",
        "properties": {"path": "/dashboard"}
      }
    ]
  }'
```
**Expected**: `409 Conflict` error (duplicate idempotency key)

### 1.4 Query Events (GET /api/v1/events)
```bash
# Get all events
curl "http://localhost:8000/api/v1/events?limit=10" \
  -H "Authorization: Bearer org001:u001"

# Filter by event type
curl "http://localhost:8000/api/v1/events?event_type=page_view&limit=5" \
  -H "Authorization: Bearer org001:u001"

# Filter by date range
curl "http://localhost:8000/api/v1/events?start_date=2025-12-01&end_date=2025-12-31&limit=10" \
  -H "Authorization: Bearer org001:u001"
```
**Expected**: JSON response with `data`, `cursor`, and `has_more` fields

### 1.5 Test Cursor Pagination
```bash
# First page
RESPONSE=$(curl -s "http://localhost:8000/api/v1/events?limit=2" \
  -H "Authorization: Bearer org001:u001")
echo $RESPONSE | jq '.cursor'

# Second page (use cursor from first response)
CURSOR="<paste-cursor-from-above>"
curl "http://localhost:8000/api/v1/events?limit=2&cursor=$CURSOR" \
  -H "Authorization: Bearer org001:u001"
```

### 1.6 Get Metrics Summary
```bash
curl "http://localhost:8000/api/v1/metrics/summary?start_date=2025-12-15&end_date=2025-12-16" \
  -H "Authorization: Bearer org001:u001"
```
**Expected**: JSON with `data` (daily breakdown) and `totals`

### 1.7 Test Authentication (Missing Token)
```bash
curl http://localhost:8000/api/v1/events
```
**Expected**: `401 Unauthorized`

### 1.8 View API Documentation
Open in browser:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 2. Run Automated Tests

### 2.1 API Tests (pytest)
```bash
# From project root
cd /Users/saikiran/Downloads/bl/blackdoglabs_fullstack_eng_assessment
pytest tests/ -v
```

**What it tests**:
- Health check endpoint
- Auth middleware (401 on missing tokens)
- Idempotency (409 on duplicate keys)
- Cursor pagination structure
- Validation (empty arrays, too many events)
- OpenAPI docs availability

**Expected**: All tests pass ✅

### 2.2 SDK Tests (vitest)
```bash
cd src/sdk
npm test
```

**What it tests**:
- Event batching (time-based and size-based)
- Cursor pagination iteration
- Idempotency key generation
- Error handling
- Authorization headers

**Expected**: All tests pass ✅

## 3. Test the Next.js Frontend

### 3.1 Open the Dashboard
1. Make sure API is running on `http://localhost:8000`
2. Open browser: http://localhost:3000
3. Navigate to: http://localhost:3000/dashboard

### 3.2 Verify Dashboard Features

**Metrics Summary Card**:
- Should show metrics data (or loading state)
- Should display totals for different metrics
- Check browser console for any errors

**Events Table**:
- Should display events in a table
- Should show event type, user, properties, timestamp
- Should have infinite scroll (scroll down to load more)
- Should show "Load more" button or auto-load

**Event Type Filter**:
- Use the dropdown to filter by event type
- Table should update to show filtered events
- Try: "All events", "Page View", "Button Click"

### 3.3 Test SDK Integration

Open browser DevTools (F12) and check:

**Console Tab**:
- No errors related to SDK imports
- Check for any API call errors

**Network Tab**:
- Filter by "Fetch/XHR"
- Ingest some events and verify API calls are made
- Check that requests include `Authorization: Bearer ...` header
- Verify responses are successful (200 status)

### 3.4 Test Event Tracking (if implemented)

If you have a way to trigger events from the UI:
1. Perform actions that trigger events
2. Check Network tab for POST requests to `/api/v1/events`
3. Verify events appear in the events table

## 4. End-to-End Testing Workflow

### Complete Flow Test:

1. **Start API**:
   ```bash
   cd /Users/saikiran/Downloads/bl/blackdoglabs_fullstack_eng_assessment
   uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   cd src/app
   npm run dev
   ```

3. **Ingest Events via API**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/events \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer org001:u001" \
     -H "X-Idempotency-Key: e2e-test-$(date +%s)" \
     -d '{
       "events": [
         {
           "event_type": "page_view",
           "user_id": "u001",
           "properties": {"path": "/test", "source": "e2e_test"}
         },
         {
           "event_type": "button_click",
           "user_id": "u002",
           "properties": {"button_id": "test_button"}
         }
       ]
     }'
   ```

4. **Verify Events in Frontend**:
   - Open http://localhost:3000/dashboard
   - Check events table shows the events you just ingested
   - Try filtering by event type
   - Test pagination (scroll or click "Load more")

5. **Verify Metrics**:
   - Check metrics summary card updates
   - Verify totals are calculated correctly

## 5. Manual Testing Checklist

### API Testing ✅
- [ ] Health check returns 200
- [ ] Can ingest events (POST /api/v1/events)
- [ ] Idempotency works (duplicate key returns 409)
- [ ] Can query events (GET /api/v1/events)
- [ ] Cursor pagination works (has_more, cursor fields)
- [ ] Date filtering works
- [ ] Event type filtering works
- [ ] Metrics summary returns data
- [ ] Auth required (401 without token)
- [ ] OpenAPI docs accessible (/docs, /redoc)

### Frontend Testing ✅
- [ ] Dashboard page loads
- [ ] Metrics card displays (or shows loading/error states)
- [ ] Events table displays events
- [ ] Event type filter works
- [ ] Infinite scroll works (or "Load more" button)
- [ ] No console errors
- [ ] API calls include auth headers
- [ ] Responsive design (try resizing browser)

### SDK Testing ✅
- [ ] SDK tests pass (npm test in src/sdk)
- [ ] Batching works (events queued and flushed)
- [ ] Cursor pagination iterates correctly
- [ ] Error handling works

## 6. Troubleshooting

### API Issues:
- **Import errors**: Make sure you're running from project root
- **Port 8000 in use**: Change port: `--port 8001`
- **401 errors**: Check Authorization header format: `Bearer org001:u001`

### Frontend Issues:
- **Module not found**: Restart dev server after config changes
- **API connection errors**: Verify API is running on port 8000
- **Blank page**: Check browser console for errors

### Common Issues:
- **CORS errors**: Check API CORS config allows `http://localhost:3000`
- **SDK import errors**: Verify `next.config.js` and `tsconfig.json` are configured
- **Events not appearing**: Check API logs, verify events were ingested

## 7. Quick Test Script

Save this as `quick-test.sh`:

```bash
#!/bin/bash
echo "🧪 Testing Analytics Platform"
echo ""

echo "1. Testing API Health..."
curl -s http://localhost:8000/health | jq '.' || echo "❌ API not running"
echo ""

echo "2. Testing Event Ingestion..."
curl -s -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer org001:u001" \
  -H "X-Idempotency-Key: quick-test-$(date +%s)" \
  -d '{"events":[{"event_type":"test","user_id":"u001","properties":{}}]}' | jq '.'
echo ""

echo "3. Testing Event Query..."
curl -s "http://localhost:8000/api/v1/events?limit=5" \
  -H "Authorization: Bearer org001:u001" | jq '.data | length'
echo " events returned"
echo ""

echo "✅ Quick test complete!"
echo "📊 Open http://localhost:3000/dashboard to test frontend"
```

Make it executable and run:
```bash
chmod +x quick-test.sh
./quick-test.sh
```

---

**Happy Testing! 🚀**

