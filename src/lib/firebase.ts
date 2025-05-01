// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore"; // Add if you need Firestore

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
let app;
let initializationError = null;

// Check if Firebase config values are present before initializing
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length === 0) {
    try {
        if (!getApps().length) {
          app = initializeApp(firebaseConfig);
        } else {
          app = getApp();
        }
    } catch (e: any) {
         console.error("Firebase initialization failed:", e);
         initializationError = `Firebase initialization failed: ${e.message}. Check your Firebase config values.`;
         app = null; // Ensure app is null if init fails
    }
} else {
    const errorMessage =
        `Firebase configuration environment variables are missing: ${missingKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase()}`).join(', ')}. ` +
        "Please ensure all required NEXT_PUBLIC_FIREBASE_* variables are set in your environment (e.g., .env.local file or deployment settings).";
    console.error(errorMessage);
    initializationError = errorMessage; // Store error message
    app = null; // Ensure app is null if config is missing
}

// Get Auth instance only if app was successfully initialized
const auth = app ? getAuth(app) : null;
// const db = app ? getFirestore(app) : null; // Add if you need Firestore

// Throw an error if auth couldn't be initialized due to missing config or init error
if (!auth) {
     // Log the specific error encountered during initialization
     console.error("Firebase Auth could not be initialized.", initializationError ? `Reason: ${initializationError}` : "App initialization failed or config missing.");
    // Optionally throw an error to halt execution if Firebase is critical,
    // but logging might be sufficient for diagnosing the missing env vars.
    // throw new Error(initializationError || "Firebase Auth initialization failed.");
}


export { app, auth }; // Export auth and potentially db
