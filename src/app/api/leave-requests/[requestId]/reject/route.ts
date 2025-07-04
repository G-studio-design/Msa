// src/app/api/leave-requests/[requestId]/reject/route.ts
import { NextResponse } from 'next/server';
import { rejectLeaveRequest } from '@/services/leave-request-service';
import type { LeaveRequest } from '@/types/leave-request-types';

interface RejectRequest {
    rejectorUserId: string;
    rejectorUsername: string;
    rejectionReason: string;
}

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId;
    const { rejectorUserId, rejectorUsername, rejectionReason }: RejectRequest = await request.json();

    if (!requestId || !rejectorUserId || !rejectorUsername || !rejectionReason) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    
    const updatedRequest = await rejectLeaveRequest(requestId, rejectorUserId, rejectorUsername, rejectionReason);

    if (!updatedRequest) {
        return NextResponse.json({ error: 'Leave request not found or could not be rejected.' }, { status: 404 });
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error(`[API] Error rejecting leave request ${params.requestId}:`, error);
    return NextResponse.json({ error: 'Failed to reject leave request.' }, { status: 500 });
  }
}
