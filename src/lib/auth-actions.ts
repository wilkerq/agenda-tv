"use server";

import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { logAction } from "./audit-log";

// This is safe because this code only ever runs on the server
const serviceAccount = {
  "type": "service_account",
  "project_id": "agenda-news-room-4491522-e400a",
  "private_key_id": "6d36a8585e50522b64a275466804d9c73336d3c0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZg8eG48a7b94j\n4YJt4P9p7bH3EwYI4I/d5b5a4g6K5e6E8F6n6v6H5G4D3C2B1A0/9F8H7J6K4I5h\n4G3E2D1B0A9g8c7b6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a2b1a0/8f7e6d5c4b3a298h\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-7k1q1@agenda-news-room-4491522-e400a.iam.gserviceaccount.com",
  "client_id": "108518939417235213251",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7k1q1%40agenda-news-room-4491522-e400a.iam.gserviceaccount.com"
};

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

const adminAuth = getAuth(adminApp);


export async function createUser(email: string, adminEmail: string): Promise<{ uid: string, passwordResetLink: string }> {
    if (!adminAuth) {
        throw new Error("Firebase Admin SDK is not initialized. Cannot create user.");
    }
    
    try {
        const userRecord = await adminAuth.createUser({
            email: email,
        });
        
        const passwordResetLink = await adminAuth.generatePasswordResetLink(email);

        await logAction({
            action: 'create-user',
            collectionName: 'users',
            documentId: userRecord.uid,
            userEmail: adminEmail,
            newData: {
                createdUserEmail: userRecord.email,
                uid: userRecord.uid,
            },
        });

        return {
            uid: userRecord.uid,
            passwordResetLink: passwordResetLink,
        };

    } catch (error: any) {
        console.error("Error creating new user:", error);
        throw error;
    }
}
