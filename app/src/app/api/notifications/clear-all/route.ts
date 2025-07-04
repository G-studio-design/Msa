// src/app/api/notifications/clear-all/route.ts
'use server';

import { NextResponse } from 'next/server';
import { clearAllNotifications as clearNotificationsService } from '@/services/notification-service';
import { findUserById } from '@/services/user-service'; // Assuming you might want to protect this endpoint

// Note: You might want to add authentication/authorization checks here
// to ensure only authorized users can perform this action.
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const user = await findUserById(userId);
        if (!user || !['Owner', 'Admin Developer'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await clearNotificationsService();
        return NextResponse.json({ success: true, message: 'All notifications cleared.' });

    } catch (error: any) {
        console.error('[API/ClearAllNotifications] Error:', error);
        return NextResponse.json({ error: 'Failed to clear all notifications.' }, { status: 500 });
    }
}
