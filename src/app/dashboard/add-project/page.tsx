// src/app/dashboard/add-project/page.tsx
'use client';

import React, { Suspense } from 'react';
import AddProjectPageClient from '@/components/dashboard/AddProjectPageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// This page is now a simple wrapper to keep the route clean.
// The actual form and logic are in the client component.
export default function AddProjectPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AddProjectPageClient />
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
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
