// src/sdk/src/client.ts
// Core AnalyticsClient class for the SDK
// Implements event tracking with batching, cursor-based pagination, and metrics queries

import type {
  AnalyticsClientConfig,
  EventPayload,
  Event,
  EventFilters,
  EventsResponse,
  MetricsParams,
  MetricsSummary,
} from './types';

/**
 * Generate a unique idempotency key for event batches.
 * Uses timestamp + random string for uniqueness.
 */
function generateIdempotencyKey(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Analytics SDK Client
 *
 * Provides methods for:
 * - Event tracking with automatic batching
 * - Event querying with cursor-based pagination
 * - Metrics aggregation
 */
export class AnalyticsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly onError?: (error: Error) => void;
  private readonly flushInterval: number;
  private readonly maxBatchSize: number;

  private eventQueue: EventPayload[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: AnalyticsClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.onError = config.onError;
    this.flushInterval = config.flushInterval ?? 5000;
    this.maxBatchSize = config.maxBatchSize ?? 10;
  }

  /**
   * Track a single event with automatic batching.
   * Events are queued and flushed every N ms or when batch size is reached.
   */
  async trackEvent(event: EventPayload): Promise<void> {
    this.eventQueue.push(event);

    // Flush immediately if batch is full
    if (this.eventQueue.length >= this.maxBatchSize) {
      await this.flush();
      return;
    }

    // Schedule flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flush().catch(this.handleError.bind(this));
      }, this.flushInterval);
    }
  }

  /**
   * Track multiple events in a single batch with idempotency.
   */
  async trackEvents(events: EventPayload[]): Promise<void> {
    const idempotencyKey = generateIdempotencyKey();

    const response = await this.request<{ accepted: number }>('/api/v1/events', {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ events }),
    });

    // Response contains { accepted: number }
    if (!response.accepted) {
      throw new Error('Failed to ingest events');
    }
  }

  /**
   * Query events with auto-paginating async generator.
   * Yields events one page at a time, automatically fetching next pages.
   *
   * Usage:
   * ```
   * for await (const event of client.getEvents({ event_type: 'page_view' })) {
   *   console.log(event);
   * }
   * ```
   */
  async *getEvents(filters: EventFilters): AsyncGenerator<Event> {
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams();

      if (filters.user_id) params.set('user_id', filters.user_id);
      if (filters.event_type) params.set('event_type', filters.event_type);
      if (filters.start_date) params.set('start_date', filters.start_date);
      if (filters.end_date) params.set('end_date', filters.end_date);
      if (filters.limit) params.set('limit', filters.limit.toString());
      if (cursor) params.set('cursor', cursor);

      const response = await this.request<EventsResponse>(
        `/api/v1/events?${params.toString()}`
      );

      for (const event of response.data) {
        yield event;
      }

      cursor = response.cursor;
      hasMore = response.has_more;
    }
  }

  /**
   * Get metrics summary for the organization.
   */
  async getMetricsSummary(params: MetricsParams): Promise<MetricsSummary> {
    const queryParams = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
    });

    if (params.metrics) {
      params.metrics.forEach(m => queryParams.append('metrics', m));
    }

    return this.request<MetricsSummary>(
      `/api/v1/metrics/summary?${queryParams.toString()}`
    );
  }

  /**
   * Flush the event queue immediately.
   */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.eventQueue.length === 0) {
      return;
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    await this.trackEvents(events);
  }

  /**
   * Internal request helper with auth and error handling.
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private handleError(error: Error): void {
    if (this.onError) {
      this.onError(error);
    } else {
      console.error('[AnalyticsClient]', error);
    }
  }

  /**
   * Cleanup: flush remaining events and clear timers.
   */
  async destroy(): Promise<void> {
    await this.flush();
  }
}

