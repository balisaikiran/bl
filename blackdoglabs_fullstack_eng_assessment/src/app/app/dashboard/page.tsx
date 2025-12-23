// src/app/app/dashboard/page.tsx
// Dashboard page demonstrating SDK usage
// - Metrics summary card using useMetrics
// - Events list with infinite scroll using useEvents
// - Filter dropdown by event_type

'use client';

import { useState } from 'react';
import { useMetrics, useEvents } from '../../components/sdk-stub';
import { EventsTable } from '../../components/EventsTable';
import { MetricsCard } from '../../components/MetricsCard';

// Get date range for last 30 days
function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0],
  };
}

export default function DashboardPage() {
  const { start_date, end_date } = getDefaultDateRange();
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('');

  // Fetch metrics using SDK hook
  const { data: metrics, loading: metricsLoading, error: metricsError } = useMetrics({
    start_date,
    end_date,
  });

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Viewing data from {start_date} to {end_date}
        </p>
      </header>

      {/* Metrics Summary Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Metrics Summary</h2>
        <MetricsCard
          data={metrics}
          loading={metricsLoading}
          error={metricsError}
        />
      </section>

      {/* Events Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Events</h2>

          {/* Event Type Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="event-type" className="text-sm text-gray-600">
              Filter by type:
            </label>
            <select
              id="event-type"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">All events</option>
              <option value="page_view">Page View</option>
              <option value="button_click">Button Click</option>
              <option value="feature_used">Feature Used</option>
              <option value="api_call">API Call</option>
            </select>
          </div>
        </div>

        {/* Events Table with Infinite Scroll */}
        <EventsTable
          event_type={eventTypeFilter || undefined}
          start_date={start_date}
          end_date={end_date}
        />
      </section>
    </div>
  );
}

