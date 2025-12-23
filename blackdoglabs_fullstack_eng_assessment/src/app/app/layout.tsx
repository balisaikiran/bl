// src/app/app/layout.tsx
// Root layout with Analytics SDK provider

import type { Metadata } from 'next';
import './globals.css';
import { AnalyticsWrapper } from '../components/AnalyticsWrapper';

export const metadata: Metadata = {
  title: 'Analytics Dashboard',
  description: 'Customer analytics platform dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsWrapper>
          {children}
        </AnalyticsWrapper>
      </body>
    </html>
  );
}

