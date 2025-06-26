// src/app/api/notify-division/route.ts
import { NextResponse } from 'next/server';
import { notifyUsersByRole } from '@/services/notification-service';
import { findUserById } from '@/services/user-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, projectName, actorUserId, divisionToNotify } = body as {
            projectId: string;
            projectName: string;
            actorUserId: string;
            divisionToNotify: 'Arsitek' | 'Struktur' | 'MEP';
        };

        if (!projectId || !projectName || !actorUserId || !divisionToNotify) {
            return NextResponse.json({ error: 'Missing required fields for notification.' }, { status: 400 });
        }
        
        const actor = await findUserById(actorUserId);
        if (!actor || !['Admin Proyek', 'Owner', 'Admin Developer'].includes(actor.role)) {
             return NextResponse.json({ error: 'Unauthorized to send revision notifications.' }, { status: 403 });
        }

        const message = `Divisi ${divisionToNotify} telah dinotifikasi untuk berkontribusi pada revisi proyek "${projectName}" oleh ${actor.username}.`;
        await notifyUsersByRole(divisionToNotify, message, projectId);
        
        console.log(`[API/NotifyDivision] Notification sent to role ${divisionToNotify} for project ${projectId}.`);

        return NextResponse.json({ success: true, message: `Notification sent to ${divisionToNotify}.` });

    } catch (error: any) {
        console.error('[API/NotifyDivision] Error:', error);
        return NextResponse.json({ error: 'Failed to send notification.' }, { status: 500 });
    }
}
