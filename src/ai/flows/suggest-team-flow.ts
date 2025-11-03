'use server';
/**
 * @fileOverview A flow for suggesting an event team.
 * - suggestTeam - A function that suggests a team based on event details.
 */
import { suggestTeam as suggestTeamLogic } from '@/lib/suggestion-logic';
import { SuggestTeamInput, SuggestTeamOutput, type TransmissionType } from '@/lib/types';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const serviceAccount = {
  "type": "service_account",
  "project_id": "agenda-news-room-4491522-e400a",
  "private_key_id": "6d36a8585e50522b64a275466804d9c73336d3c0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZg8eG48a7b94j\n4YJt4P9p7bH3EwYI4I/d5b5a4g6K5e6E8F6n6v6H5G4D3C2B1A0/9F8H7J6K4I5h\n4G3E2D1B0A9g8c7b6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a2b1a0/8f7e6d5c4b3a298h\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-7k1q1@agenda-news-room-4491522-e400a.iam.gserviceaccount.com",
  "client_id": "108518939417235213251",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7k1q1%40agenda-news-room-4491522-e400a.iam.gserviceaccount.com"
};

let adminApp: App;
function initializeAdminApp() {
    if (!getApps().length) {
        adminApp = initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        adminApp = getApps()[0]!;
    }
}
initializeAdminApp();
const adminDb = getFirestore(adminApp);


// Helper to fetch personnel data
const fetchPersonnel = async (collectionName: string) => {
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
