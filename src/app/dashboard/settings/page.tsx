// src/app/dashboard/settings/page.tsx
import React, { Suspense } from 'react';
import SettingsPageClient from '@/components/dashboard/SettingsPageClient';
import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui';

// This page is now a simple wrapper to keep the route clean.
// The actual form and logic are in the client component.
export default function SettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SettingsPageClient />
    </Suspense>
  );
}

function PageSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-1/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                </CardContent>
            </Card>
        </div>
    );
}
