"use server";

import { getAdminAuth } from "./firebase-admin";
import { logAction } from "./audit-log";

export async function createUser(email: string, adminEmail: string): Promise<{ uid: string, passwordResetLink: string }> {
    const adminAuth = getAdminAuth();
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
