// src/app/components/sdk-stub.tsx
// Temporary stub for SDK types and hooks
// TODO: Remove this file and import from '@acme/analytics-sdk' once linked

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// =============================================================================
// Types (copy from SDK)
// =============================================================================

export interface AnalyticsClientConfig {
  apiKey: string;
  baseUrl: string;
  onError?: (error: Error) => void;
}

export interface EventPayload {
  event_type: string;
  user_id: string;
  properties?: Record<string, unknown>;
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

// =============================================================================
// Context (stub)
// =============================================================================

interface AnalyticsContextValue {
  config: AnalyticsClientConfig;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({
  config,
  children
}: {
  config: AnalyticsClientConfig;
  children: ReactNode;
}) {
  return (
    <AnalyticsContext.Provider value={{ config }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

function useAnalyticsConfig() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsConfig must be used within AnalyticsProvider');
  }
  return context.config;
}

// =============================================================================
// Hooks (stub implementations - connect to real SDK)
// =============================================================================

export function useTrackEvent() {
  const config = useAnalyticsConfig();

  return useCallback((event: EventPayload) => {
    // TODO: Implement using real SDK client
    console.log('[Analytics] Track event:', event);
  }, [config]);
}

interface UseEventsResult {
  events: Event[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function useEvents(filters: EventFilters): UseEventsResult {
  const config = useAnalyticsConfig();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO: Implement using real SDK client
    // For now, return empty data after a delay to simulate loading
    const timer = setTimeout(() => {
      setEvents([]);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [config, JSON.stringify(filters)]);

  return {
    events,
    loading,
    error,
    hasMore: false,
    loadMore: () => {},
    refresh: () => setLoading(true),
  };
}

interface UseMetricsResult {
  data: MetricsSummary | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useMetrics(params: MetricsParams): UseMetricsResult {
  const config = useAnalyticsConfig();
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO: Implement using real SDK client
    // For now, return mock data after a delay
    const timer = setTimeout(() => {
      setData({
        data: [],
        totals: {},
      });
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [config, JSON.stringify(params)]);

  return {
    data,
    loading,
    error,
    refresh: () => setLoading(true),
  };
}

