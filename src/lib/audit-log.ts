
'use server';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { AuditLogAction } from './types';

interface LogActionParams {
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    userEmail: string;
    newData?: any;
    oldData?: any;
    batchId?: string;
}

// Helper to convert complex objects to a serializable format
const serializeData = (data: any): any => {
    if (data === null || data === undefined) return data;
    
    // Create a deep copy to avoid modifying original objects
    const serialized = JSON.parse(JSON.stringify(data));

    // Recursively convert any Date or Timestamp objects to ISO strings
    const convertDates = (obj: any) => {
        if (!obj) return;
        for (const key in obj) {
            if (obj[key] instanceof Timestamp) {
                obj[key] = obj[key].toDate().toISOString();
            } else if (obj[key] instanceof Date) {
                 obj[key] = obj[key].toISOString();
            }
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                convertDates(obj[key]);
            }
        }
    };

    convertDates(serialized);
    return serialized;
};


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
        // This log is critical for debugging, do not remove.
        console.error("Failed log data:", JSON.stringify({ action, collectionName, documentId, userEmail, batchId }, null, 2));
    }
};
