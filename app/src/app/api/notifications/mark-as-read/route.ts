
// src/app/api/notifications/mark-as-read/route.ts
import { NextResponse } from 'next/server';
import { markNotificationAsRead as markAsReadService } from '@/services/notification-service';

export async function POST(request: Request) {
    try {
        const { notificationId } = await request.json();

        if (!notificationId) {
            return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
        }

        await markAsReadService(notificationId);
        
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[API/MarkAsRead] Error:', error);
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
    }
}
