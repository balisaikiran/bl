// src/app/components/AnalyticsWrapper.tsx
// Client-side wrapper for Analytics SDK provider

'use client';

import { ReactNode } from 'react';
// TODO: Import from actual SDK package once installed
// import { AnalyticsProvider } from '@acme/analytics-sdk';

// Temporary stub until SDK is linked
import { AnalyticsProvider } from './sdk-stub';

interface AnalyticsWrapperProps {
  children: ReactNode;
}

export function AnalyticsWrapper({ children }: AnalyticsWrapperProps) {
  // TODO: Load these from environment variables
  const config = {
    apiKey: process.env.NEXT_PUBLIC_ANALYTICS_API_KEY || 'dev-api-key',
    baseUrl: process.env.NEXT_PUBLIC_ANALYTICS_API_URL || 'http://localhost:8000',
    onError: (error: Error) => {
      console.error('[Analytics SDK Error]', error);
    },
  };

  return (
    <AnalyticsProvider config={config}>
      {children}
    </AnalyticsProvider>
  );
}

