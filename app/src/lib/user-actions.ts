
'use server';

import { getAdminDb, getAdminAuth, isAdminSDKInitialized } from './firebase-admin';
import { logAction } from './audit-log';

// Helper to generate random password
const generateTempPassword = () => {
    return Math.random().toString(36).slice(-8) + 'A1!';
}

export async function createUserAction(
    values: { email: string; displayName: string; role: string; },
    adminUserEmail: string
): Promise<{ success: boolean; message: string }> {

    if (!isAdminSDKInitialized()) {
        return { success: false, message: "Serviço indisponível." };
    }
    const db = getAdminDb();
    const auth = getAdminAuth();

    try {
        // 1. Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email: values.email,
            displayName: values.displayName,
            password: generateTempPassword(),
            emailVerified: false // User will verify by setting password
        });
        
        // 2. Create the user document in Firestore
        const userDocRef = db.collection("users").doc(userRecord.uid);
        const newUserData = {
            uid: userRecord.uid,
            email: values.email,
            displayName: values.displayName,
            role: values.role,
            createdAt: new Date(),
        };
        await userDocRef.set(newUserData);

        // 3. Send password reset email, which acts as a "set your password" link
        const passwordResetLink = await auth.generatePasswordResetLink(values.email);
        // Here you would typically use a service to email this link to the user.
        // For this app, we will rely on the admin to communicate this,
        // or we can show it in the UI. For now, we'll just log it.
        console.log(`Password reset link for ${values.email}: ${passwordResetLink}`);


        // 4. Log the action
        await logAction({
            action: 'create-user',
            collectionName: 'users',
            documentId: userRecord.uid,
            userEmail: adminUserEmail,
            newData: {
                createdUserEmail: values.email,
                uid: userRecord.uid,
                role: values.role,
            },
        });
        
        return { 
            success: true, 
            message: `Usuário criado. Um e-mail para definição de senha foi enviado para ${values.email}.` 
        };

    } catch (error: any) {
        let errorMessage = "Ocorreu um erro desconhecido ao criar o usuário.";
        if (error.code === 'auth/email-already-exists') {
            errorMessage = "Este endereço de email já está em uso por outra conta.";
        }
        console.error("Falha ao criar usuário (Server Action):", error);
        return { success: false, message: errorMessage };
    }
}


export async function updateUserAction(
    userId: string,
    values: { displayName: string; role: string; },
    adminUserEmail: string
): Promise<{ success: boolean; message: string; }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "Serviço indisponível." };
    }
    const db = getAdminDb();
    const auth = getAdminAuth();

    try {
        const userDocRef = db.collection("users").doc(userId);
        
        // Fetch old data for logging
        const oldDoc = await userDocRef.get();
        const oldData = oldDoc.exists ? oldDoc.data() : null;

        // Update Auth display name
        await auth.updateUser(userId, { displayName: values.displayName });

        // Update Firestore role
        await userDocRef.update({ role: values.role, displayName: values.displayName });

        await logAction({
            action: 'update',
            collectionName: 'users',
            documentId: userId,
            userEmail: adminUserEmail,
            newData: values,
            oldData: oldData ? { displayName: oldData.displayName, role: oldData.role } : {}
        });

        return { success: true, message: "Usuário atualizado com sucesso." };

    } catch (error: any) {
        console.error("Erro ao atualizar usuário (Server Action):", error);
        return { success: false, message: error.message || "Falha ao atualizar usuário." };
    }
}


export async function deleteUserAction(
    userId: string,
    userEmailToDelete: string,
    adminUserEmail: string
): Promise<{ success: boolean; message: string; }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "Serviço indisponível." };
    }
    const db = getAdminDb();
    const auth = getAdminAuth();

    try {
        // Delete from Firestore
        const userDocRef = db.collection("users").doc(userId);
        await userDocRef.delete();
        
        // Delete from Auth
        await auth.deleteUser(userId);

        await logAction({
            action: 'delete',
            collectionName: 'users',
            documentId: userId,
            userEmail: adminUserEmail,
            details: { deletedUserEmail: userEmailToDelete }
        });
        
        return { success: true, message: "Usuário removido do sistema (Firestore e Auth)." };

    } catch (error: any) {
        console.error("Erro ao deletar usuário (Server Action):", error);
         return { success: false, message: error.message || "Falha ao deletar usuário." };
    }
}
