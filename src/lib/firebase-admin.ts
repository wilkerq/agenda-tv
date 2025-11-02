'use server';

import { initializeApp, getApps, type ServiceAccount, type App, credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { serviceAccount } from './service-account';

let adminDb: Firestore;
let adminApp: App;

if (!getApps().length) {
  if (serviceAccount.private_key) {
    try {
      adminApp = initializeApp({
        credential: credential.cert(serviceAccount as ServiceAccount),
      });
      adminDb = getFirestore(adminApp);
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error);
    }
  } else {
    console.warn("Firebase Admin credentials not found. Skipping Admin SDK initialization.");
  }
} else {
  adminApp = getApps()[0];
  if (adminApp) {
    adminDb = getFirestore(adminApp);
  }
}

export { adminDb, adminApp };
