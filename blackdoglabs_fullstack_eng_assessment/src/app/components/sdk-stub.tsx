// src/app/components/sdk-stub.tsx
// Re-export SDK types and hooks for use in Next.js app
// In production, this would import from '@acme/analytics-sdk' package

'use client';

// Import from SDK source (in monorepo, we can import directly)
// In production: import { AnalyticsProvider, useTrackEvent, useEvents, useMetrics } from '@acme/analytics-sdk';
// Using path alias configured in tsconfig.json and next.config.js
import {
  AnalyticsProvider,
  useTrackEvent,
  useEvents,
  useMetrics,
} from '@sdk/react';

// Re-export types for convenience
export type {
  AnalyticsClientConfig,
  EventPayload,
  Event,
  EventFilters,
  MetricsParams,
  MetricsSummary,
  DailyMetrics,
} from '@sdk/types';

// Re-export hooks
export { AnalyticsProvider, useTrackEvent, useEvents, useMetrics };

