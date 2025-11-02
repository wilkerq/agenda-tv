'use server';
/**
 * @fileOverview A flow for suggesting an event team.
 * - suggestTeam - A function that suggests a team based on event details.
 */
import { suggestTeam as suggestTeamLogic } from '@/lib/suggestion-logic';
import { SuggestTeamInput, SuggestTeamOutput, type TransmissionType } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { getAdminDb } from '@/lib/firebase-admin';


// Helper to fetch personnel data
const fetchPersonnel = async (collectionName: string) => {
    const adminDb = getAdminDb();
    const personnelCollectionRef = adminDb.collection(collectionName);
    try {
        const snapshot = await personnelCollectionRef.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (serverError) {
        console.error(`Error fetching from ${collectionName}:`, serverError);
        throw new Error(`Failed to fetch from ${collectionName}`);
    }
};

// Helper to fetch events for a specific day or all future events
const getEvents = async (date?: Date): Promise<any[]> => {
    const adminDb = getAdminDb();
    const eventsCollectionRef = adminDb.collection('events');
    let q: FirebaseFirestore.Query;

    if (date) {
        const start = startOfDay(date);
        const end = endOfDay(date);
        q = eventsCollectionRef
            .where('date', '>=', Timestamp.fromDate(start))
            .where('date', '<=', Timestamp.fromDate(end));
    } else {
        q = eventsCollectionRef
            .where('date', '>=', Timestamp.fromDate(startOfDay(new Date())));
    }
    
     try {
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date ? (data.date as Timestamp).toDate().toISOString() : null,
                departure: data.departure ? (data.departure as Timestamp).toDate().toISOString() : null,
                arrival: data.arrival ? (data.arrival as Timestamp).toDate().toISOString() : null,
            }
        });
    } catch (serverError) {
        console.error(`Error fetching events:`, serverError);
        throw new Error(`Failed to fetch events`);
    }
};


export const suggestTeam = async (input: SuggestTeamInput): Promise<SuggestTeamOutput> => {
    const [
        operators,
        cinematographicReporters,
        productionPersonnel,
        eventsToday,
        allFutureEvents,
    ] = await Promise.all([
        fetchPersonnel('transmission_operators'),
        fetchPersonnel('cinematographic_reporters'),
        fetchPersonnel('production_personnel'),
        getEvents(parseISO(input.date)),
        getEvents(),
    ]);

    const result = await suggestTeamLogic({
        ...input,
        operators: operators as any,
        cinematographicReporters: cinematographicReporters as any,
        productionPersonnel: productionPersonnel as any,
        eventsToday,
        allFutureEvents,
    });

    return {
        ...result,
        transmission: result.transmission as TransmissionType[]
    };
}
