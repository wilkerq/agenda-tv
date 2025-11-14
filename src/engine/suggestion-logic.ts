
/**
 * @deprecated This file is deprecated and its logic has been superseded by src/engine/stepwise-scheduler.ts.
 * It is kept for reference during the transition and will be removed in a future update.
 */
import type { EventInput, Personnel, ProductionPersonnel } from '@/lib/types';
import { getEventTurn, isPersonBusy } from './schedule.utils';
import { ScheduleConfig } from './schedule.config';

// Define a type for the result
export type SuggestionResult = {
  transmissionOperator: string | null;
  cinematographicReporter: string | null;
  reporter: string | null;
  producer: string | null;
  reason?: string[];
};

// Main logic function
export function suggestTeamLogic(params: {
    event: EventInput;
    transmissionOps: Personnel[];
    cinematographicReporters: Personnel[];
    reporters: ProductionPersonnel[];
    producers: ProductionPersonnel[];
    allEvents: EventInput[];
}): SuggestionResult {
    const { event, transmissionOps, cinematographicReporters, reporters, producers, allEvents } = params;
    
    const eventDate = new Date(event.date);
    const eventTurn = getEventTurn(eventDate);
    const eventsToday = allEvents.filter(e => e.id !== event.id && new Date(e.date).toDateString() === eventDate.toDateString());

    const findAvailablePerson = (pool: Personnel[], role: string): Personnel | null => {
        const available = pool.filter(person => {
            const personTurn = (person as any).turn; // 'turn' is the correct field
            const isTurnCompatible = !personTurn || personTurn === 'Geral' || personTurn === eventTurn;
            const isBusy = isPersonBusy(person.name, eventDate, eventsToday as any);
            return isTurnCompatible && !isBusy;
        });

        // Simple fairness: find the one with the fewest events today
        available.sort((a, b) => {
            const countA = eventsToday.filter(e => Object.values(e).includes(a.name)).length;
            const countB = eventsToday.filter(e => Object.values(e).includes(b.name)).length;
            return countA - countB;
        });
        
        return available.length > 0 ? available[0] : null;
    };

    const suggestedTransmissionOp = findAvailablePerson(transmissionOps, "transmissionOperator");
    const suggestedCineReporter = findAvailablePerson(cinematographicReporters, "cinematographicReporter");
    const suggestedReporter = findAvailablePerson(reporters, "reporter");
    const suggestedProducer = findAvailablePerson(producers, "producer");

    return {
        transmissionOperator: suggestedTransmissionOp?.name || null,
        cinematographicReporter: suggestedCineReporter?.name || null,
        reporter: suggestedReporter?.name || null,
        producer: suggestedProducer?.name || null,
        reason: ["Initial logic based on turn and availability."],
    };
}
