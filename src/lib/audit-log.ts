
'use server';

import { initializeApp, getApps, App, credential } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { serviceAccount } from './service-account';
import type { AuditLogAction } from './types';

// --- Centralized Admin App Initialization ---

let adminDb: FirebaseFirestore.Firestore;

// Initialize Firebase Admin SDK only if it hasn't been already.
if (!getApps().length) {
  // Ensure the private key is available before initializing
  if (!serviceAccount.private_key) {
    console.error("Firebase Admin SDK private key is not defined. Check environment variables.");
    // We don't throw here to avoid crashing the server, but logs won't work.
  } else {
    try {
      initializeApp({
        credential: credential.cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("Firebase Admin Initialization Error:", error.message);
    }
  }
}

// Get the Firestore instance from the initialized app.
// This will throw an error if initialization failed, which is helpful for debugging.
try {
    adminDb = getFirestore();
} catch (error) {
    console.error("Could not get Firestore instance. Is the Admin SDK initialized correctly?", error);
}


// --- Log Action Function ---

interface LogActionParams {
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    userEmail: string;
    newData?: object;
    oldData?: object;
    batchId?: string;
    details?: object;
}

export const logAction = async ({
    action,
    collectionName,
    documentId,
    userEmail,
    newData,
    oldData,
    batchId,
    details,
}: LogActionParams): Promise<void> => {
    // If adminDb failed to initialize, we can't proceed.
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
        // This failure is critical and should be monitored.
        // We are not throwing an error back to the client to avoid breaking the user flow.
    }
};
