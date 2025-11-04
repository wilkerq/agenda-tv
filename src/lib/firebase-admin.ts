
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

/**
 * @deprecated The Admin SDK is no longer used for database operations in this application. All actions are performed using the client-side SDK under the logged-in user's permissions.
 */
export function getAdminDb(): Firestore {
  throw new Error("Admin SDK (getAdminDb) is deprecated. Use the client-side Firestore instance provided by the 'useFirestore()' hook instead.");
}

/**
 * @deprecated The Admin SDK is no longer used for authentication operations in this application.
 */
export function getAdminAuth(): Auth {
  throw new Error("Admin SDK (getAdminAuth) is deprecated.");
}

/**
 * @deprecated The Admin SDK is no longer used in this application.
 */
export function getAdminApp(): App {
    throw new Error("Admin SDK (getAdminApp) is deprecated.");
}
