
// src/app/api/auth/google/disconnect/route.ts
import { NextResponse } from 'next/server';
import { clearUserGoogleTokens } from '@/services/user-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId } = body as { userId: string };

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    console.log(`[API/GoogleDisconnect] Received request to disconnect Google account for user ID: ${userId}`);
    const updatedUser = await clearUserGoogleTokens(userId);

    if (!updatedUser) {
        return NextResponse.json({ error: 'User not found or failed to update.' }, { status: 404 });
    }

    return NextResponse.json({ 
        message: 'Google account disconnected successfully.',
        user: updatedUser // Return the updated user object without tokens
    });

  } catch (error: any) {
    console.error('[API/GoogleDisconnect] Error disconnecting Google account:', error.message);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to disconnect Google account.', details: errorMessage }, { status: 500 });
  }
}
