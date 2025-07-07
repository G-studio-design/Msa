
// src/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { updateUserProfile, deleteUser } from '@/services/user-service';
import type { UpdateProfileData } from '@/types/user-types';

export async function PUT(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const updateData = (await request.json()) as Omit<UpdateProfileData, 'userId'>;

    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    const updatedUser = await updateUserProfile({ userId, ...updateData });
    return NextResponse.json(updatedUser, { status: 200 });

  } catch (error: any) {
    console.error(`[API/Users PUT] Error updating user ${params.userId}:`, error);
    let errorMessage = 'Failed to update user.';
    let statusCode = 500;
     if (error.message === 'USER_NOT_FOUND') {
        errorMessage = 'User not found.';
        statusCode = 404;
    } else if (error.message === 'USERNAME_EXISTS' || error.message === 'EMAIL_EXISTS') {
        errorMessage = error.message;
        statusCode = 409;
    } else if (error.message.includes('ROLE')) {
        errorMessage = error.message;
        statusCode = 403;
    }
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}


export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    if (!userId) {
      return NextResponse.json({ message: 'User ID is required.' }, { status: 400 });
    }

    await deleteUser(userId);
    return NextResponse.json({ message: 'User deleted successfully.' }, { status: 200 });

  } catch (error: any) {
    console.error(`[API/Users DELETE] Error deleting user ${params.userId}:`, error);
    let errorMessage = 'Failed to delete user.';
    let statusCode = 500;
    if (error.message === 'USER_NOT_FOUND') {
        errorMessage = 'User not found.';
        statusCode = 404;
    } else if (error.message.includes('CANNOT_DELETE')) {
        errorMessage = error.message;
        statusCode = 403;
    }
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
