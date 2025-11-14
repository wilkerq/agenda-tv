
'use server';

import { getAdminDb } from './firebase-admin';
import type { AuditLogAction } from './types';

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
    
    try {
        const db = getAdminDb();
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
        
        await db.collection('audit_logs').add(logData);

    } catch (error) {
        console.error("Failed to write to audit log using Admin SDK.", error);
        // Do not re-throw, as audit logging failure should not crash the primary operation.
    }
};
