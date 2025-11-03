
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

let isInitialized = false;

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 * This function is now designed to be called explicitly.
 */
export function ensureAdminInitialized() {
  // If already initialized, do nothing.
  if (isInitialized) {
    return;
  }

  // Check if a default app already exists (e.g., from a previous hot reload)
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    // If no app, initialize one with credentials from environment variables.
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    // Validate that all required credentials are present.
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error("CRITICAL: Firebase Admin credentials are not set in environment variables. Admin SDK initialization failed.");
      // Do not proceed with initialization if credentials are missing.
      return;
    }
    
    try {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
        console.error("CRITICAL: Failed to initialize Firebase Admin SDK. Check if the private key is malformed.", error);
        // Do not proceed if initialization fails.
        return;
    }
  }

  // If we have a valid app instance, get the other services.
  if (adminApp) {
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    isInitialized = true; // Mark as initialized
  }
}

/**
 * Returns the initialized Firestore admin instance.
 * @returns {Firestore} The Firestore instance.
 * @throws {Error} If the instance has not been initialized.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    // This error now more clearly indicates a logic flow issue (i.e., ensureAdminInitialized was not called or failed).
    throw new Error("Admin DB not initialized. Call ensureAdminInitialized() before using this function.");
  }
  return adminDb;
}

/**
 * Returns the initialized Auth admin instance.
 * @returns {Auth} The Auth instance.
 * @throws {Error} If the instance has not been initialized.
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    throw new Error("Admin Auth not initialized. Call ensureAdminInitialized() before using this function.");
  }
  return adminAuth;
}

/**
 * Returns the initialized App admin instance.
 * @returns {App} The App instance.
 * @throws {Error} If the instance has not been initialized.
 */
export function getAdminApp(): App {
    if (!adminApp) {
        throw new Error("Admin App not initialized. Call ensureAdminInitialized() before using this function.");
    }
    return adminApp;
}
