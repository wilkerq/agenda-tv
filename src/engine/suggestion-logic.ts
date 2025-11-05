
'use server';

import { getDay, differenceInHours, isWithinInterval, parseISO, isSameDay, differenceInDays, addHours, subHours } from 'date-fns';
import type { TransmissionType, Event, ReschedulingSuggestion, Personnel, ProductionPersonnel } from "../lib/types";
import { ScheduleConfig } from './schedule.config';
import { isPersonBusy, getEventTurn } from './schedule.utils';

// ==========================================================================================
// TIPAGENS
// ==========================================================================================

interface SuggestTeamParams {
    name: string;
    date: string;
    departure?: string | null; // Can be null
    arrival?: string | null;   // Can be null
    location: string;
    transmissionTypes: TransmissionType[];
    
    operators: Personnel[];
    cinematographicReporters: Personnel[];
    reporters: Personnel[];
    producers: Personnel[];
    
    eventsToday: Event[];
    allFutureEvents: Event[];
}

type RoleKey = 'transmissionOperator' | 'cinematographicReporter' | 'reporter' | 'producer';
type AllPersonnel = {
    operators: Personnel[],
    cinematographicReporters: Personnel[],
    reporters: Personnel[],
    producers: Personnel[]
};


// ==========================================================================================
// FUNÇÕES HELPER
// ==========================================================================================

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

const getTripDurationWorkload = (personnel: Personnel[], futureEvents: Event[], role: RoleKey): Map<string, number> => {
    const tripWorkload = new Map<string, number>();
    personnel.forEach(p => tripWorkload.set(p.name, 0));

    futureEvents.forEach(event => {
        if (event.transmission.includes('viagem') && event.departure && event.arrival) {
            const personName = event[role as keyof Event] as string | undefined;
            if (personName && tripWorkload.has(personName)) {
                const duration = differenceInDays(new Date(event.arrival), new Date(event.departure)) + 1;
                tripWorkload.set(personName, tripWorkload.get(personName)! + (duration > 0 ? duration : 1));
            }
        }
    });
    return tripWorkload;
};

const getSuggestion = (
    personnel: Personnel[] | undefined,
    workload: Map<string, number>,
    eventTurn: 'Manhã' | 'Tarde' | 'Noite',
    alreadyAssigned: Set<string>,
    eventDate: Date,
    eventsToday: Event[],
): Personnel | undefined => {
    if (!personnel || personnel.length === 0) return undefined;
    
    const isWeekend = getDay(eventDate) === 0 || getDay(eventDate) === 6;

    const availablePersonnel = personnel.filter(p => {
        const isAvailable = !alreadyAssigned.has(p.name);
        const isUnderLimit = (workload.get(p.name) ?? 0) < ScheduleConfig.MAX_HOURS_PER_DAY;
        const isNotBusy = !isPersonBusy(p.name, eventDate, eventsToday);
        return isAvailable && isUnderLimit && isNotBusy;
    });

    if (availablePersonnel.length === 0) return undefined;
    
    const sortFn = (a: Personnel, b: Personnel) => (workload.get(a.name) ?? 0) - (workload.get(b.name) ?? 0);

    const turnSpecialists = availablePersonnel.filter(p => p.turn === eventTurn).sort(sortFn);
    if (turnSpecialists.length > 0) {
        return turnSpecialists[0];
    }
    
    const generalists = availablePersonnel.filter(p => p.turn === 'Geral').sort(sortFn);
    if (generalists.length > 0) {
        return generalists[0];
    }
    
    // For weekends, be more flexible if no specialist/generalist is found
    if(isWeekend) {
        const anyAvailable = availablePersonnel.sort(sortFn);
        if (anyAvailable.length > 0) {
            return anyAvailable[0];
        }
    }
    
    return undefined;
};

const getTransmissionOperatorSuggestion = (
    params: {
        isCCJR: boolean,
        isDeputadosAqui: boolean,
        isWeekend: boolean,
        eventTurn: 'Manhã' | 'Tarde' | 'Noite',
        eventDate: Date,
        operators: Personnel[],
        opWorkload: Map<string, number>,
        assignedForThisEvent: Set<string>,
        eventsToday: Event[],
    }
): Personnel | undefined => {
    
    const { isCCJR, isDeputadosAqui, isWeekend, eventTurn, eventDate, operators, opWorkload, assignedForThisEvent, eventsToday } = params;

    if (isDeputadosAqui) {
        return operators.find(p => p.name === ScheduleConfig.FIXED_OPERATOR_DEPUTADOS_AQUI);
    }

    if (isCCJR) {
        return operators.find(p => p.name === "Mário Augusto"); 
    }

    if (isWeekend) {
        const weekendPersonnel = operators.filter(p => ScheduleConfig.WEEKEND_ROTATION.includes(p.name));
        return getSuggestion(weekendPersonnel, opWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
    }

    if (eventTurn === 'Noite') {
        const nightOperators = operators.filter(op => ScheduleConfig.NIGHT_OPERATORS.includes(op.name));
        const bruno = nightOperators.find(p => p.name === "Bruno Almeida");
        const mario = nightOperators.find(p => p.name === "Mário Augusto");

        const brunoIsBusy = eventsToday.some(e => 
            getEventTurn(new Date(e.date)) === 'Noite' && 
            e.transmissionOperator === "Bruno Almeida"
        );

        if (bruno && !brunoIsBusy && !isPersonBusy(bruno.name, eventDate, eventsToday) && !assignedForThisEvent.has(bruno.name)) {
            return bruno;
        }
        
        if (mario && !isPersonBusy(mario.name, eventDate, eventsToday) && !assignedForThisEvent.has(mario.name)) {
            return mario;
        }
    }

    return getSuggestion(operators, opWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
};

const getCinematographerSuggestion = (
    params: {
        eventTurn: 'Manhã' | 'Tarde' | 'Noite',
        eventDate: Date,
        cinematographers: Personnel[],
        cineWorkload: Map<string, number>,
        assignedForThisEvent: Set<string>,
        eventsToday: Event[],
    }
): Personnel | undefined => {
    
    const { eventTurn, eventDate, cinematographers, cineWorkload, assignedForThisEvent, eventsToday } = params;

    if (eventTurn === 'Noite') {
        const afternoonTeam = cinematographers.filter(p => p.turn === 'Tarde');
        return getSuggestion(afternoonTeam, cineWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
    }

    return getSuggestion(cinematographers, cineWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
};

const getReporterSuggestion = (
    params: {
        eventTurn: 'Manhã' | 'Tarde' | 'Noite',
        eventDate: Date,
        reporters: Personnel[],
        reporterWorkload: Map<string, number>,
        assignedForThisEvent: Set<string>,
        eventsToday: Event[],
    }
): Personnel | undefined => {
    
    const { eventTurn, eventDate, reporters, reporterWorkload, assignedForThisEvent, eventsToday } = params;

    if (eventTurn === 'Noite') {
        const nightPool = reporters.filter(p => p.turn === 'Tarde' || p.turn === 'Geral');
        return getSuggestion(nightPool, reporterWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
    }

    return getSuggestion(reporters, reporterWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
};

const findReschedulingSuggestions = (
    personName: string,
    roleKey: RoleKey,
    tripStartDate: Date,
    tripEndDate: Date,
    allFutureEvents: Event[],
    allPersonnel: AllPersonnel
): ReschedulingSuggestion[] => {
    
    const suggestions: ReschedulingSuggestion[] = [];
    const tripInterval = { start: tripStartDate, end: tripEndDate };

    const conflictingEvents = allFutureEvents.filter(event => {
        const isAssigned = (event[roleKey as keyof Event] as string) === personName;
        if (!isAssigned) return false;
        
        const eventDate = new Date(event.date);
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
                pool = allPersonnel.cinematographicReporters;
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

        const replacement = getSuggestion(pool, workload, eventTurn, new Set([personName]), conflictDate, eventsOnConflictDay);
        
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

export const suggestTeamLogic = async (params: SuggestTeamParams) => {
    const { 
      name,
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
    const isDeputadosAqui = name.toLowerCase().includes("deputados aqui");
    const isWeekend = getDay(eventDate) === 0 || getDay(eventDate) === 6;
    
    const assignedForThisEvent = new Set<string>();

    let suggestedOperator: string | undefined;
    let suggestedCinematographer: string | undefined;
    let suggestedReporter: string | undefined;
    let suggestedProducer: string | undefined;
    const reschedulingSuggestions: ReschedulingSuggestion[] = [];

    try {
        if (isTrip) {
            const opTripWorkload = getTripDurationWorkload(operators, allFutureEvents, 'transmissionOperator');
            const cineTripWorkload = getTripDurationWorkload(cinematographicReporters, allFutureEvents, 'cinematographicReporter');
            const reporterTripWorkload = getTripDurationWorkload(reporters, allFutureEvents, 'reporter');
            const producerTripWorkload = getTripDurationWorkload(producers, allFutureEvents, 'producer');
            
            if(isDeputadosAqui) {
                suggestedOperator = ScheduleConfig.FIXED_OPERATOR_DEPUTADOS_AQUI;
            } else {
                 const sortedOps = operators.sort((a,b) => (opTripWorkload.get(a.name) ?? 0) - (opTripWorkload.get(b.name) ?? 0));
                 suggestedOperator = sortedOps[0]?.name;
            }
            if(suggestedOperator) assignedForThisEvent.add(suggestedOperator);
            
            const sortedCines = cinematographicReporters.filter(c => !assignedForThisEvent.has(c.name)).sort((a,b) => (cineTripWorkload.get(a.name) ?? 0) - (cineTripWorkload.get(b.name) ?? 0));
            suggestedCinematographer = sortedCines[0]?.name;
            if(suggestedCinematographer) assignedForThisEvent.add(suggestedCinematographer);

            const sortedReporters = reporters.filter(p => !assignedForThisEvent.has(p.name)).sort((a,b) => (reporterTripWorkload.get(a.name) ?? 0) - (reporterTripWorkload.get(b.name) ?? 0));
            suggestedReporter = sortedReporters[0]?.name;
            if(suggestedReporter) assignedForThisEvent.add(suggestedReporter);

            const sortedProducers = producers.filter(p => !assignedForThisEvent.has(p.name)).sort((a,b) => (producerTripWorkload.get(a.name) ?? 0) - (producerTripWorkload.get(b.name) ?? 0));
            suggestedProducer = sortedProducers[0]?.name;

            if (eventDeparture && eventArrival) {
                const allPersonnel = { operators, cinematographicReporters, reporters, producers };
                if(suggestedOperator) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedOperator, 'transmissionOperator', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedCinematographer) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedCinematographer, 'cinematographicReporter', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedReporter) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedReporter, 'reporter', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedProducer) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedProducer, 'producer', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
            }

        } else {
            const opWorkload = getDailyWorkload(operators, eventsToday, 'transmissionOperator');
            const cineWorkload = getDailyWorkload(cinematographicReporters, eventsToday, 'cinematographicReporter');
            const reporterWorkload = getDailyWorkload(reporters, eventsToday, 'reporter');
            const producerWorkload = getDailyWorkload(producers, eventsToday, 'producer');

            const operator = getTransmissionOperatorSuggestion({
                isCCJR, isDeputadosAqui, isWeekend, eventTurn, eventDate, operators, opWorkload, assignedForThisEvent, eventsToday
            });
            suggestedOperator = operator?.name;
            if(suggestedOperator) assignedForThisEvent.add(suggestedOperator);
            
            const cinematographer = getCinematographerSuggestion({
                eventTurn, eventDate, cinematographers: cinematographicReporters, cineWorkload, assignedForThisEvent, eventsToday
            });
            suggestedCinematographer = cinematographer?.name;
            if(suggestedCinematographer) assignedForThisEvent.add(suggestedCinematographer);

            const reporter = getReporterSuggestion({
                eventTurn, eventDate, reporters, reporterWorkload, assignedForThisEvent, eventsToday
            });
            suggestedReporter = reporter?.name;
            if(suggestedReporter) assignedForThisEvent.add(suggestedReporter);

            const producer = getSuggestion(producers, producerWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
            suggestedProducer = producer?.name;
        }

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
