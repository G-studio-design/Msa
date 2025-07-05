// src/app/dashboard/admin-actions/workflows/page.tsx
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import WorkflowsPageClient from '@/components/dashboard/WorkflowsPageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Workflow } from '@/types/workflow-types';
import { useAuth } from '@/context/AuthContext';

function PageSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
            <Card>
                <CardHeader><Skeleton className="h-7 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader>
                <CardContent><Skeleton className="h-40 w-full" /></CardContent>
            </Card>
        </div>
    );
}

export default function ManageWorkflowsPage() {
  const { currentUser } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
      setIsLoading(true);
      try {
          const response = await fetch('/api/workflows');
          if (!response.ok) {
              throw new Error("Failed to fetch workflows");
          }
          const data = await response.json();
          setWorkflows(data);
      } catch (error) {
          console.error(error);
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
    if (currentUser) {
        fetchWorkflows();
    }
  }, [currentUser, fetchWorkflows]);

  if (isLoading) {
      return <PageSkeleton />;
  }

  return <WorkflowsPageClient initialWorkflows={workflows} />;
}
