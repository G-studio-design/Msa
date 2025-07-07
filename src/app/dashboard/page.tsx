'use server';
import React, { Suspense } from 'react';
import { getAllProjects } from '@/services/project-service';
import { getApprovedLeaveRequests } from '@/services/leave-request-service';
import { getAllHolidays } from '@/services/holiday-service';
import { getAllUsersForDisplay } from '@/services/user-service';
import { getTodaysAttendanceForAllUsers } from '@/services/attendance-service';
import { getAppSettings } from '@/services/settings-service';
import DashboardPageClient from '@/components/dashboard/DashboardPageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

// This is a React Server Component (RSC)
// It fetches data on the server and passes it to the client component.
export default async function DashboardPage() {

  // Fetch all necessary data in parallel on the server
  const [
    projects,
    leaveRequests,
    holidays,
    allUsers,
    todaysAttendance,
    settings,
  ] = await Promise.all([
    getAllProjects(),
    getApprovedLeaveRequests(),
    getAllHolidays(),
    getAllUsersForDisplay(),
    getTodaysAttendanceForAllUsers(),
    getAppSettings()
  ]);

  const initialData = {
    projects,
    leaveRequests,
    holidays,
    allUsers,
    todaysAttendance,
    attendanceEnabled: settings.feature_attendance_enabled,
  };

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageClient initialData={initialData} />
    </Suspense>
  );
}

// A skeleton component to show while the server component is rendering
function DashboardSkeleton() {
    return (
      <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Skeleton className="h-10 w-2/5" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-2/3" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
            <Card><CardHeader><Skeleton className="h-6 w-1/3 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-32 w-full" /></CardContent></Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card><CardHeader><Skeleton className="h-6 w-1/2 mb-2" /><Skeleton className="h-4 w-full" /></CardHeader><CardContent><Skeleton className="h-80 w-full" /></CardContent></Card>
          </div>
        </div>
      </div>
    );
}
