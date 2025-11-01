"use server";

// =================================================================
// CORREÇÃO DE TIPO (BUILD) APLICADA AQUI
// Importamos 'credential' e 'ServiceAccount' para inicializar corretamente.
// =================================================================
import { initializeApp, getApps, type ServiceAccount } from "firebase-admin/app";
import { credential } from "firebase-admin"; // Importado da raiz
import { getAuth } from "firebase-admin/auth";
import { serviceAccount } from "./service-account"; // Assumes service-account.ts is configured
import { logAction } from "./audit-log";

// =================================================================
// CORREÇÃO APLICADA AQUI:
// Usamos 'credential.cert()' em vez de criar o objeto manualmente.
// Usamos 'as ServiceAccount' para garantir a correspondência de tipo.
// =================================================================
const app = getApps().length === 0 ? initializeApp({
    credential: credential.cert(serviceAccount as ServiceAccount)
}) : getApps()[0];

const adminAuth = getAuth(app);

export async function createUser(email: string, adminEmail: string): Promise<{ uid: string, passwordResetLink: string }> {
    try {
        const userRecord = await adminAuth.createUser({
            email: email,
        });
        
        // Geramos o link para o usuário definir a senha
        const passwordResetLink = await adminAuth.generatePasswordResetLink(email);

        // Log the action
        await logAction({
            action: 'create-user',
            collectionName: 'users',
            documentId: userRecord.uid,
            userEmail: adminEmail, // Correct: log which admin performed the action
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
        // Re-throw the error to be handled by the calling function on the client
        throw error;
    }
}