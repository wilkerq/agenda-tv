
'use server';

import { getAdminDb, isAdminSDKInitialized } from './firebase-admin';
import { logAction } from './audit-log';
import type { EventFormData, RepeatSettings, ReschedulingSuggestion } from './types';
import { revalidatePath } from 'next/cache';
import { add } from 'date-fns';
import { getRandomColor } from './utils';

// Helper to serialize event data for logging
const serializeEventData = (data: any) => {
  const serialized: any = {};
  for (const key in data) {
    const value = data[key];
    if (value instanceof Date) {
      serialized[key] = value.toISOString();
    } else if (value !== null && value !== undefined) {
      serialized[key] = value;
    }
  }
  return serialized;
};


export async function addEventAction(eventData: EventFormData, userEmail: string, repeatSettings?: RepeatSettings): Promise<{ success: boolean, message: string }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "O serviço está indisponível. Tente novamente mais tarde." };
    }
    
    const db = getAdminDb();
    const isTravel = eventData.transmission?.includes('viagem');

    try {
        if (!repeatSettings || !repeatSettings.frequency || !repeatSettings.count) {
            // Single event
            const newEventData = {
                ...eventData,
                color: isTravel ? '#dc2626' : getRandomColor(),
            };
            const docRef = await db.collection('events').add(newEventData);
            
            await logAction({
                action: 'create',
                collectionName: 'events',
                documentId: docRef.id,
                userEmail: userEmail,
                newData: serializeEventData(eventData),
            });
            revalidatePath('/dashboard');
            return { success: true, message: 'O evento foi adicionado à agenda.' };

        } else {
            // Recurring event
            const batch = db.batch();
            let currentDate = new Date(eventData.date);
            const batchId = `recurring-${Date.now()}`;
            
            for (let i = 0; i < repeatSettings.count; i++) {
                const newEventRef = db.collection('events').doc();
                const newEventData = { ...eventData, date: currentDate, color: isTravel ? '#dc2626' : getRandomColor() };
                batch.set(newEventRef, newEventData);

                await logAction({ 
                    action: 'create', 
                    collectionName: 'events', 
                    documentId: newEventRef.id, 
                    userEmail: userEmail, 
                    newData: serializeEventData({...eventData, date: currentDate }), 
                    batchId 
                });

                if (repeatSettings.frequency === 'daily') currentDate = add(currentDate, { days: 1 });
                else if (repeatSettings.frequency === 'weekly') currentDate = add(currentDate, { weeks: 1 });
                else if (repeatSettings.frequency === 'monthly') currentDate = add(currentDate, { months: 1 });
            }

            await batch.commit();
            revalidatePath('/dashboard');
            return { success: true, message: 'O evento e suas repetições foram adicionados.' };
        }
    } catch (error: any) {
        console.error("Error in addEventAction:", error);
        return { success: false, message: error.message || "Não foi possível salvar o evento." };
    }
}


export async function updateEventAction(eventId: string, eventData: EventFormData, userEmail: string): Promise<{ success: boolean, message: string }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "O serviço está indisponível. Tente novamente mais tarde." };
    }
    
    const db = getAdminDb();
    const eventRef = db.collection('events').doc(eventId);
    
    try {
        const eventSnap = await eventRef.get();
        if (!eventSnap.exists) {
            return { success: false, message: "Evento não encontrado." };
        }
        const oldData = eventSnap.data()!;
        
        const isTravel = eventData.transmission?.includes('viagem');
        const updatedData = {
            ...eventData,
            color: isTravel ? '#dc2626' : oldData.color || getRandomColor(),
        };

        await eventRef.update(updatedData);

        await logAction({
            action: 'update',
            collectionName: 'events',
            documentId: eventId,
            userEmail: userEmail,
            oldData: serializeEventData(oldData),
            newData: serializeEventData(eventData),
        });
        
        revalidatePath('/dashboard');
        return { success: true, message: "O evento foi atualizado com sucesso." };

    } catch (error: any) {
        console.error("Error in updateEventAction:", error);
        return { success: false, message: error.message || "Não foi possível atualizar o evento." };
    }
}

export async function deleteEventAction(eventId: string, userEmail: string): Promise<{ success: boolean, message: string }> {
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "O serviço está indisponível. Tente novamente mais tarde." };
    }
    const db = getAdminDb();
    const eventRef = db.collection('events').doc(eventId);

    try {
        const eventSnap = await eventRef.get();
        if (!eventSnap.exists) {
            return { success: false, message: "Evento não encontrado para exclusão." };
        }
        const oldData = eventSnap.data();

        await eventRef.delete();

        await logAction({
            action: 'delete',
            collectionName: 'events',
            documentId: eventId,
            userEmail: userEmail,
            oldData: serializeEventData(oldData),
        });

        revalidatePath('/dashboard');
        return { success: true, message: "O evento foi removido da agenda com sucesso." };

    } catch (error: any) {
        console.error("Error in deleteEventAction:", error);
        return { success: false, message: error.message || "Não foi possível excluir o evento." };
    }
}

export async function reallocateConflictingEventsAction(
    suggestions: ReschedulingSuggestion[],
    adminUserEmail: string
): Promise<{ success: boolean; message: string; }> {
    
    if (!isAdminSDKInitialized()) {
        return { success: false, message: "O serviço está indisponível." };
    }
    const db = getAdminDb();

    if (!suggestions || suggestions.length === 0) {
        return { success: false, message: "Nenhuma sugestão fornecida." };
    }

    const batch = db.batch();
    const updatedEventIds: string[] = [];
    const batchId = `reallocate-${Date.now()}`;

    try {
        for (const sug of suggestions) {
            const eventRef = db.collection('events').doc(sug.conflictingEventId);
            
            const fieldToUpdate = sug.role;
            const replacementValue = sug.suggestedReplacement || null;

            batch.update(eventRef, {
                [fieldToUpdate]: replacementValue
            });

            updatedEventIds.push(sug.conflictingEventId);
            
            await logAction({
                action: 'reallocate',
                collectionName: 'events',
                documentId: sug.conflictingEventId,
                userEmail: adminUserEmail,
                details: {
                    originalPerson: sug.personToMove,
                    newPerson: replacementValue,
                    role: fieldToUpdate,
                    reason: 'Travel conflict resolution.'
                },
                batchId,
            });
        }

        await batch.commit();
        revalidatePath('/dashboard');

        return {
            success: true,
            message: `Reescalonamento concluído. ${updatedEventIds.length} eventos foram atualizados.`,
        };

    } catch (error: any) {
        console.error("Erro ao reescalonar eventos:", error);
        return { success: false, message: error.message || 'Falha ao reescalonar eventos.' };
    }
}

    