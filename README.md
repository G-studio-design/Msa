# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Prerequisites

Before you can run this application locally, you'll need to have a few essential tools installed on your computer.

1.  **Node.js**: This is the runtime environment that allows you to run JavaScript code outside of a web browser. This project requires it to build and run.
    *   **Recommendation**: Download and install the **LTS (Long-Term Support)** version from the official [Node.js website](https://nodejs.org/). The LTS version is the most stable and is recommended for most users.

2.  **npm (Node Package Manager)**: npm is the package manager for Node.js. It's used to install the libraries and tools this project depends on.
    *   **Installation**: npm is automatically installed when you install Node.js, so you don't need to install it separately.

3.  **A Code Editor**: While you can use any text editor, a modern code editor will provide features like syntax highlighting and code completion, making development much easier.
    *   **Recommendation**: We highly recommend using [Visual Studio Code](https://code.visualstudio.com/), which is a free and powerful editor popular for web development.

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
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:9002/api/auth/google/callback

# Google Generative AI (for Genkit AI features)
# Find this in Google AI Studio or your Google Cloud Console
GOOGLE_GENAI_API_KEY=YOUR_GEMINI_API_KEY

# Firebase Public Keys (for Firebase services, if used)
# Find these in your Firebase Project Settings under "General"
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

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
