'use server';

import type { AuditLogAction } from './types';
import { adminDb } from './firebase-admin';

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
