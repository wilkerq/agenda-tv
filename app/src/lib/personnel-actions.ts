
'use server';

import { getAdminDb, isAdminSDKInitialized } from './firebase-admin';
import { logAction } from './audit-log';
import { revalidatePath } from 'next/cache';

const serializePersonnelData = (data: any) => {
  const serialized: any = {};
  for (const key in data) {
    const value = data[key];
    if (value !== null && value !== undefined) {
      serialized[key] = value;
    }
  }
  return serialized;
};

export async function addPersonnelAction(collectionName: string, data: any, userEmail: string): Promise<{ success: boolean; message: string }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "O serviço está indisponível." };
    }
    const db = getAdminDb();
    try {
        const docRef = await db.collection(collectionName).add(data);
        await logAction({
            action: 'create',
            collectionName,
            documentId: docRef.id,
            userEmail,
            newData: serializePersonnelData(data),
        });
        revalidatePath('/dashboard/operators');
        return { success: true, message: "Membro adicionado com sucesso." };
    } catch (error: any) {
        console.error(`Error adding to ${collectionName}:`, error);
        return { success: false, message: error.message || "Não foi possível adicionar o membro." };
    }
}

export async function updatePersonnelAction(collectionName: string, id: string, data: any, userEmail: string): Promise<{ success: boolean; message: string }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "O serviço está indisponível." };
    }
    const db = getAdminDb();
    const docRef = db.collection(collectionName).doc(id);
    try {
        const docSnap = await docRef.get();
        const oldData = docSnap.exists ? docSnap.data() : null;

        await docRef.update(data);

        await logAction({
            action: 'update',
            collectionName,
            documentId: id,
            userEmail,
            oldData: oldData ? serializePersonnelData(oldData) : undefined,
            newData: serializePersonnelData(data),
        });
        revalidatePath('/dashboard/operators');
        return { success: true, message: "Membro atualizado com sucesso." };
    } catch (error: any) {
        console.error(`Error updating ${collectionName}:`, error);
        return { success: false, message: error.message || "Não foi possível atualizar o membro." };
    }
}

export async function deletePersonnelAction(collectionName: string, id: string, userEmail: string): Promise<{ success: boolean; message: string }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "O serviço está indisponível." };
    }
    const db = getAdminDb();
    const docRef = db.collection(collectionName).doc(id);
    try {
        const docSnap = await docRef.get();
        const oldData = docSnap.exists ? docSnap.data() : null;

        await docRef.delete();

        if (oldData) {
            await logAction({
                action: 'delete',
                collectionName,
                documentId: id,
                userEmail,
                oldData: serializePersonnelData(oldData),
            });
        }
        revalidatePath('/dashboard/operators');
        return { success: true, message: "Membro removido com sucesso." };
    } catch (error: any) {
        console.error(`Error deleting from ${collectionName}:`, error);
        return { success: false, message: error.message || "Não foi possível remover o membro." };
    }
}
