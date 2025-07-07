
// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { verifyUserCredentials } from '@/services/user-service';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
    }

    const user = await verifyUserCredentials(username, password);

    if (user) {
      // Return user data without the password
      const { password, ...userToReturn } = user;
      return NextResponse.json(userToReturn);
    } else {
      return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 });
    }
  } catch (error) {
    console.error('[API/Login] Error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during login.' }, { status: 500 });
  }
}
