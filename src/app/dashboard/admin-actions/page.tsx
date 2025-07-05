// src/app/dashboard/admin-actions/page.tsx
'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import AdminActionsClient from '@/components/dashboard/AdminActionsClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Project } from '@/types/project-types';
import type { AppSettings } from '@/services/settings-service';
import { useAuth } from '@/context/AuthContext';

function PageSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
           <Card>
              <CardHeader>
                <Skeleton className="h-7 w-3/5 mb-2" />
                <Skeleton className="h-4 w-4/5" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
           </Card>
       </div>
   );
}

interface InitialData {
    projects: Project[];
    availableStatuses: string[];
    appSettings: AppSettings;
}

export default function AdminActionsPage() {
    const { currentUser } = useAuth();
    const [initialData, setInitialData] = useState<InitialData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [projectsRes, statusesRes, settingsRes] = await Promise.all([
                fetch('/api/projects'),
                fetch('/api/workflows/statuses'),
                fetch('/api/settings'),
            ]);

            if (!projectsRes.ok || !statusesRes.ok || !settingsRes.ok) {
                throw new Error("Failed to fetch initial admin data");
            }
            
            const [projects, availableStatuses, appSettings] = await Promise.all([
                projectsRes.json(),
                statusesRes.json(),
                settingsRes.json(),
            ]);

            setInitialData({ projects, availableStatuses, appSettings });
        } catch (error) {
            console.error(error);
            // Handle error, maybe show a toast
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser, fetchData]);

    if (isLoading || !initialData) {
        return <PageSkeleton />;
    }

    return (
        <AdminActionsClient initialData={initialData} />
    );
}
