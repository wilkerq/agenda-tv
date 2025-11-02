'use server';

import { initializeApp, getApps, type ServiceAccount, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { credential } from 'firebase-admin';
import { serviceAccount } from './service-account';
import type { AuditLogAction } from './types';

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

interface LogActionParams {
  action: AuditLogAction;
  collectionName: string;
  documentId: string;
  userEmail: string;
  oldData?: any;
  newData?: any;
  details?: any;
  batchId?: string;
}

export const logAction = async ({
    action,
    collectionName,
    documentId,
    userEmail,
    oldData,
    newData,
    details,
    batchId
}: LogActionParams) => {
    
    if (!adminDb) {
        console.error("CRITICAL: Firestore for Admin SDK is not available. Cannot write to audit log.");
        return;
    }

    try {
        const logData: any = {
            action,
            collectionName,
            documentId,
            userEmail,
            timestamp: new Date(),
        };

        if (oldData) {
            logData.before = oldData;
        }
        if (newData) {
            logData.after = newData;
        }
        if (batchId) {
            logData.batchId = batchId;
        }
        if (details) {
            logData.details = details;
        }
        
        await adminDb.collection('audit_logs').add(logData);
    } catch (error) {
        console.error("CRITICAL: Failed to write to audit log using Admin SDK.", error);
    }
};

// Export the adminDb instance for server-side use in other actions
export { adminDb };
