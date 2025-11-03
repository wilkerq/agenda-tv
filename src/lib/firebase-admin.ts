import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 * This function is self-invoking and ensures that the SDK is ready
 * as soon as this module is imported on the server.
 */
function initializeAdminSDK() {
  if (getApps().length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error("CRITICAL: Firebase Admin credentials are not set in environment variables. Admin SDK initialization failed.");
      return;
    }

    try {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("CRITICAL: Failed to initialize Firebase Admin SDK:", error);
      return; // Stop execution if initialization fails
    }
  } else {
    adminApp = getApps()[0]!;
  }

  // Get the Firestore and Auth instances only if the app was successfully initialized
  if (adminApp) {
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
  }
}

// Immediately call the initialization function when this module is loaded on the server.
initializeAdminSDK();

/**
 * Returns the initialized Firestore admin instance.
 * @returns {Firestore} The Firestore instance.
 * @throws {Error} If the instance has not been initialized.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    throw new Error("Admin DB not initialized. Check Firebase Admin credentials.");
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
    throw new Error("Admin Auth not initialized. Check Firebase Admin credentials.");
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
        throw new Error("Admin App not initialized. Check Firebase Admin credentials.");
    }
    return adminApp;
}
