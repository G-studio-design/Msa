// src/lib/firebase.ts
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";

// Your web app's Firebase configuration
// Values are read from environment variables defined in next.config.ts
// Make sure you have a .env.local file with the correct values or they are set in your deployment environment.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let initializationError: string | null = null;
let isFirebaseInitialized: boolean = false; // Default to false as Firebase is not used

console.warn("Firebase initialization is disabled as the application uses local authentication.");
initializationError = "Firebase features (like Google Sign-In) are disabled.";

// --- FIREBASE INITIALIZATION DISABLED ---
// The logic to initialize Firebase app and auth is removed because local authentication is used.
// If Firebase features are needed later, uncomment the relevant initialization code
// and ensure environment variables in .env.local are correctly set.
// --- END OF DISABLED FIREBASE INITIALIZATION ---


// Export null for app and auth, indicate initialization is false, and provide error message
export { app, auth, isFirebaseInitialized, initializationError };
