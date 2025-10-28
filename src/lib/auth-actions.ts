
"use server";

import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { serviceAccount } from "./service-account"; // Assumes service-account.ts is configured

const app = getApps().length === 0 ? initializeApp({
    credential: {
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
    }
}) : getApps()[0];

const adminAuth = getAuth(app);

export async function createUser(email: string): Promise<{ uid: string, passwordResetLink: string }> {
    try {
        const userRecord = await adminAuth.createUser({
            email: email,
            // Não definimos a senha aqui
        });
        
        // Geramos o link para o usuário definir a senha
        const passwordResetLink = await adminAuth.generatePasswordResetLink(email);

        return {
            uid: userRecord.uid,
            passwordResetLink: passwordResetLink,
        };

    } catch (error: any) {
        console.error("Error creating new user:", error);
        // Re-throw the error to be handled by the calling function on the client
        throw error;
    }
}
