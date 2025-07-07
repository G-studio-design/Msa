
// src/app/api/leave-requests/[requestId]/approve/route.ts
import { NextResponse } from 'next/server';
import { approveLeaveRequest } from '@/services/leave-request-service';
import type { LeaveRequest } from '@/types/leave-request-types';

interface ApproveRequest {
    approverUserId: string;
    approverUsername: string;
}

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId;
    const { approverUserId, approverUsername }: ApproveRequest = await request.json();

    if (!requestId || !approverUserId || !approverUsername) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    
    const updatedRequest = await approveLeaveRequest(requestId, approverUserId, approverUsername);

    if (!updatedRequest) {
        return NextResponse.json({ error: 'Leave request not found or could not be approved.' }, { status: 404 });
    }
    
    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error(`[API] Error approving leave request ${params.requestId}:`, error);
    return NextResponse.json({ error: 'Failed to approve leave request.' }, { status: 500 });
  }
}
