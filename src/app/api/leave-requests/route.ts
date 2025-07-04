// src/app/api/leave-requests/route.ts
import { NextResponse } from 'next/server';
import { addLeaveRequest } from '@/services/leave-request-service';
import type { AddLeaveRequestData } from '@/types/leave-request-types';

export async function POST(request: Request) {
  try {
    const leaveData: AddLeaveRequestData = await request.json();
    
    if (!leaveData.userId || !leaveData.username || !leaveData.leaveType || !leaveData.startDate || !leaveData.endDate || !leaveData.reason) {
        return NextResponse.json({ error: 'Missing required fields for leave request.' }, { status: 400 });
    }

    const newRequest = await addLeaveRequest(leaveData);
    
    return NextResponse.json(newRequest, { status: 201 });

  } catch (error: any) {
    console.error('[API/LeaveRequests] Error creating leave request:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
