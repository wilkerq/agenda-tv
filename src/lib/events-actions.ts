
'use server';

import { adminDb } from '@/lib/audit-log';
import type { ReschedulingSuggestion } from './types';
import { logAction } from './audit-log';

/**
 * Executes rescheduling changes in Firestore after user approval.
 */
export async function reallocateConflictingEvents(
    suggestions: ReschedulingSuggestion[],
    adminUserEmail: string
): Promise<{ success: boolean; message: string; updatedIds: string[] }> {
    
    if (!adminDb) {
        throw new Error("A conexão com o banco de dados do administrador não está disponível.");
    }

    if (!suggestions || suggestions.length === 0) {
        return { success: false, message: "Nenhuma sugestão fornecida.", updatedIds: [] };
    }

    const batch = adminDb.batch();
    const updatedEventIds: string[] = [];
    const batchId = `reallocate-${Date.now()}`;

    try {
        for (const sug of suggestions) {
            const eventRef = adminDb.collection('events').doc(sug.conflictingEventId);
            
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
        return {
            success: false,
            message: "Falha ao executar o reescalonamento no banco de dados.",
            updatedIds: [],
        };
    }
}
