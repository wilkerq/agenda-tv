
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
  // Check if the SDK has already been initialized.
  if (getApps().some(app => app.name === '[DEFAULT]')) {
    adminApp = getApps().find(app => app.name === '[DEFAULT]');
  } else {
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
        console.error("CRITICAL: Failed to initialize Firebase Admin SDK. Check if the private key is malformed.", error);
        return;
    }
  }

  // Once the app is initialized, get the other services.
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
    // This will now only throw if the initial setup failed, likely due to missing credentials.
    throw new Error("Admin DB not initialized. Check Firebase Admin credentials and server logs.");
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
    throw new Error("Admin Auth not initialized. Check Firebase Admin credentials and server logs.");
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
        throw new Error("Admin App not initialized. Check Firebase Admin credentials and server logs.");
    }
    return adminApp;
}
