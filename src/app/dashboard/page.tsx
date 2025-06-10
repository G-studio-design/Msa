
// src/app/dashboard/page.tsx
'use client';

import React from 'react';

export default function DashboardPage() {
  console.log('[DashboardPage] MINIMAL COMPONENT RENDERED - TESTING');

  React.useEffect(() => {
    console.log('[DashboardPage] MINIMAL useEffect TRIGGERED - TESTING');
  }, []);

  return (
    <div className="container mx-auto py-4 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-primary">
        Minimal Dashboard Page Test
      </h1>
      <p>If you see this, the DashboardPage component is rendering.</p>
      <p>Check the browser console for "[DashboardPage] MINIMAL COMPONENT RENDERED - TESTING" and "[DashboardPage] MINIMAL useEffect TRIGGERED - TESTING".</p>
    </div>
  );
}
