import React, { Suspense } from 'react';
import AttendancePageClient from '@/components/dashboard/AttendancePageClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { isAttendanceFeatureEnabled, getAppSettings } from '@/services/settings-service';
import { getApprovedLeaveRequests } from '@/services/leave-request-service';
import { getAllHolidays } from '@/services/holiday-service';
import { getAttendanceForUser } from '@/services/attendance-service';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const [attendanceEnabled, settings, leaves, holidays] = await Promise.all([
        isAttendanceFeatureEnabled(),
        getAppSettings(),
        getApprovedLeaveRequests(),
        getAllHolidays()
    ]);

    const initialData = {
        attendanceEnabled,
        settings,
        leaves,
        holidays
    };

    return (
        <Suspense fallback={<PageSkeleton />}>
            <AttendancePageClient initialData={initialData} />
        </Suspense>
    );
}

function PageSkeleton() {
    return (
        <div className="container mx-auto py-4 px-4 md:px-6 space-y-6">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <div className="grid gap-6 md:grid-cols-2">
                <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-24 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        </div>
    );
}
