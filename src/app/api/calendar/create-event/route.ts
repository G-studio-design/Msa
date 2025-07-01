// src/app/api/calendar/create-event/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { findUserById, updateUserGoogleTokens } from '@/services/user-service';
import type { CalendarEvent } from '@/services/google-calendar'; // Assuming this type is defined

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI // Though not directly used for redirect here, it's part of client setup
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, eventDetails } = body as { userId: string; eventDetails: CalendarEvent };

    if (!userId || !eventDetails) {
      return NextResponse.json({ error: 'Missing userId or eventDetails' }, { status: 400 });
    }

    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.googleRefreshToken && !user.googleAccessToken) {
      return NextResponse.json({ error: 'User has not linked their Google Calendar account or tokens are missing.' }, { status: 403 });
    }

    oauth2Client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      // scope, token_type, expiry_date are also available on tokens obj from getToken
    });
    
    // Check if access token is expired or about to expire (e.g., within 5 minutes)
    const fiveMinutesInMs = 5 * 60 * 1000;
    if (user.googleAccessTokenExpiresAt && user.googleAccessTokenExpiresAt < (Date.now() + fiveMinutesInMs)) {
        if (user.googleRefreshToken) {
            console.log(`Access token for user ${userId} expired or expiring soon. Refreshing...`);
            try {
                const { credentials } = await oauth2Client.refreshAccessToken();
                oauth2Client.setCredentials(credentials);
                // Update the stored tokens for the user
                await updateUserGoogleTokens(userId, {
                    accessToken: credentials.access_token!,
                    refreshToken: credentials.refresh_token || user.googleRefreshToken, // Google might not always return a new refresh token
                    accessTokenExpiresAt: credentials.expiry_date || (Date.now() + (3600 * 1000)),
                });
                console.log(`Access token refreshed and updated for user ${userId}.`);
            } catch (refreshError: any) {
                 console.error(`Failed to refresh access token for user ${userId}:`, refreshError.message);
                 // If refresh fails (e.g., refresh token revoked), user needs to re-authenticate
                 return NextResponse.json({ error: 'Failed to refresh Google access token. Please re-link your Google account.', details: refreshError.message }, { status: 401 });
            }
        } else {
            console.warn(`Access token for user ${userId} is expired, but no refresh token is available. User needs to re-authenticate.`);
            return NextResponse.json({ error: 'Google access token is expired, and no refresh token is available. Please re-link your Google account.' }, { status: 401 });
        }
    }


    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const event = {
      summary: eventDetails.title,
      location: eventDetails.location,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startTime, // e.g., '2024-08-15T09:00:00-07:00'
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Or a specific timezone
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      // attendees: [{ email: 'user@example.com' }], // Optional: add attendees
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 },      // 30 minutes before
        ],
      },
    };

    const createdEvent = await calendar.events.insert({
      calendarId: 'primary', // Use 'primary' for the user's main calendar
      requestBody: event,
    });

    console.log('Google Calendar event created:', createdEvent.data.id, createdEvent.data.htmlLink);
    return NextResponse.json({ 
        message: 'Event created successfully in Google Calendar!', 
        eventId: createdEvent.data.id,
        eventUrl: createdEvent.data.htmlLink 
    });

  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.message, error.stack);
    let detail = error.message;
    if (error.response && error.response.data && error.response.data.error) {
        detail = error.response.data.error.message || error.response.data.error;
    }
    return NextResponse.json({ error: 'Failed to create Google Calendar event.', details: detail }, { status: 500 });
  }
}
