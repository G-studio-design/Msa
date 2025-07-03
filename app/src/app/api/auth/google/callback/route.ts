// src/app/api/auth/google/callback/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { findUserByEmail, updateUserGoogleTokens, addUser } from '@/services/user-service'; // Assuming addUser might be needed

export async function GET(request: Request) {
  // DEFER client instantiation until request time
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Google OAuth Error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?error=google_oauth_failed', request.url));
  }

  if (!code) {
    console.error('Google OAuth: No code received.');
    return NextResponse.redirect(new URL('/dashboard/settings?error=google_no_code', request.url));
  }

  try {
    console.log('Exchanging Google OAuth code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('Tokens received:', {
        accessToken: tokens.access_token ? 'RECEIVED' : 'NOT RECEIVED',
        refreshToken: tokens.refresh_token ? 'RECEIVED' : 'NOT RECEIVED',
        expiresAt: tokens.expiry_date,
    });


    if (!tokens.access_token) {
        console.error('Google OAuth: No access token received.');
        return NextResponse.redirect(new URL('/dashboard/settings?error=google_no_access_token', request.url));
    }
    
    oauth2Client.setCredentials(tokens);

    // Get user profile information (especially email)
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;
    const googleDisplayName = userInfo.data.name;
    const googleProfilePicture = userInfo.data.picture;


    if (!email) {
      console.error('Google OAuth: Could not retrieve email from Google profile.');
      return NextResponse.redirect(new URL('/dashboard/settings?error=google_no_email', request.url));
    }

    // Try to find an existing user by email
    let user = await findUserByEmail(email);

    if (user) {
      // User exists, update their tokens
      console.log(`Google OAuth: User found with email ${email}. User ID: ${user.id}. Updating tokens.`);
      await updateUserGoogleTokens(user.id, {
        refreshToken: tokens.refresh_token || user.googleRefreshToken, // Keep existing refresh token if new one isn't provided
        accessToken: tokens.access_token,
        accessTokenExpiresAt: tokens.expiry_date || (Date.now() + 3600 * 1000), // Use expiry_date directly, fallback to 1 hour
      });
      // TODO: Maybe update user's displayName or profilePictureUrl if they are empty or different?
      // For now, we just link the Google account.
    } else {
      // User not found by email. 
      // For now, we will not automatically create a new user as it has implications for role and password.
      // In a real app, you might redirect to a registration completion page or create a user with a default role.
      console.warn(`Google OAuth: No user found with email ${email}. Manual account creation/linking might be required.`);
      // For demonstration, let's create a new user with a 'Pending' role or a default role.
      // This part needs careful consideration for your application's user management strategy.
      // For now, redirecting with an error or a specific message is safer.
      return NextResponse.redirect(new URL(`/dashboard/settings?error=google_user_not_found&email=${encodeURIComponent(email)}`, request.url));
    }

    console.log('Google OAuth successful, tokens stored/updated.');
    return NextResponse.redirect(new URL('/dashboard/settings?success=google_linked', request.url));

  } catch (err: any) {
    console.error('Error during Google OAuth callback:', err.message, err.stack);
    let errorMessage = 'google_token_exchange_failed';
    if (err.response && err.response.data && err.response.data.error_description) {
        errorMessage = encodeURIComponent(err.response.data.error_description);
    } else if (err.message) {
        errorMessage = encodeURIComponent(err.message);
    }
    return NextResponse.redirect(new URL(`/dashboard/settings?error=${errorMessage}`, request.url));
  }
}
