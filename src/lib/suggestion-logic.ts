
'use server';

import { getDay, differenceInHours, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import type { TransmissionType, Event, ReschedulingSuggestion, Personnel, ProductionPersonnel } from "./types";

// ==========================================================================================
// TIPAGENS
// ==========================================================================================

interface SuggestTeamParams {
    date: string;
    departure?: string | null; // Can be null
    arrival?: string | null;   // Can be null
    location: string;
    transmissionTypes: TransmissionType[];
    
    operators?: Personnel[];
    cinematographicReporters?: Personnel[];
    reporters?: Personnel[];
    producers?: Personnel[];
    
    eventsToday?: Event[];
    allFutureEvents?: Event[];
}

type RoleKey = 'transmissionOperator' | 'cinematographicReporter' | 'reporter' | 'producer';


// ==========================================================================================
// FUNÇÕES HELPER
// ==========================================================================================

const getEventTurn = (date: Date): 'Manhã' | 'Tarde' | 'Noite' => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    return 'Noite';
};

/** Calculates the daily workload for each person based on events of the day */
const getDailyWorkload = (personnel: (Personnel | ProductionPersonnel)[], events: Event[], role: RoleKey): Map<string, number> => {
    const workload = new Map<string, number>();
    personnel.forEach(p => workload.set(p.name, 0));

    events.forEach(event => {
        const personName = event[role as keyof Event] as string | undefined;
        if (personName && workload.has(personName)) {
            workload.set(personName, workload.get(personName)! + 1);
        }
    });
    return workload;
};

/** Calculates the trip workload for each person based on all future events */
const getTripWorkload = (personnel: Personnel[], futureEvents: Event[], role: RoleKey): Map<string, number> => {
    const tripWorkload = new Map<string, number>();
    personnel.forEach(p => tripWorkload.set(p.name, 0));

    futureEvents.forEach(event => {
        if (event.transmission.includes('viagem')) {
            const personName = event[role as keyof Event] as string | undefined;
            if (personName && tripWorkload.has(personName)) {
                tripWorkload.set(personName, tripWorkload.get(personName)! + 1);
            }
        }
    });
    return tripWorkload;
};

/** Core suggestion function with strict turn and workload logic */
const getSuggestion = (
    personnel: Personnel[],
    workload: Map<string, number>,
    eventTurn: 'Manhã' | 'Tarde' | 'Noite',
    alreadyAssigned: Set<string>
): Personnel | undefined => {
    
    const eventDate = new Date(); // Using current date just to get day of week
    const isWeekend = getDay(eventDate) === 0 || getDay(eventDate) === 6;

    // Filter out already assigned people
    const availablePersonnel = personnel.filter(p => !alreadyAssigned.has(p.name));
    
    // 1. Prioritize specialists for the specific turn
    const turnSpecialists = availablePersonnel.filter(p => p.turn === eventTurn);
    if (turnSpecialists.length > 0) {
        // Sort by workload (ascending) and return the first one
        turnSpecialists.sort((a, b) => (workload.get(a.name) ?? 0) - (workload.get(b.name) ?? 0));
        return turnSpecialists[0];
    }
    
    // 2. If no specialists, use 'Geral' personnel as backup
    const generalists = availablePersonnel.filter(p => p.turn === 'Geral');
    if (generalists.length > 0) {
        // Sort by workload and return the first one
        generalists.sort((a, b) => (workload.get(a.name) ?? 0) - (workload.get(b.name) ?? 0));
        return generalists[0];
    }
    
    // 3. For weekends, consider anyone available if no specialists or generalists are found
    if(isWeekend && availablePersonnel.length > 0) {
        availablePersonnel.sort((a, b) => (workload.get(a.name) ?? 0) - (workload.get(b.name) ?? 0));
        return availablePersonnel[0];
    }
    
    // 4. If no one is found, return undefined
    return undefined;
};


/** Finds events that conflict with a trip and suggests replacements. */
const findReschedulingSuggestions = (
    personName: string,
    roleKey: RoleKey,
    tripStartDate: Date,
    tripEndDate: Date,
    allFutureEvents: Event[],
    allPersonnel: {
        operators: Personnel[],
        cinematographers: Personnel[],
        reporters: Personnel[],
        producers: Personnel[]
    }
): ReschedulingSuggestion[] => {
    
    const suggestions: ReschedulingSuggestion[] = [];
    const tripInterval = { start: tripStartDate, end: tripEndDate };

    const conflictingEvents = allFutureEvents.filter(event => {
        const isAssigned = (event[roleKey as keyof Event] as string) === personName;
        if (!isAssigned) return false;
        
        const eventDate = new Date(event.date); // Date is already a Date object
        const conflicts = isWithinInterval(eventDate, tripInterval);
        
        const isLocalEvent = !event.transmission.includes('viagem');

        return conflicts && isLocalEvent;
    });

    for (const conflict of conflictingEvents) {
        const conflictDate = new Date(conflict.date);
        const eventTurn = getEventTurn(conflictDate);
        const eventsOnConflictDay = allFutureEvents.filter(e => isSameDay(new Date(e.date), conflictDate));
        
        let pool: Personnel[] = [];
        let workload: Map<string, number>;
        
        switch(roleKey) {
            case 'transmissionOperator':
                pool = allPersonnel.operators;
                workload = getDailyWorkload(pool, eventsOnConflictDay, 'transmissionOperator');
                break;
            case 'cinematographicReporter':
                pool = allPersonnel.cinematographers;
                workload = getDailyWorkload(pool, eventsOnConflictDay, 'cinematographicReporter');
                break;
            case 'reporter':
                pool = allPersonnel.reporters;
                workload = getDailyWorkload(pool, eventsOnConflictDay, 'reporter');
                break;
            case 'producer':
                pool = allPersonnel.producers;
                workload = getDailyWorkload(pool, eventsOnConflictDay, 'producer');
                break;
        }

        // Try to find a replacement, excluding the person who is on the trip
        const replacement = getSuggestion(pool, workload, eventTurn, new Set([personName]));
        
        suggestions.push({
            conflictingEventId: conflict.id,
            conflictingEventTitle: conflict.name,
            personToMove: personName,
            suggestedReplacement: replacement?.name,
            role: roleKey,
        });
    }

    return suggestions;
};

// ==========================================================================================
// FUNÇÃO PRINCIPAL
// ==========================================================================================

export const suggestTeam = async (params: SuggestTeamParams) => {
    const { 
      date,
      departure,
      arrival,
      location, 
      operators = [], 
      cinematographicReporters = [], 
      reporters = [],
      producers = [],
      eventsToday = [],
      allFutureEvents = []
    } = params;

    const eventDate = parseISO(date);
    const eventTurn = getEventTurn(eventDate);
    const eventDeparture = departure ? parseISO(departure) : null;
    const eventArrival = arrival ? parseISO(arrival) : null;

    const isTrip = params.transmissionTypes.includes('viagem') || (eventDeparture && eventArrival && differenceInHours(eventArrival, eventDeparture) > 10);
    const isCCJR = location === "Sala Julio da Retifica \"CCJR\"";
    
    // People assigned to THIS specific event, to avoid suggesting same person for two roles.
    const assignedForThisEvent = new Set<string>();

    let suggestedOperator: string | undefined;
    let suggestedCinematographer: string | undefined;
    let suggestedReporter: string | undefined;
    let suggestedProducer: string | undefined;
    const reschedulingSuggestions: ReschedulingSuggestion[] = [];

    try {
        if (isTrip) {
            // --- LÓGICA PARA VIAGENS ---
            const opTripWorkload = getTripWorkload(operators, allFutureEvents, 'transmissionOperator');
            const cineTripWorkload = getTripWorkload(cinematographicReporters, allFutureEvents, 'cinematographicReporter');
            const reporterTripWorkload = getTripWorkload(reporters, allFutureEvents, 'reporter');
            const producerTripWorkload = getTripWorkload(producers, allFutureEvents, 'producer');
            
            const sortedOps = operators.sort((a,b) => (opTripWorkload.get(a.name) ?? 0) - (opTripWorkload.get(b.name) ?? 0));
            suggestedOperator = sortedOps[0]?.name;
            if(suggestedOperator) assignedForThisEvent.add(suggestedOperator);
            
            const sortedCines = cinematographicReporters.filter(c => !assignedForThisEvent.has(c.name)).sort((a,b) => (cineTripWorkload.get(a.name) ?? 0) - (cineTripWorkload.get(b.name) ?? 0));
            suggestedCinematographer = sortedCines[0]?.name;
            if(suggestedCinematographer) assignedForThisEvent.add(suggestedCinematographer);

            const sortedReporters = reporters.filter(p => !assignedForThisEvent.has(p.name)).sort((a,b) => (reporterTripWorkload.get(a.name) ?? 0) - (reporterTripWorkload.get(b.name) ?? 0));
            suggestedReporter = sortedReporters[0]?.name;
            if(suggestedReporter) assignedForThisEvent.add(suggestedReporter);

            const sortedProducers = producers.filter(p => !assignedForThisEvent.has(p.name)).sort((a,b) => (producerTripWorkload.get(a.name) ?? 0) - (producerTripWorkload.get(b.name) ?? 0));
            suggestedProducer = sortedProducers[0]?.name;

            // Find conflicts and suggest reallocations
            if (eventDeparture && eventArrival) {
                const allPersonnel = { operators, cinematographers: cinematographicReporters, reporters, producers };
                if(suggestedOperator) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedOperator, 'transmissionOperator', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedCinematographer) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedCinematographer, 'cinematographicReporter', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedReporter) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedReporter, 'reporter', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedProducer) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedProducer, 'producer', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
            }

        } else {
            // --- LÓGICA PARA EVENTOS LOCAIS ---
            const opWorkload = getDailyWorkload(operators, eventsToday, 'transmissionOperator');
            const cineWorkload = getDailyWorkload(cinematographicReporters, eventsToday, 'cinematographicReporter');
            const reporterWorkload = getDailyWorkload(reporters, eventsToday, 'reporter');
            const producerWorkload = getDailyWorkload(producers, eventsToday, 'producer');

            // Suggest Operator
            if (isCCJR) {
                suggestedOperator = "Rodrigo Sousa";
            } else {
                const operator = getSuggestion(operators, opWorkload, eventTurn, assignedForThisEvent);
                suggestedOperator = operator?.name;
            }
            if(suggestedOperator) assignedForThisEvent.add(suggestedOperator);
            
            // Suggest Cinematographer
            const cinematographer = getSuggestion(cinematographicReporters, cineWorkload, eventTurn, assignedForThisEvent);
            suggestedCinematographer = cinematographer?.name;
            if(suggestedCinematographer) assignedForThisEvent.add(suggestedCinematographer);

            // Suggest Reporter
            const reporter = getSuggestion(reporters, reporterWorkload, eventTurn, assignedForThisEvent);
            suggestedReporter = reporter?.name;
            if(suggestedReporter) assignedForThisEvent.add(suggestedReporter);

            // Suggest Producer
            const producer = getSuggestion(producers, producerWorkload, eventTurn, assignedForThisEvent);
            suggestedProducer = producer?.name;
        }

        // --- Retorno ---
        return {
            transmissionOperator: suggestedOperator,
            cinematographicReporter: suggestedCinematographer,
            reporter: suggestedReporter,
            producer: suggestedProducer,
            transmission: location === "Plenário Iris Rezende Machado" ? ["tv" as TransmissionType, "youtube" as TransmissionType] : ["youtube" as TransmissionType],
            reschedulingSuggestions: reschedulingSuggestions.length > 0 ? reschedulingSuggestions : undefined,
        };

    } catch (error) {
        console.error("An unexpected error occurred in suggestTeam logic:", error);
        throw new Error("Failed to suggest team due to an unexpected logic error.");
    }
};

