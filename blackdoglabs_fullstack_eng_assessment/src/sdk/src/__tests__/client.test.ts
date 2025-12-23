// src/sdk/src/__tests__/client.test.ts
// Tests for the AnalyticsClient class

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnalyticsClient } from '../client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AnalyticsClient', () => {
  let client: AnalyticsClient;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    client = new AnalyticsClient({
      apiKey: 'test-api-key',
      baseUrl: 'http://localhost:8000',
      flushInterval: 1000,
      maxBatchSize: 3,
    });
  });

  afterEach(async () => {
    await client.destroy();
    vi.useRealTimers();
  });

  describe('batching', () => {
    it('should queue events and flush after interval', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accepted: 2 }),
      });

      // Track two events (below batch size)
      await client.trackEvent({ event_type: 'test1', user_id: 'u001' });
      await client.trackEvent({ event_type: 'test2', user_id: 'u001' });

      // Should not have flushed yet
      expect(mockFetch).not.toHaveBeenCalled();

      // Advance timer past flush interval
      await vi.advanceTimersByTimeAsync(1100);

      // Should have flushed
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('http://localhost:8000/api/v1/events');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.events).toHaveLength(2);
    });

    it('should flush immediately when batch size is reached', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accepted: 3 }),
      });

      // Track three events (equals batch size)
      await client.trackEvent({ event_type: 'test1', user_id: 'u001' });
      await client.trackEvent({ event_type: 'test2', user_id: 'u001' });
      await client.trackEvent({ event_type: 'test3', user_id: 'u001' });

      // Should have flushed immediately
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.events).toHaveLength(3);
    });

    it('should include idempotency key in batch requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accepted: 1 }),
      });

      await client.trackEvents([{ event_type: 'test', user_id: 'u001' }]);

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-Idempotency-Key']).toBeDefined();
      expect(typeof headers['X-Idempotency-Key']).toBe('string');
    });
  });

  describe('cursor iteration', () => {
    it('should iterate through pages using cursor', async () => {
      // First page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { event_id: 'e1', event_type: 'test', user_id: 'u001', org_id: 'org001', properties: {}, timestamp: '2025-01-01T00:00:00Z' },
            { event_id: 'e2', event_type: 'test', user_id: 'u001', org_id: 'org001', properties: {}, timestamp: '2025-01-01T00:01:00Z' },
          ],
          cursor: 'cursor-page-2',
          has_more: true,
        }),
      });

      // Second page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { event_id: 'e3', event_type: 'test', user_id: 'u001', org_id: 'org001', properties: {}, timestamp: '2025-01-01T00:02:00Z' },
          ],
          cursor: null,
          has_more: false,
        }),
      });

      const events = [];
      for await (const event of client.getEvents({ limit: 2 })) {
        events.push(event);
      }

      expect(events).toHaveLength(3);
      expect(events[0].event_id).toBe('e1');
      expect(events[2].event_id).toBe('e3');

      // Should have made two requests
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second request should include cursor
      const secondUrl = mockFetch.mock.calls[1][0];
      expect(secondUrl).toContain('cursor=cursor-page-2');
    });

    it('should stop iteration when has_more is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { event_id: 'e1', event_type: 'test', user_id: 'u001', org_id: 'org001', properties: {}, timestamp: '2025-01-01T00:00:00Z' },
          ],
          cursor: null,
          has_more: false,
        }),
      });

      const events = [];
      for await (const event of client.getEvents({})) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('auth', () => {
    it('should include Authorization header with API key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], totals: {} }),
      });

      await client.getMetricsSummary({
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer test-api-key');
    });
  });

  describe('error handling', () => {
    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      });

      await expect(
        client.getMetricsSummary({ start_date: '2025-01-01', end_date: '2025-01-31' })
      ).rejects.toThrow('Unauthorized');
    });

    it('should call onError handler when provided', async () => {
      const onError = vi.fn();
      const errorClient = new AnalyticsClient({
        apiKey: 'test',
        baseUrl: 'http://localhost:8000',
        onError,
        flushInterval: 100,
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await errorClient.trackEvent({ event_type: 'test', user_id: 'u001' });
      await vi.advanceTimersByTimeAsync(200);

      expect(onError).toHaveBeenCalled();
      await errorClient.destroy();
    });
  });
});

