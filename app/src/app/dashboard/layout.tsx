
import { Suspense, type ReactNode } from 'react';
import DashboardClientLayout from '@/components/layout/DashboardClientLayout';
import { Loader2 } from 'lucide-react';

function DashboardLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-muted/40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardClientLayout>{children}</DashboardClientLayout>
    </Suspense>
  );
}
