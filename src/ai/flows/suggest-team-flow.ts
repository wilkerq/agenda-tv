
'use server';
/**
 * @fileOverview A flow for suggesting an event team.
 * - suggestTeam - A function that suggests a team based on event details.
 */

import { ai } from '@/ai/genkit';
import { suggestTeam as suggestTeamLogic } from '@/lib/suggestion-logic';
import { SuggestTeamInput, SuggestTeamInputSchema, SuggestTeamOutput, SuggestTeamOutputSchema, type TransmissionType } from '@/lib/types';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';

export async function suggestTeam(input: SuggestTeamInput): Promise<SuggestTeamOutput> {
    return suggestTeamFlow(input);
}

// Helper to fetch personnel data
const fetchPersonnel = async (collectionName: string) => {
    const personnelCollectionRef = collection(db, collectionName);
    try {
        const snapshot = await getDocs(personnelCollectionRef);
        // Correctly spread the document data along with the ID
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: personnelCollectionRef.path,
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        // Re-throw the original error to stop execution
        throw serverError;
    }
};

// Helper to fetch events for a specific day
const getEventsForDay = async (date: Date): Promise<any[]> => {
    const start = startOfDay(date);
    const end = endOfDay(date);

    const eventsCollectionRef = collection(db, 'events');
    const q = query(
      eventsCollectionRef,
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end))
    );
     try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Serialize date objects to strings for the logic function
            return {
                ...data,
                date: data.date ? (data.date as Timestamp).toDate().toISOString() : null,
                departure: data.departure ? (data.departure as Timestamp).toDate().toISOString() : null,
                arrival: data.arrival ? (data.arrival as Timestamp).toDate().toISOString() : null,
            }
        });
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: eventsCollectionRef.path,
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    }
};


export const suggestTeamFlow = ai.defineFlow(
    {
        name: 'suggestTeamFlow',
        inputSchema: SuggestTeamInputSchema,
        outputSchema: SuggestTeamOutputSchema,
    },
    async (input) => {
        // This flow now fetches all required data before calling the business logic.
        const [
            operators,
            cinematographicReporters,
            productionPersonnel,
            eventsToday
        ] = await Promise.all([
            fetchPersonnel('transmission_operators'),
            fetchPersonnel('cinematographic_reporters'),
            fetchPersonnel('production_personnel'),
            getEventsForDay(parseISO(input.date))
        ]);

        const result = await suggestTeamLogic({
            ...input,
            operators: operators as any,
            cinematographicReporters: cinematographicReporters as any,
            productionPersonnel: productionPersonnel as any,
            eventsToday
        });

        // Ensure the returned transmission type matches the schema
        return {
            ...result,
            transmission: result.transmission as TransmissionType[]
        };
    }
);
