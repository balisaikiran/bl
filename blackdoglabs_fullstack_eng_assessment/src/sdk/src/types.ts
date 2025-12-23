// src/sdk/src/types.ts
// Shared types for the Analytics SDK

export interface AnalyticsClientConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL of the Analytics API */
  baseUrl: string;
  /** Optional error handler */
  onError?: (error: Error) => void;
  /** Batch flush interval in milliseconds (default: 5000) */
  flushInterval?: number;
  /** Maximum batch size before auto-flush (default: 10) */
  maxBatchSize?: number;
}

export interface EventPayload {
  /** Type of event (e.g., page_view, button_click) */
  event_type: string;
  /** User who triggered the event */
  user_id: string;
  /** Event properties (flexible schema) */
  properties?: Record<string, unknown>;
  /** Event timestamp (optional, server sets if not provided) */
  timestamp?: string;
}

export interface Event {
  event_id: string;
  org_id: string;
  user_id: string;
  event_type: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

export interface EventFilters {
  user_id?: string;
  event_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface EventsResponse {
  data: Event[];
  cursor: string | null;
  has_more: boolean;
}

export interface MetricsParams {
  start_date: string;
  end_date: string;
  metrics?: string[];
}

export interface DailyMetrics {
  date: string;
  metrics: Record<string, number>;
}

export interface MetricsSummary {
  data: DailyMetrics[];
  totals: Record<string, number>;
}

export interface ApiError {
  detail: string;
  errors?: Record<string, string[]>;
}

