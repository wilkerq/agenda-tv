
'use server';

import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { AuditLogAction } from './types';
import { FirestorePermissionError, type SecurityRuleContext } from './errors';
import { errorEmitter } from './error-emitter';

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
    
    const logCollectionRef = collection(db, 'audit_logs');
    
    addDoc(logCollectionRef, logData)
        .catch((serverError) => {
            const permissionError = new FirestorePermissionError({
                path: logCollectionRef.path,
                operation: 'create',
                requestResourceData: logData,
            } satisfies SecurityRuleContext);

            errorEmitter.emit('permission-error', permissionError);
        });
};
