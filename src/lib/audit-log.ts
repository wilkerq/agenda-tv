
'use server';

import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';
import type { AuditLogAction } from './types';

interface LogActionParams {
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    user: User;
    newData?: any;
    oldData?: any;
    batchId?: string;
}

// Helper to convert Firestore Timestamps to serializable strings
const serializeData = (data: any): any => {
    if (!data) return data;
    const serialized = { ...data };
    for (const key in serialized) {
        if (serialized[key] instanceof Timestamp) {
            serialized[key] = serialized[key].toDate().toISOString();
        } else if (typeof serialized[key] === 'object' && serialized[key] !== null) {
            // Recursively serialize nested objects (if any)
            serialized[key] = serializeData(serialized[key]);
        }
    }
    return serialized;
};


export const logAction = async ({
    action,
    collectionName,
    documentId,
    user,
    newData,
    oldData,
    batchId,
}: LogActionParams): Promise<void> => {
    try {
        const logData: any = {
            action,
            collectionName,
            documentId,
            userEmail: user.email,
            timestamp: serverTimestamp(),
        };

        if (oldData) {
            logData.before = serializeData(oldData);
        }
        if (newData) {
            logData.after = serializeData(newData);
        }
        if (batchId) {
            logData.batchId = batchId;
        }

        await addDoc(collection(db, 'audit_logs'), logData);

    } catch (error) {
        console.error("Error writing to audit log:", error);
        // Optionally, re-throw or handle the error as needed,
        // but typically you don't want a logging failure to stop a primary action.
    }
};
