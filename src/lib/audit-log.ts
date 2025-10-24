
'use server';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { AuditLogAction } from './types';

interface LogActionParams {
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    userEmail: string;
    newData?: object;
    oldData?: object;
    batchId?: string;
}

export const logAction = async ({
    action,
    collectionName,
    documentId,
    userEmail,
    newData,
    oldData,
    batchId,
}: LogActionParams): Promise<void> => {
    try {
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
        
        await addDoc(collection(db, 'audit_logs'), logData);

    } catch (error) {
        console.error("Error writing to audit log:", error);
        // This log is critical for debugging, do not remove.
        console.error("Failed log data:", JSON.stringify({ action, collectionName, documentId, userEmail, batchId }, null, 2));
    }
};
