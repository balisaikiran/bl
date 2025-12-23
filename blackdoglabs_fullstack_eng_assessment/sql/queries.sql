-- sql/queries.sql
-- SQL queries and DDL for Analytics Platform

-- =============================================================================
-- T1.1: Top 5 organizations by total event count in the last 30 days
-- Include org name and plan
-- =============================================================================
SELECT 
    o.org_id,
    o.name AS org_name,
    o.plan,
    COUNT(e.event_id) AS total_events
FROM organizations o
INNER JOIN events e ON o.org_id = e.org_id
WHERE e.timestamp >= CURRENT_DATE - INTERVAL '30 days'
    AND e.timestamp < CURRENT_DATE + INTERVAL '1 day'
GROUP BY o.org_id, o.name, o.plan
ORDER BY total_events DESC
LIMIT 5;

-- Alternative PostgreSQL syntax:
-- WHERE e.timestamp >= CURRENT_DATE - 30
-- Or using NOW():
-- WHERE e.timestamp >= NOW() - INTERVAL '30 days'

-- Assumptions:
-- - events table has org_id and timestamp columns
-- - organizations table has org_id, name, and plan columns
-- - timestamp is stored as TIMESTAMP or TIMESTAMPTZ
-- - We count events from the last 30 days (inclusive of today)


-- =============================================================================
-- T1.2: Daily Active Users (DAU) per organization for a date range
-- Params: @start_date, @end_date
-- =============================================================================
-- PostgreSQL version:
SELECT 
    o.org_id,
    o.name AS org_name,
    DATE(e.timestamp) AS date,
    COUNT(DISTINCT e.user_id) AS daily_active_users
FROM organizations o
INNER JOIN events e ON o.org_id = e.org_id
WHERE DATE(e.timestamp) >= :start_date
    AND DATE(e.timestamp) <= :end_date
GROUP BY o.org_id, o.name, DATE(e.timestamp)
ORDER BY o.org_id, date;

-- Parameterized version (using named parameters):
-- WHERE DATE(e.timestamp) >= @start_date
--     AND DATE(e.timestamp) <= @end_date

-- Assumptions:
-- - DAU = unique users who generated at least one event on that day
-- - Date range is inclusive on both ends
-- - Events table has org_id, user_id, and timestamp columns
-- - We want results grouped by organization and date


-- =============================================================================
-- T1.3: DDL for events table with schema evolution support
-- Requirements:
--   - High write throughput
--   - Efficient querying by org, user, event_type, and time range
--   - Schema evolution (new event types, new properties)
--   - PK/indexes and partitioning strategy
-- =============================================================================

-- PostgreSQL DDL (recommended for analytics workloads)
CREATE TABLE events (
    -- Primary key: UUID for distributed systems, or BIGSERIAL for single-node
    event_id VARCHAR(255) PRIMARY KEY,
    
    -- Tenant isolation (critical for multi-tenant)
    org_id VARCHAR(255) NOT NULL,
    
    -- User identification
    user_id VARCHAR(255) NOT NULL,
    
    -- Event type (e.g., 'page_view', 'button_click')
    -- Using VARCHAR allows new event types without schema changes
    event_type VARCHAR(100) NOT NULL,
    
    -- Flexible JSONB column for event properties
    -- JSONB allows efficient querying and indexing of nested properties
    -- Schema evolution: new properties can be added without ALTER TABLE
    properties JSONB NOT NULL DEFAULT '{}',
    
    -- Event timestamp (use TIMESTAMPTZ for timezone-aware timestamps)
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Metadata fields for schema evolution
    -- schema_version: allows versioning of event structure (e.g., 'page_view_v1', 'page_view_v2')
    schema_version VARCHAR(50),
    
    -- Ingestion metadata
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key VARCHAR(255),
    
    -- Optional: raw event payload for debugging/replay
    raw_payload JSONB
);

-- Indexes for efficient querying
-- Composite index for common query pattern: org + time range
CREATE INDEX idx_events_org_timestamp ON events (org_id, timestamp DESC);

-- Index for user-based queries
CREATE INDEX idx_events_org_user ON events (org_id, user_id, timestamp DESC);

-- Index for event type filtering
CREATE INDEX idx_events_org_type ON events (org_id, event_type, timestamp DESC);

-- GIN index on JSONB properties for flexible property queries
-- Allows queries like: WHERE properties @> '{"button_id": "submit"}'
CREATE INDEX idx_events_properties_gin ON events USING GIN (properties);

-- Index on idempotency key for duplicate detection
CREATE UNIQUE INDEX idx_events_idempotency ON events (org_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Index on schema_version for filtering by version
CREATE INDEX idx_events_schema_version ON events (org_id, event_type, schema_version);

-- Partitioning strategy for high write throughput
-- Partition by timestamp (monthly partitions recommended for analytics)
-- This improves query performance and allows efficient data archival

-- Create parent table (already created above)
-- Convert to partitioned table:
ALTER TABLE events SET (
    -- Enable partition pruning
    enable_partition_pruning = true
);

-- Note: In PostgreSQL 10+, you can use declarative partitioning:
-- DROP TABLE events;
-- CREATE TABLE events (
--     event_id VARCHAR(255),
--     org_id VARCHAR(255) NOT NULL,
--     user_id VARCHAR(255) NOT NULL,
--     event_type VARCHAR(100) NOT NULL,
--     properties JSONB NOT NULL DEFAULT '{}',
--     timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     schema_version VARCHAR(50),
--     ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--     idempotency_key VARCHAR(255),
--     raw_payload JSONB,
--     PRIMARY KEY (event_id, timestamp)
-- ) PARTITION BY RANGE (timestamp);

-- Example monthly partition:
-- CREATE TABLE events_2025_12 PARTITION OF events
--     FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Schema Evolution Strategy:
-- 1. **Backward Compatibility**: 
--    - Keep properties as JSONB (flexible schema)
--    - Use schema_version field to version event structures
--    - Old events remain queryable without migration
--
-- 2. **Forward Compatibility**:
--    - API validates new required properties but doesn't break on missing fields
--    - Use Pydantic models with Optional fields for new properties
--
-- 3. **Versioning Approach**:
--    Option A: Event type versioning (page_view_v1, page_view_v2)
--      - Pros: Clear separation, easy to query by version
--      - Cons: More event types, requires client updates
--
--    Option B: schema_version field (recommended)
--      - Pros: Single event_type, version tracked separately
--      - Cons: Need to filter by schema_version in queries
--
--    Option C: Properties-based versioning (properties.schema_version)
--      - Pros: Flexible, versioned at property level
--      - Cons: Harder to index and query efficiently
--
-- 4. **Migration Strategy**:
--    - Never alter existing columns (add new columns instead)
--    - Use views or materialized views for backward compatibility
--    - Archive old partitions after retention period
--    - Use JSONB path queries for accessing nested properties
--
-- 5. **Querying Evolved Schemas**:
--    -- Query events with specific property structure
--    SELECT * FROM events 
--    WHERE event_type = 'page_view' 
--        AND properties @> '{"new_field": "value"}'
--        AND schema_version = 'v2';
--
--    -- Query all versions, transform in application layer
--    SELECT * FROM events 
--    WHERE event_type = 'page_view'
--    ORDER BY timestamp DESC;

-- Additional considerations:
-- - Consider adding a TTL/retention policy (e.g., archive events older than 2 years)
-- - For very high write throughput, consider:
--   - Write-ahead log (WAL) optimization
--   - Connection pooling
--   - Batch inserts
--   - Consider TimescaleDB extension for time-series optimization
-- - For multi-region: use org_id as partition key in distributed systems
