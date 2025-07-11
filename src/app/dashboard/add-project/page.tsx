// src/app/dashboard/add-project/page.tsx
'use client';

import AddProjectPageClient from '@/components/dashboard/AddProjectPageClient';

// This page is now a simple wrapper to keep the route clean.
// The actual form and logic are in the client component.
export default function AddProjectPage() {
  return <AddProjectPageClient />;
}
