'use client';

import React from 'react';
import { InsightsDashboard } from '@/components/analytics/InsightsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <InsightsDashboard />
    </div>
  );
}
