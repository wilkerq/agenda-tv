
'use server';

import { writeBatch, doc, Firestore } from 'firebase/firestore';
import type { ReschedulingSuggestion } from './types';
import { logAction } from './audit-log';

/**
 * Executes rescheduling changes in Firestore after user approval.
 */
export async function reallocateConflictingEvents(
    db: Firestore, // Now requires the client db instance
    suggestions: ReschedulingSuggestion[],
    adminUserEmail: string
): Promise<{ success: boolean; message: string; updatedIds: string[] }> {
    
    if (!suggestions || suggestions.length === 0) {
        return { success: false, message: "Nenhuma sugestão fornecida.", updatedIds: [] };
    }

    const batch = writeBatch(db);
    const updatedEventIds: string[] = [];
    const batchId = `reallocate-${Date.now()}`;

    try {
        for (const sug of suggestions) {
            const eventRef = doc(db, 'events', sug.conflictingEventId);
            
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

        return {
            success: true,
            message: `Reescalonamento concluído. ${updatedEventIds.length} eventos foram atualizados.`,
            updatedIds: updatedEventIds,
        };

    } catch (error) {
        console.error("Erro ao reescalonar eventos no Firestore:", error);
        // This will now be caught by the global error handler if it's a permission issue
        throw error;
    }
}
