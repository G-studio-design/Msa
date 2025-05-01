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
// Check if Firebase config values are present before initializing
if (
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
} else {
    console.error(
        "Firebase configuration environment variables are missing. " +
        "Please ensure all required NEXT_PUBLIC_FIREBASE_* variables " +
        "are set in your environment (e.g., .env.local file or deployment settings)."
    );
    // You might want to throw an error here or handle it differently depending on your app's needs
    // For now, we'll allow the app to continue but auth will likely fail.
    // throw new Error("Firebase configuration is missing.");
}

// Get Auth instance only if app was initialized
const auth = app ? getAuth(app) : null;
// const db = app ? getFirestore(app) : null; // Add if you need Firestore

// Throw an error if auth couldn't be initialized due to missing config
if (!auth) {
     console.error("Firebase Auth could not be initialized due to missing configuration.");
    // Optionally throw an error to halt execution if Firebase is critical
    // throw new Error("Firebase Auth initialization failed due to missing config.");
}


export { app, auth }; // Export auth and potentially db
