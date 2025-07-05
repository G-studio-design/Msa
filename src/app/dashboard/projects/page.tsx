// src/app/dashboard/projects/page.tsx
'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import ProjectsPageClient from '@/components/dashboard/ProjectsPageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import type { Project } from '@/types/project-types';

function ProjectsSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
            <Card className="shadow-md animate-pulse">
                <CardHeader className="p-4 sm:p-6"><Skeleton className="h-7 w-3/5 mb-2" /><Skeleton className="h-4 w-4/5" /></CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="flex justify-end mb-4"><Skeleton className="h-10 w-32" /></div>
                    <div className="space-y-4">{[...Array(3)].map((_, i) => (<Card key={`project-skel-${i}`} className="opacity-50 border-muted/50"><CardHeader className="flex flex-col sm:flex-row items-start justify-between space-y-2 sm:space-y-0 pb-2 p-4 sm:p-6"><div><Skeleton className="h-5 w-3/5 mb-1" /><Skeleton className="h-3 w-4/5" /></div><div className="flex-shrink-0 mt-2 sm:mt-0"><Skeleton className="h-5 w-20 rounded-full" /></div></CardHeader><CardContent className="p-4 sm:p-6 pt-0"><div className="flex items-center gap-2"><Skeleton className="flex-1 h-2" /><Skeleton className="h-3 w-1/4" /></div></CardContent></Card>))}</div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ProjectsPage() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
            throw new Error('Failed to fetch projects');
        }
        const data: Project[] = await response.json();
        setProjects(data);
    } catch (error) {
        console.error(error);
        // Optionally show a toast or error message to the user
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if(currentUser) {
        fetchProjects();
    }
  }, [currentUser, fetchProjects]);

  if (isLoading) {
      return <ProjectsSkeleton />;
  }

  return (
    <ProjectsPageClient initialProjects={projects} />
  );
}
