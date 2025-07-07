
// src/app/api/settings/feature-toggle/route.ts
import { NextResponse } from 'next/server';
import { setAttendanceFeatureEnabled } from '@/services/settings-service';

interface FeatureToggleRequest {
    enabled: boolean;
}

export async function POST(request: Request) {
    try {
        const { enabled }: FeatureToggleRequest = await request.json();

        const updatedSettings = await setAttendanceFeatureEnabled(enabled);
        return NextResponse.json(updatedSettings);

    } catch (error: any) {
        console.error('[API/Settings/FeatureToggle] Error:', error);
        return NextResponse.json({ error: 'Failed to update feature setting.' }, { status: 500 });
    }
}
