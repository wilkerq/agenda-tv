
'use server';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { AuditLogAction } from './types';

interface LogActionParams {
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    userEmail: string;
    newData?: string; // Expect serialized JSON string
    oldData?: string; // Expect serialized JSON string
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
            timestamp: Timestamp.fromDate(new Date()),
        };

        if (oldData) {
            // Parse the data on the server
            logData.before = JSON.parse(oldData);
        }
        if (newData) {
            // Parse the data on the server
            logData.after = JSON.parse(newData);
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
