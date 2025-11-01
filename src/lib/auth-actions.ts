
"use server";

import { initializeApp, getApps, type ServiceAccount, type App } from "firebase-admin/app";
import { credential } from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { serviceAccount } from "./service-account";
import { logAction } from "./audit-log";

let app: App | undefined;
// Initialize Firebase Admin SDK only if it hasn't been already and credentials are provided.
if (!getApps().length) {
  if (serviceAccount.private_key) {
    try {
      app = initializeApp({
        credential: credential.cert(serviceAccount as ServiceAccount)
      });
    } catch (e) {
      console.error('Firebase Admin SDK initialization error:', e);
    }
  } else {
    console.warn("Firebase Admin credentials not found. Skipping initialization.");
  }
} else {
  app = getApps()[0];
}

// Get the Auth instance only if the app was initialized.
const adminAuth = app ? getAuth(app) : null;

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
