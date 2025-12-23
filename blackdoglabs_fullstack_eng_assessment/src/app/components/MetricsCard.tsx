// src/app/components/MetricsCard.tsx
// Metrics summary card component

'use client';

import type { MetricsSummary } from './sdk-stub';

interface MetricsCardProps {
  data: MetricsSummary | null;
  loading: boolean;
  error: Error | null;
}

/**
 * MetricsCard - Display aggregated metrics in a card format
 */
export function MetricsCard({ data, loading, error }: MetricsCardProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-800 font-medium">Failed to load metrics</p>
        <p className="text-red-600 text-sm mt-1">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (!data || Object.keys(data.totals).length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600">No metrics available</p>
      </div>
    );
  }

  // Format metric names for display
  const formatMetricName = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format large numbers
  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const metricEntries = Object.entries(data.totals);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metricEntries.map(([name, value]) => (
        <div
          key={name}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-sm transition-shadow"
        >
          <p className="text-sm font-medium text-gray-500">
            {formatMetricName(name)}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {formatValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

