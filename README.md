# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Locally

To run this application on your local machine, follow these steps:

### 1. Set Up Environment Variables

This project requires several API keys and credentials to run.

1.  Create a new file named `.env.local` in the root directory of the project if it doesn't exist.
2.  Copy the contents of the `.env` file (or the template below) into your new `.env.local` file.
3.  Replace the placeholder values (e.g., `YOUR_API_KEY_HERE`) with your actual credentials from Google Cloud and Firebase.

```
# Google OAuth Credentials (for Google Calendar & Sign-In)
# Find these in your Google Cloud Console under APIs & Services > Credentials
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
NEXT_PUBLIC_GOOGLE_REDIRECT_URI="http://localhost:9002/api/auth/google/callback"

# Google Generative AI (for Genkit AI features)
# Find this in Google AI Studio or your Google Cloud Console
GOOGLE_GENAI_API_KEY="YOUR_GEMINI_API_KEY"

# Firebase Public Keys (for Firebase services, if used)
# Find these in your Firebase Project Settings under "General"
NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"

```

### 2. Install Dependencies

Open a terminal in the project's root directory and run the following command to install the necessary packages:

```bash
npm install
```

### 3. Run the Development Server

Once the dependencies are installed, start the Next.js development server:

```bash
npm run dev
```

The application will now be running. You can access it in your web browser, typically at `http://localhost:9002`.
