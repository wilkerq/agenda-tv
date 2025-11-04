
'use server';

import { addDoc, collection, Firestore } from 'firebase/firestore';
import type { AuditLogAction } from './types';

interface LogActionParams {
  db: Firestore; // Client-side Firestore instance
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
    db, // Now expects the client 'db' instance
    action,
    collectionName,
    documentId,
    userEmail,
    oldData,
    newData,
    details,
    batchId
}: LogActionParams) => {
    
    // Uses the passed-in client Firestore instance
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
        
        // Writes to Firestore using the client SDK and the logged-in user's permissions
        await addDoc(collection(db, 'audit_logs'), logData);

    } catch (error) {
        console.error("Failed to write to audit log using client SDK.", error);
        // The error will be caught by the global permission error handler if it's a security rule issue.
        throw error;
    }
};
