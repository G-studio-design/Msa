// src/app/dashboard/leave-request/new/page.tsx
import React, { Suspense } from 'react';
import NewLeaveRequestPageClient from '@/components/dashboard/NewLeaveRequestPageClient';
import { Card, CardContent, CardHeader, Skeleton } from '@/components/ui';


// This page is now a simple wrapper to keep the route clean.
// The actual form and logic are in the client component.
export default function NewLeaveRequestPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
        <NewLeaveRequestPageClient />
    </Suspense>
  );
}

function PageSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
