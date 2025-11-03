import { initializeApp, getApps, type App, cert } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { serviceAccount } from '@/lib/service-account';

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

/**
 * Initializes the Firebase Admin SDK if not already initialized.
 * This function is self-invoked to ensure a single instance is created.
 */
(function initializeAdminSDK() {
  const adminApps = getApps().filter(app => app.name === 'firebase-admin-sdk');

  if (adminApps.length > 0) {
    adminApp = adminApps[0]!;
  } else {
    // Check if the service account credentials are valid before initializing.
    if (!serviceAccount.project_id || !serviceAccount.private_key) {
      console.error(
        'CRITICAL: Firebase service account credentials are missing or incomplete in src/lib/service-account.ts. Admin SDK will not be initialized.'
      );
      // Return early to prevent initialization errors.
      return;
    }

    try {
      adminApp = initializeApp(
        {
          credential: cert(serviceAccount),
        },
        'firebase-admin-sdk'
      );
    } catch (error: any) {
      console.error(
        'CRITICAL: Failed to initialize Firebase Admin SDK. Error: ' +
          error.message
      );
      // Return early if initialization fails.
      return;
    }
  }

  // Get other services only if the app was successfully initialized.
  adminDb = getFirestore(adminApp);
  adminAuth = getAuth(adminApp);
})();


/**
 * Retorna a instância do Firestore do Admin SDK.
 * @returns {Firestore} A instância do Firestore.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    // Este erro agora indica uma falha na inicialização, que deve ser logada acima.
    throw new Error("Admin DB not initialized. Check Firebase Admin credentials.");
  }
  return adminDb;
}

/**
 * Retorna a instância do Auth do Admin SDK.
 * @returns {Auth} A instância do Auth.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    throw new Error("Admin Auth not initialized. Check Firebase Admin credentials.");
  }
  return adminAuth;
}

/**
 * Retorna a instância do App do Admin SDK.
 * @returns {App} A instância do App.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminApp(): App {
    if (!adminApp) {
        throw new Error("Admin App not initialized. Check Firebase Admin credentials.");
    }
    return adminApp;
}
