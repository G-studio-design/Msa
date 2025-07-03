// src/app/dashboard/layout.tsx
import type { ReactNode } from 'react';
import DashboardClientLayout from '@/components/layout/DashboardClientLayout';

// This is a Server Component by default in the App Router.
// It imports and wraps the client-side layout component.
// This is a more robust pattern that avoids potential build issues.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
