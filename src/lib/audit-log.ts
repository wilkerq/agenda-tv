
'use server';

import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { serviceAccount } from './service-account';
import type { AuditLogAction } from './types';

// Initialize Firebase Admin SDK
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({
    credential: {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    },
  });
} else {
  adminApp = getApps()[0];
}

const adminDb = getFirestore(adminApp);


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
