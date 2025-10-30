
'use server';

import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { serviceAccount } from './service-account';
import type { AuditLogAction } from './types';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Ensure the private key is available before initializing
  if (!serviceAccount.private_key) {
    throw new Error("Firebase Admin SDK private key is not defined. Check environment variables.");
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error("Firebase Admin Initialization Error:", error.message);
  }
}

const adminDb = getFirestore();


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

    const logData: any = {
        action,
        collectionName,
        documentId,
        userEmail,
        timestamp: Timestamp.now(),
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
    
    try {
        await adminDb.collection('audit_logs').add(logData);
    } catch (error) {
        console.error("CRITICAL: Failed to write to audit log using Admin SDK.", error);
        // This failure is critical and should be monitored.
        // We are not throwing an error back to the client to avoid breaking the user flow.
    }
};
