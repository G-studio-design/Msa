
// src/app/api/attendance/check-out/route.ts
import { NextResponse } from 'next/server';
import { checkOut } from '@/services/attendance-service';

interface CheckOutRequest {
    userId: string;
    reason: 'Normal' | 'Survei' | 'Sidang';
}

export async function POST(request: Request) {
  try {
    const { userId, reason }: CheckOutRequest = await request.json();

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const result = await checkOut(userId, reason);

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json(result.record, { status: 200 });

  } catch (error: any) {
    console.error('[API/CheckOut] Error:', error);
    return NextResponse.json({ error: 'An unexpected server error occurred during check-out.' }, { status: 500 });
  }
}
