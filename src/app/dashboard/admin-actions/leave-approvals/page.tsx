// src/app/dashboard/admin-actions/leave-approvals/page.tsx
'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import LeaveApprovalsClient from '@/components/dashboard/LeaveApprovalsClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import type { LeaveRequest } from '@/types/leave-request-types';

function PageSkeleton() {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6">
        <Card>
          <CardHeader><Skeleton className="h-7 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader>
          <CardContent><Skeleton className="h-64 w-full" /></CardContent>
        </Card>
      </div>
    );
}

export default function LeaveApprovalsPage() {
    const { currentUser } = useAuth();
    const [initialRequests, setInitialRequests] = useState<LeaveRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllRequests = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/leave-requests');
            if (!response.ok) {
                throw new Error("Failed to fetch leave requests");
            }
            const data: LeaveRequest[] = await response.json();
            setInitialRequests(data);
        } catch (error) {
            console.error(error);
            // Optionally show a toast or error message to the user
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentUser) {
            fetchAllRequests();
        }
    }, [currentUser, fetchAllRequests]);


    if (isLoading) {
        return <PageSkeleton />;
    }

    return (
        <LeaveApprovalsClient initialRequests={initialRequests} />
    );
}
