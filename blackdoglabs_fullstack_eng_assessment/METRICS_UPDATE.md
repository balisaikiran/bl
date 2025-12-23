# Metrics Calculation Update

## What Changed

✅ **Removed hardcoded metrics** - Metrics are now calculated dynamically from events in real-time

✅ **Dynamic calculation** - The `/api/v1/metrics/summary` endpoint now:
- Counts events by type (page_view → page_views, button_click → button_clicks, etc.)
- Calculates unique users per day
- Calculates total unique users across the entire date range
- Only includes events within the requested date range

## How It Works

1. **Event Types → Metrics Mapping**:
   - `page_view` → `page_views`
   - `button_click` → `button_clicks`
   - `feature_used` → `feature_uses`
   - `api_call` → `api_calls`
   - Any other event type → `{event_type}_count`

2. **Metrics Calculated**:
   - **Page Views**: Count of `page_view` events
   - **Button Clicks**: Count of `button_click` events
   - **Unique Users**: Count of distinct users (per day and total)
   - **Other metrics**: Based on event types ingested

3. **Date Range Filtering**: Only events within the requested date range are included

## Testing

### 1. Restart the API Server
```bash
# Stop the current server (Ctrl+C) and restart
cd /Users/saikiran/Downloads/bl/blackdoglabs_fullstack_eng_assessment
uv run uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Ingest Some Events
```bash
# Ingest events with today's date
curl -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer org001:u001" \
  -H "X-Idempotency-Key: test-$(date +%s)" \
  -d '{
    "events": [
      {
        "event_type": "page_view",
        "user_id": "u001",
        "properties": {"path": "/dashboard"}
      },
      {
        "event_type": "page_view",
        "user_id": "u002",
        "properties": {"path": "/settings"}
      },
      {
        "event_type": "button_click",
        "user_id": "u001",
        "properties": {"button_id": "submit"}
      }
    ]
  }'
```

### 3. Check Metrics (use today's date)
```bash
# Get today's date
TODAY=$(date +%Y-%m-%d)

# Query metrics for today
curl "http://localhost:8000/api/v1/metrics/summary?start_date=$TODAY&end_date=$TODAY" \
  -H "Authorization: Bearer org001:u001"
```

**Expected Response**:
```json
{
  "data": [
    {
      "date": "2025-12-23",
      "metrics": {
        "page_views": 2.0,
        "button_clicks": 1.0,
        "unique_users": 2.0
      }
    }
  ],
  "totals": {
    "page_views": 2.0,
    "button_clicks": 1.0,
    "unique_users": 2.0
  }
}
```

### 4. Test in Dashboard

1. Open http://localhost:3000/dashboard
2. The dashboard shows last 30 days by default
3. Ingest events with today's date
4. Refresh the dashboard
5. You should see:
   - **Metrics Summary**: Real counts based on your events
   - **Events Table**: Your newly ingested events

### 5. Verify Sample Events Still Work

The sample events (from Dec 15, 2025) are still there for initial testing:
- 3 sample events (2 page_view, 1 button_click)
- They'll show up if you query for that date range

## What to Expect

### Before (Hardcoded):
- Metrics: 330 Page Views, 27 Users, 97 Clicks (static)
- Same numbers regardless of events ingested

### After (Dynamic):
- Metrics: Calculated from actual events
- Numbers change as you ingest more events
- Only includes events within the date range
- Unique users calculated correctly (not summed)

## Notes

- **Sample Events**: Still initialized on startup (3 events from Dec 15, 2025)
- **Date Range**: Dashboard defaults to last 30 days
- **Real-time**: Metrics update immediately after ingesting events
- **No Persistence**: Events are in-memory (lost on server restart)

## Troubleshooting

**Metrics show 0**:
- Check date range - events must be within the requested dates
- Verify events were ingested successfully
- Check event timestamps

**Unique users seems wrong**:
- Total unique users = distinct users across entire date range (not sum of daily counts)
- Daily unique users = distinct users for that specific day

**Events not showing**:
- Check date range filter
- Verify events have correct timestamps
- Check browser console for errors

