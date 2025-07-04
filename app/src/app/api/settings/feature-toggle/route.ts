// src/app/api/settings/feature-toggle/route.ts
import { NextResponse } from 'next/server';
import { setAttendanceFeatureEnabled } from '@/services/settings-service';

interface FeatureToggleRequest {
    feature: string;
    enabled: boolean;
}

export async function POST(request: Request) {
    try {
        const { feature, enabled }: FeatureToggleRequest = await request.json();

        if (feature !== 'attendance') {
            return NextResponse.json({ error: 'Invalid feature specified.' }, { status: 400 });
        }

        const updatedSettings = await setAttendanceFeatureEnabled(enabled);
        return NextResponse.json(updatedSettings);

    } catch (error: any) {
        console.error('[API/Settings/FeatureToggle] Error:', error);
        return NextResponse.json({ error: 'Failed to update feature setting.' }, { status: 500 });
    }
}
