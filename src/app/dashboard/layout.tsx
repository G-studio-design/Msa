// src/app/dashboard/layout.tsx
import type { ReactNode } from 'react';
import DashboardClientLayout from '@/components/layout/DashboardClientLayout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
