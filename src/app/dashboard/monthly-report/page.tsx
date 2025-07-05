// src/app/dashboard/monthly-report/page.tsx
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import MonthlyReportClient from '@/components/dashboard/MonthlyReportClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Project } from '@/types/project-types';
import { useAuth } from '@/context/AuthContext';

function PageSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
            <Card>
                <CardHeader><Skeleton className="h-8 w-2/5 mb-2" /><Skeleton className="h-4 w-3/5" /></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
                    <Skeleton className="h-10 w-40" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><Skeleton className="h-7 w-1/3" /></CardHeader>
                <CardContent><Skeleton className="h-64 w-full" /></CardContent>
            </Card>
        </div>
    );
}

export default function MonthlyReportPage() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
      setIsLoading(true);
      try {
          const response = await fetch('/api/projects');
          if (!response.ok) {
              throw new Error("Failed to fetch projects");
          }
          const data = await response.json();
          setProjects(data);
      } catch (error) {
          console.error(error);
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
      if (currentUser) {
          fetchProjects();
      }
  }, [currentUser, fetchProjects]);

  if (isLoading) {
      return <PageSkeleton />;
  }

  return (
    <MonthlyReportClient initialProjects={projects} />
  );
}
