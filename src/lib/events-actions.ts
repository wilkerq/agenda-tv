
'use server';

import { getAdminDb } from './firebase-admin';
import { logAction } from './audit-log';
import type { EventFormData, RepeatSettings, ReschedulingSuggestion } from './types';
import { add } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';

const serializeEventData = (data: EventFormData) => {
  const serialized: any = {};
  for (const key in data) {
    const value = (data as any)[key];
    if (value !== undefined) {
      serialized[key] = value;
    }
  }

  // Convert Firestore Timestamps to JS Dates before calling toISOString
  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Timestamp) return value.toDate();
    if (value instanceof Date) return value;
    try {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) return parsed;
    } catch {}
    return null;
  };

  const date = toDate(serialized.date);
  const departure = toDate(serialized.departure);
  const arrival = toDate(serialized.arrival);

  if (date) serialized.date = date.toISOString();
  if (departure) serialized.departure = departure.toISOString();
  if (arrival) serialized.arrival = arrival.toISOString();
  
  return serialized;
};


export async function addEventAction(eventData: EventFormData, userEmail: string, repeatSettings?: RepeatSettings) {
  const db = getAdminDb();
  const batch = db.batch();
  const batchId = `add-${Date.now()}`;

  const eventsToAdd: EventFormData[] = [eventData];

  if (repeatSettings) {
    let lastDate = eventData.date;
    for (let i = 0; i < repeatSettings.count; i++) {
      let nextDate;
      switch (repeatSettings.frequency) {
        case 'daily':
          nextDate = add(lastDate, { days: 1 });
          break;
        case 'weekly':
          nextDate = add(lastDate, { weeks: 1 });
          break;
        case 'monthly':
          nextDate = add(lastDate, { months: 1 });
          break;
      }
      eventsToAdd.push({ ...eventData, date: nextDate });
      lastDate = nextDate;
    }
  }
  
  eventsToAdd.forEach(event => {
      const newEventRef = db.collection('events').doc();
      batch.set(newEventRef, {
        ...event,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`, // Add color on server
      });
      logAction({
          action: 'create',
          collectionName: 'events',
          documentId: newEventRef.id,
          userEmail: userEmail,
          newData: serializeEventData(event),
          batchId: batchId
      });
  });

  await batch.commit();
  revalidatePath('/dashboard');
}

export async function updateEventAction(eventId: string, eventData: EventFormData, userEmail: string) {
  const db = getAdminDb();
  const eventRef = db.collection('events').doc(eventId);
  
  const docSnap = await eventRef.get();
  const oldData = docSnap.exists ? docSnap.data() : null;

  await eventRef.update({ ...eventData });

  if (oldData) {
    await logAction({
        action: 'update',
        collectionName: 'events',
        documentId: eventId,
        userEmail: userEmail,
        oldData: serializeEventData(oldData as EventFormData),
        newData: serializeEventData(eventData),
    });
  }
  revalidatePath('/dashboard');
}

export async function deleteEventAction(eventId: string, userEmail: string) {
    const db = getAdminDb();
    const eventRef = db.collection('events').doc(eventId);
    
    const docSnap = await eventRef.get();
    const oldData = docSnap.exists ? docSnap.data() : null;

    await eventRef.delete();
    
    if (oldData) {
        await logAction({
            action: 'delete',
            collectionName: 'events',
            documentId: eventId,
            userEmail: userEmail,
            oldData: serializeEventData(oldData as EventFormData),
        });
    }
    revalidatePath('/dashboard');
}

export async function reallocateConflictingEvents(
    suggestions: ReschedulingSuggestion[],
    adminUserEmail: string
): Promise<{ success: boolean; message: string; updatedIds: string[] }> {
    
    const db = getAdminDb();

    if (!suggestions || suggestions.length === 0) {
        return { success: false, message: "Nenhuma sugestão fornecida.", updatedIds: [] };
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
            
            // Log a ação de reallocaçãp
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
            updatedIds: updatedEventIds,
        };

    } catch (error) {
        console.error("Erro ao reescalonar eventos no Firestore (Admin SDK):", error);
        throw error; // Lança o erro para ser pego pelo chamador da Server Action
    }
}
