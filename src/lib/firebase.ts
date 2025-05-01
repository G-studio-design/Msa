// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
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
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let initializationError: string | null = null;
let isFirebaseInitialized: boolean = false; // Default to false as we are disabling Firebase auth

console.warn("Firebase initialization is currently disabled as the application uses local authentication.");
initializationError = "Firebase features (like Google Sign-In) are disabled.";


// --- FIREBASE INITIALIZATION DISABLED ---
// The following logic is commented out because local authentication is used.
// If you need Firebase features later, uncomment this section and ensure
// your environment variables in .env.local are correctly set.

/*
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
        // Get Auth instance only if app was successfully initialized
        auth = getAuth(app);
        isFirebaseInitialized = true;
        console.log("Firebase initialized successfully.");
    } catch (e: any) {
         console.error("Firebase initialization failed during initializeApp/getAuth:", e);
         initializationError = `Firebase initialization failed: ${e.message}. Check your Firebase config values and project setup.`;
         app = null;
         auth = null;
         isFirebaseInitialized = false;
    }
} else {
    // Correctly map the JS keys back to the expected ENV VAR names for the error message
    const keyToEnvVar: Record<string, string> = {
        apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
        authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
        // measurementId: 'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', // Optional
    };
    const missingEnvVars = missingKeys.map(key => keyToEnvVar[key] || `UNKNOWN_KEY (${key})`);

    const errorMessage =
        `Firebase configuration environment variables are missing: ${missingEnvVars.join(', ')}. ` +
        "Please ensure all required NEXT_PUBLIC_FIREBASE_* variables are set in your environment (e.g., .env.local file or deployment settings).";
    console.error(errorMessage); // Log the detailed error for developers
    initializationError = "Firebase configuration is incomplete. Google Sign-In is disabled."; // Store a generic error for potential UI use
    app = null;
    auth = null;
    isFirebaseInitialized = false;
}

// Log if auth couldn't be initialized
if (!auth && isFirebaseInitialized) { // Check if auth failed even if app seemed to init
     console.error("Firebase Auth could not be initialized, even though app object exists.", initializationError || "Unknown auth initialization error.");
     isFirebaseInitialized = false; // Mark as not initialized if Auth failed
     initializationError = initializationError || "Firebase Auth initialization failed.";
} else if (!isFirebaseInitialized) {
    // Error already logged above if config was missing or initializeApp failed
    console.warn("Firebase was not initialized. Features depending on Firebase (like Google Sign-In) will be unavailable.");
}
*/
// --- END OF DISABLED FIREBASE INITIALIZATION ---


// Export auth and potentially db, along with the initialization status
export { app, auth, isFirebaseInitialized, initializationError };
