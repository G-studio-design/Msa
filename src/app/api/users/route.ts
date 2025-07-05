// src/app/api/users/route.ts
'use server';

import { NextResponse } from 'next/server';
import { addUser, getAllUsersForDisplay } from '@/services/user-service';
import type { AddUserData } from '@/types/user-types';

export async function POST(request: Request) {
  try {
    const userData = (await request.json()) as AddUserData;
    if (!userData.username || !userData.password || !userData.role) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }
    const newUser = await addUser(userData);
    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error('[API/Users POST] Error:', error);
    let errorMessage = 'Failed to add user.';
    let statusCode = 500;
    if (error.message === 'USERNAME_EXISTS') {
        errorMessage = 'Username already exists.';
        statusCode = 409;
    } else if (error.message === 'EMAIL_EXISTS') {
        errorMessage = 'Email already exists.';
        statusCode = 409;
    } else if (error.message === 'INVALID_ROLE_CREATION_ATTEMPT') {
        errorMessage = 'Invalid role creation attempt.';
        statusCode = 403;
    }
    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}

export async function GET(request: Request) {
    try {
        const users = await getAllUsersForDisplay();
        return NextResponse.json(users);
    } catch (error) {
        console.error('[API/Users GET] Error:', error);
        return NextResponse.json({ message: "Failed to fetch users." }, { status: 500 });
    }
}
