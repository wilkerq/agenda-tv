
'use server';

import { getAdminDb } from './firebase-admin';
import { logAction } from './audit-log';
import { suggestTeam } from '@/engine/suggest-team-flow';
import type { Event, ScrapedEvent, Personnel, ProductionPersonnel } from './types';
import { Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

/**
 * Fetches all personnel from specified collections.
 * Used to provide the suggestion engine with available team members.
 */
async function getPersonnelPools() {
    const db = getAdminDb();
    const [transmissionOpsSnap, cineReportersSnap, productionPersonnelSnap] = await Promise.all([
        db.collection('transmission_operators').get(),
        db.collection('cinematographic_reporters').get(),
        db.collection('production_personnel').get(),
    ]);

    const transmissionOps: Personnel[] = transmissionOpsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Personnel));
    const cinematographicReporters: Personnel[] = cineReportersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Personnel));
    const productionPersonnel: ProductionPersonnel[] = productionPersonnelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductionPersonnel));

    const reporters = productionPersonnel.filter(p => p.isReporter);
    const producers = productionPersonnel.filter(p => p.isProducer);

    return { transmissionOps, cinematographicReporters, reporters, producers };
}

/**
 * Synchronizes events from an external source (like n8n).
 * Creates new events, updates existing ones, and flags potentially cancelled events.
 */
export async function syncExternalEvents(events: ScrapedEvent[]): Promise<{ summary: string }> {
    const db = getAdminDb();
    const batch = db.batch();
    const batchId = `sync-${Date.now()}`;
    const userEmail = 'n8n-sync-system'; // System user for logging

    let createdCount = 0;
    let updatedCount = 0;
    let alertedCount = 0;

    const receivedExternalIds = new Set(events.map(e => e.externalId));
    const { transmissionOps, cinematographicReporters, reporters, producers } = await getPersonnelPools();

    // 1. Process incoming events
    for (const scrapedEvent of events) {
        const eventsCollection = db.collection('events');
        const query = eventsCollection.where('externalId', '==', scrapedEvent.externalId).limit(1);
        const existingEventSnap = await query.get();

        const eventDateTime = new Date(`${scrapedEvent.date}T${scrapedEvent.time}`);

        if (existingEventSnap.empty) {
            // Event doesn't exist, create it
            const newEventRef = eventsCollection.doc();
            
            const eventForSuggestion = {
                name: scrapedEvent.name,
                date: eventDateTime.toISOString(),
                time: scrapedEvent.time,
                location: scrapedEvent.location,
                transmissionTypes: ['youtube'], // Default for scraped events
            };

            const allEvents = (await db.collection('events').get()).docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

            const teamSuggestion = await suggestTeam({
                ...eventForSuggestion,
                operators: transmissionOps,
                cinematographicReporters,
                reporters,
                producers,
                eventsToday: allEvents.filter(e => new Date(e.date).toDateString() === eventDateTime.toDateString()),
                allFutureEvents: allEvents.filter(e => new Date(e.date) > new Date()),
            });

            const newEventData: Partial<Event> = {
                name: scrapedEvent.name,
                date: Timestamp.fromDate(eventDateTime),
                location: scrapedEvent.location,
                externalId: scrapedEvent.externalId,
                origin: 'n8n',
                status: 'Pendente',
                color: `hsl(${Math.random() * 360}, 70%, 80%)`, // Lighter color for pending
                transmission: ['youtube'],
                transmissionOperator: teamSuggestion.transmissionOperator || null,
                cinematographicReporter: teamSuggestion.cinematographicReporter || null,
                reporter: teamSuggestion.reporter || null,
                producer: teamSuggestion.producer || null,
            };
            
            batch.set(newEventRef, newEventData);
            createdCount++;

        } else {
            // Event exists, update it if necessary (optional logic)
            const doc = existingEventSnap.docs[0];
            const existingData = doc.data() as Event;
            // Example update logic: if name or time changes
            if (existingData.name !== scrapedEvent.name || existingData.location !== scrapedEvent.location) {
                batch.update(doc.ref, { name: scrapedEvent.name, location: scrapedEvent.location, date: Timestamp.fromDate(eventDateTime) });
                updatedCount++;
            }
        }
    }

    // 2. Detect and flag cancelled events
    const futureN8nEventsQuery = db.collection('events')
                                    .where('origin', '==', 'n8n')
                                    .where('date', '>=', Timestamp.now());
    
    const futureN8nEventsSnap = await futureN8nEventsQuery.get();

    for (const doc of futureN8nEventsSnap.docs) {
        const eventId = doc.data().externalId;
        if (!receivedExternalIds.has(eventId)) {
            // This event was not in the latest scrape, flag it
            batch.update(doc.ref, { status: 'Alerta' });
            alertedCount++;
        }
    }

    await batch.commit();

    // Revalidate paths to update caches on the client
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/approvals');

    return {
        summary: `Sincronização concluída. Criados: ${createdCount}, Atualizados: ${updatedCount}, Alertas de Cancelamento: ${alertedCount}.`
    };
}
