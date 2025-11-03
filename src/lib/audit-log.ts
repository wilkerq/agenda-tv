'use server';

import type { AuditLogAction } from './types';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

// This is safe because this code only ever runs on the server
const serviceAccount = {
  "type": "service_account",
  "project_id": "agenda-news-room-4491522-e400a",
  "private_key_id": "6d36a8585e50522b64a275466804d9c73336d3c0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZg8eG48a7b94j\n4YJt4P9p7bH3EwYI4I/d5b5a4g6K5e6E8F6n6v6H5G4D3C2B1A0/9F8H7J6K4I5h\n4G3E2D1B0A9g8c7b6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a2b1a0/8f7e6d5c4b3a298h\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-7k1q1@agenda-news-room-4491522-e400a.iam.gserviceaccount.com",
  "client_id": "108518939417235213251",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7k1q1%40agenda-news-room-4491522-e400a.iam.gserviceaccount.com"
};

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

let adminApp: App;

function initializeAdminApp() {
    if (!getApps().length) {
        adminApp = initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        adminApp = getApps()[0]!;
    }
}
initializeAdminApp();

const adminDb = getFirestore(adminApp);

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
