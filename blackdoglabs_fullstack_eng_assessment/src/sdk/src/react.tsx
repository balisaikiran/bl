// src/sdk/src/react.tsx
// React hooks and provider for the Analytics SDK
// Provides context-based client access and convenient hooks for common operations

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

import { AnalyticsClient } from './client';
import type {
  AnalyticsClientConfig,
  EventPayload,
  Event,
  EventFilters,
  MetricsParams,
  MetricsSummary,
} from './types';

// =============================================================================
// Context
// =============================================================================

interface AnalyticsContextValue {
  client: AnalyticsClient;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface AnalyticsProviderProps {
  config: AnalyticsClientConfig;
  children: ReactNode;
}

/**
 * Provider component that initializes the Analytics client.
 * Wrap your app with this provider to enable analytics hooks.
 *
 * Usage:
 * ```tsx
 * <AnalyticsProvider config={{ apiKey: '...', baseUrl: '...' }}>
 *   <App />
 * </AnalyticsProvider>
 * ```
 */
export function AnalyticsProvider({ config, children }: AnalyticsProviderProps) {
  const [client] = useState(() => new AnalyticsClient(config));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      client.destroy();
    };
  }, [client]);

  return (
    <AnalyticsContext.Provider value={{ client }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// =============================================================================
// Hook: useAnalyticsClient
// =============================================================================

/**
 * Access the raw AnalyticsClient instance.
 */
export function useAnalyticsClient(): AnalyticsClient {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsClient must be used within an AnalyticsProvider');
  }
  return context.client;
}

// =============================================================================
// Hook: useTrackEvent
// =============================================================================

/**
 * Returns a function to track events.
 * Uses automatic batching under the hood.
 *
 * Usage:
 * ```tsx
 * const trackEvent = useTrackEvent();
 * trackEvent({ event_type: 'button_click', user_id: 'u001', properties: { ... } });
 * ```
 */
export function useTrackEvent() {
  const client = useAnalyticsClient();

  return useCallback(
    (event: EventPayload) => {
      client.trackEvent(event).catch(console.error);
    },
    [client]
  );
}

// =============================================================================
// Hook: useEvents
// =============================================================================

interface UseEventsResult {
  events: Event[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

/**
 * Hook for querying events with infinite scroll support.
 * Automatically handles pagination using cursors.
 *
 * Usage:
 * ```tsx
 * const { events, loading, hasMore, loadMore } = useEvents({ event_type: 'page_view' });
 * ```
 */
export function useEvents(filters: EventFilters): UseEventsResult {
  const client = useAnalyticsClient();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Store the async generator for pagination
  const generatorRef = useRef<AsyncGenerator<Event> | null>(null);

  const loadMore = useCallback(async () => {
    if (!generatorRef.current || loading) return;

    setLoading(true);
    try {
      const newEvents: Event[] = [];
      const limit = filters.limit ?? 50;

      for (let i = 0; i < limit; i++) {
        const result = await generatorRef.current.next();
        if (result.done) {
          setHasMore(false);
          break;
        }
        newEvents.push(result.value);
      }

      setEvents(prev => [...prev, ...newEvents]);
      // If we got fewer than requested, no more to load
      if (newEvents.length < limit) {
        setHasMore(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load events'));
    } finally {
      setLoading(false);
    }
  }, [filters.limit, loading]);

  const refresh = useCallback(() => {
    setEvents([]);
    setError(null);
    setHasMore(true);
    generatorRef.current = client.getEvents(filters);
    loadMore();
  }, [client, filters, loadMore]);

  // Initial load
  useEffect(() => {
    generatorRef.current = client.getEvents(filters);
    setLoading(true);
    setHasMore(true);

    const load = async () => {
      try {
        const initialEvents: Event[] = [];
        const limit = filters.limit ?? 50;

        for (let i = 0; i < limit; i++) {
          const result = await generatorRef.current!.next();
          if (result.done) {
            setHasMore(false);
            break;
          }
          initialEvents.push(result.value);
        }

        setEvents(initialEvents);
        if (initialEvents.length < limit) {
          setHasMore(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load events'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [client, JSON.stringify(filters)]);

  return { events, loading, error, hasMore, loadMore, refresh };
}

// =============================================================================
// Hook: useMetrics
// =============================================================================

interface UseMetricsResult {
  data: MetricsSummary | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook for fetching metrics summary with caching.
 *
 * Usage:
 * ```tsx
 * const { data, loading, error } = useMetrics({
 *   start_date: '2025-12-01',
 *   end_date: '2025-12-31',
 * });
 * ```
 */
export function useMetrics(params: MetricsParams): UseMetricsResult {
  const client = useAnalyticsClient();

  const [data, setData] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await client.getMetricsSummary(params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load metrics'));
    } finally {
      setLoading(false);
    }
  }, [client, JSON.stringify(params)]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { data, loading, error, refresh: fetchMetrics };
}

