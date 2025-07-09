
// src/app/dashboard/leave-request/new/page.tsx
import React from 'react';
import NewLeaveRequestPageClient from '@/components/dashboard/NewLeaveRequestPageClient';

// This page is now a simple wrapper to keep the route clean.
// The actual form and logic are in the client component.
export default function NewLeaveRequestPage() {
  return <NewLeaveRequestPageClient />;
}
