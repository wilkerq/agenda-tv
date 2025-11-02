'use server';

import { initializeApp, getApps, type ServiceAccount, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';
import { serviceAccount } from './service-account';

let adminDb: Firestore;
let app: App;

// Initialize Firebase Admin SDK only if it hasn't been already and credentials are provided.
if (!getApps().length) {
  if (serviceAccount.private_key) {
    try {
      app = initializeApp({
        credential: credential.cert(serviceAccount as ServiceAccount),
      });
      adminDb = getFirestore(app);
    } catch (error: any) {
        console.error('Firebase Admin SDK initialization error:', error);
    }
  } else {
    console.warn("Firebase Admin credentials not found. Skipping Admin SDK initialization.");
  }
} else {
  app = getApps()[0];
  if (app) {
    adminDb = getFirestore(app);
  }
}

export { adminDb };
