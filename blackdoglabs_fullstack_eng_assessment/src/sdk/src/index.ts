// src/sdk/src/index.ts
// Main entry point for the Analytics SDK

// Core client
export { AnalyticsClient } from './client';

// Types
export type {
  AnalyticsClientConfig,
  EventPayload,
  Event,
  EventFilters,
  EventsResponse,
  MetricsParams,
  MetricsSummary,
  DailyMetrics,
  ApiError,
} from './types';

// React bindings
export {
  AnalyticsProvider,
  useAnalyticsClient,
  useTrackEvent,
  useEvents,
  useMetrics,
} from './react';

