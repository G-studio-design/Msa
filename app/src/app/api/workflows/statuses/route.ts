// src/app/api/workflows/statuses/route.ts
import { NextResponse } from 'next/server';
import { getAllUniqueStatuses } from '@/services/workflow-service';

export async function GET(request: Request) {
    try {
        const statuses = await getAllUniqueStatuses();
        return NextResponse.json(statuses);
    } catch (error: any) {
        console.error('[API/Workflows/Statuses GET] Error:', error);
        return NextResponse.json({ message: "Failed to fetch workflow statuses." }, { status: 500 });
    }
}
