// src/app/api/auth/google/connect/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// This is the first step of the OAuth flow.
// It generates the consent screen URL and redirects the user to Google.
export async function GET(request: Request) {
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI) {
    console.error("Google OAuth environment variables are not set.");
    return NextResponse.json({ error: "Server configuration error for Google OAuth." }, { status: 500 });
  }

  // DEFER client instantiation until request time
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );

  // Define the scopes needed.
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Use 'consent' to ensure a refresh token is issued even on re-auth
    scope: scopes,
  });

  // Redirect the user to the generated URL.
  return NextResponse.redirect(authUrl);
}
