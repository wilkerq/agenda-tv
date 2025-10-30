
'use server';

import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; 
import { logAction } from "./audit-log";
import { revalidatePath } from "next/cache";

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


export async function addPersonnel(collectionName: string, data: any, userEmail: string) {
    try {
        const collectionRef = collection(db, collectionName);
        const docRef = await addDoc(collectionRef, data);

        await logAction({
            action: 'create',
            collectionName,
            documentId: docRef.id,
            userEmail: userEmail,
            newData: serializePersonnelData(data),
        });
        revalidatePath('/dashboard/operators');
    } catch (error) {
        console.error("Error adding personnel:", error);
        throw new Error("Failed to add personnel.");
    }
}

export async function updatePersonnel(collectionName: string, id: string, data: any, userEmail: string) {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        const oldData = docSnap.exists() ? docSnap.data() : null;

        await updateDoc(docRef, data);

        await logAction({
            action: 'update',
            collectionName,
            documentId: id,
            userEmail: userEmail,
            oldData: oldData ? serializePersonnelData(oldData) : undefined,
            newData: serializePersonnelData(data),
        });
        revalidatePath('/dashboard/operators');
    } catch (error) {
        console.error("Error updating personnel:", error);
        throw new Error("Failed to update personnel.");
    }
}

export async function deletePersonnel(collectionName: string, id: string, userEmail: string) {
    try {
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        const oldData = docSnap.exists() ? docSnap.data() : null;

        await deleteDoc(docRef);

        if (oldData) {
            await logAction({
                action: 'delete',
                collectionName,
                documentId: id,
                userEmail: userEmail,
                oldData: serializePersonnelData(oldData),
            });
        }
        revalidatePath('/dashboard/operators');
    } catch (error) {
        console.error("Error deleting personnel:", error);
        throw new Error("Failed to delete personnel.");
    }
}

    