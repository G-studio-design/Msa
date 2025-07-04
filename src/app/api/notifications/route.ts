// src/app/api/notifications/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getNotificationsForUser } from '@/services/notification-service';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const notifications = await getNotificationsForUser(userId);
        return NextResponse.json(notifications);
    } catch (error) {
        console.error(`[API/Notifications] Failed to fetch notifications for user ${userId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
