
"use server";

import { getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "./firebase-admin"; // Import the shared instance
import { logAction } from "./audit-log";

// Get the Auth instance from the existing app.
const adminAuth = getApps().length ? getAuth(getApps()[0]) : null;

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
