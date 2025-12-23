// src/app/components/EventsTable.tsx
// Pre-built component for displaying events with infinite scroll
// Drop-in ready for other teams to use

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEvents, type EventFilters, type Event } from './sdk-stub';

interface EventsTableProps {
  /** Filter by organization ID (optional, uses auth context by default) */
  org_id?: string;
  /** Filter by event type */
  event_type?: string;
  /** Start date for filtering (ISO 8601) */
  start_date?: string;
  /** End date for filtering (ISO 8601) */
  end_date?: string;
  /** Number of events to load per page */
  pageSize?: number;
  /** Custom class name for the container */
  className?: string;
}

/**
 * EventsTable - A drop-in component for displaying events with infinite scroll
 *
 * Features:
 * - Uses SDK hooks internally for data fetching
 * - Handles loading, error, and empty states
 * - Supports infinite scroll pagination
 * - Accepts filter props for customization
 *
 * Usage:
 * ```tsx
 * <EventsTable event_type="page_view" start_date="2025-01-01" />
 * ```
 */
export function EventsTable({
  org_id,
  event_type,
  start_date,
  end_date,
  pageSize = 20,
  className = '',
}: EventsTableProps) {
  const filters: EventFilters = {
    event_type,
    start_date,
    end_date,
    limit: pageSize,
  };

  const { events, loading, error, hasMore, loadMore } = useEvents(filters);

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading) {
        loadMore();
      }
    },
    [hasMore, loading, loadMore]
  );

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  // Error state
  if (error) {
    return (
      <div className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}>
        <p className="text-red-800 font-medium">Failed to load events</p>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  // Empty state (after loading)
  if (!loading && events.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-gray-50 p-8 text-center ${className}`}>
        <p className="text-gray-600">No events found</p>
        <p className="text-gray-500 text-sm mt-1">
          {event_type ? `No "${event_type}" events in the selected date range.` : 'No events in the selected date range.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Event Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              User
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Properties
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timestamp
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {events.map((event) => (
            <EventRow key={event.event_id} event={event} />
          ))}
        </tbody>
      </table>

      {/* Loading state / Infinite scroll trigger */}
      <div ref={loadMoreRef} className="p-4 text-center">
        {loading && (
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <LoadingSpinner />
            <span>Loading events...</span>
          </div>
        )}
        {!loading && hasMore && (
          <button
            onClick={loadMore}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Load more
          </button>
        )}
        {!loading && !hasMore && events.length > 0 && (
          <p className="text-gray-400 text-sm">No more events</p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function EventRow({ event }: { event: Event }) {
  const formattedTime = new Date(event.timestamp).toLocaleString();
  const propertiesPreview = Object.entries(event.properties)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(', ');

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {event.event_type}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
        {event.user_id}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
        {propertiesPreview || '-'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {formattedTime}
      </td>
    </tr>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 text-gray-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

