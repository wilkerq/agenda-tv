
import { initializeApp, getApps, type ServiceAccount, type App, credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { serviceAccount } from './service-account';

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

if (process.env.NODE_ENV === 'development' && !getApps().length) {
    console.log("Initializing Firebase Admin SDK for development...");
}

if (!getApps().length) {
  if (serviceAccount.private_key) {
    try {
      adminApp = initializeApp({
        credential: credential.cert(serviceAccount as ServiceAccount),
      });
      adminDb = getFirestore(adminApp);
      adminAuth = getAuth(adminApp);
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.message);
    }
  } else {
    console.warn("Firebase Admin credentials not found. Skipping Admin SDK initialization.");
  }
} else {
  adminApp = getApps()[0];
  if (adminApp) {
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
  }
}

/**
 * Retorna a instância do Firestore do Admin SDK.
 * @returns {Firestore} A instância do Firestore.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
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
