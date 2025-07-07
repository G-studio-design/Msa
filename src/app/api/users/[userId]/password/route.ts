
// src/app/api/users/[userId]/password/route.ts
import { NextResponse } from 'next/server';
import { updatePassword } from '@/services/user-service';
import type { UpdatePasswordData } from '@/types/user-types';

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const { currentPassword, newPassword } = (await request.json()) as Omit<UpdatePasswordData, 'userId'>;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }
    if (!newPassword) {
      return NextResponse.json({ message: 'New password is required.' }, { status: 400 });
    }

    // The service function will handle checking the current password if provided
    await updatePassword({ userId, currentPassword, newPassword });
    
    return NextResponse.json({ message: 'Password updated successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error(`[API/Users/Password] Error updating password for user ${params.userId}:`, error);
    let errorMessage = 'Failed to update password.';
    let statusCode = 500;
    if (error.message === 'USER_NOT_FOUND') {
        errorMessage = 'User not found.';
        statusCode = 404;
    } else if (error.message === 'PASSWORD_MISMATCH') {
        errorMessage = 'Current password does not match.';
        statusCode = 400;
    }
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
