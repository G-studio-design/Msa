// src/lib/firebase.ts

// Firebase configuration is no longer needed as Google Sign-In has been removed.
// Keeping the file structure in case Firebase services (like Firestore) are added later.

const isFirebaseInitialized: boolean = false;
const initializationError: string | null = "Firebase is not configured for this project.";

// Export placeholder values to avoid breaking imports in other files temporarily.
// Components relying on these should be updated or removed.
const app = null;
const auth = null;

export { app, auth, isFirebaseInitialized, initializationError };
