'use server';

import { getDay, differenceInHours, isWithinInterval, parseISO, isSameDay, differenceInDays, addHours, subHours } from 'date-fns';
import type { TransmissionType, Event, ReschedulingSuggestion, Personnel, ProductionPersonnel } from "./types";

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

const getEventTurn = (date: Date): 'Manhã' | 'Tarde' | 'Noite' => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    return 'Noite'; // 18:00 em diante
};

// MODIFICADO (Regra 1): Calcula a carga de eventos no dia
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

// NOVO (Regra 3 & 4): Verifica se a pessoa está ocupada em QUALQUER função no horário do evento
// Assume 1h por evento (Regra 1), mas adiciona 1h antes e 1h depois para segurança
const isPersonBusy = (personName: string, eventDate: Date, eventsToday: Event[]): boolean => {
    // Intervalo de segurança para o novo evento (+/- 1 hora)
    const eventStart = subHours(eventDate, 1); 
    const eventEnd = addHours(eventDate, 1);
    const newEventInterval = { start: eventStart, end: eventEnd };

    for (const event of eventsToday) {
        // Verifica se a pessoa está em *qualquer* uma das funções deste evento
        const isAssigned =
            event.transmissionOperator === personName ||
            event.cinematographicReporter === personName ||
            event.reporter === personName ||
            event.producer === personName;

        if (!isAssigned) continue;

        // Intervalo de segurança do evento existente (+/- 1 hora)
        const existingEventDate = new Date(event.date);
        const existingEventStart = subHours(existingEventDate, 1);
        const existingEventEnd = addHours(existingEventDate, 1);

        // Verifica sobreposição
        if (isWithinInterval(newEventInterval.start, { start: existingEventStart, end: existingEventEnd }) ||
            isWithinInterval(newEventInterval.end, { start: existingEventStart, end: existingEventEnd })) {
            return true; // Há um conflito
        }
    }
    return false; // Sem conflitos
};


// MODIFICADO (Regra 5): Calcula a carga de *dias* de viagem
const getTripDurationWorkload = (personnel: Personnel[], futureEvents: Event[], role: RoleKey): Map<string, number> => {
    const tripWorkload = new Map<string, number>();
    personnel.forEach(p => tripWorkload.set(p.name, 0));

    futureEvents.forEach(event => {
        if (event.transmission.includes('viagem') && event.departure && event.arrival) {
            const personName = event[role as keyof Event] as string | undefined;
            if (personName && tripWorkload.has(personName)) {
                // Calcula a duração em dias (arredondando para cima)
                const duration = differenceInDays(new Date(event.arrival), new Date(event.departure)) + 1;
                tripWorkload.set(personName, tripWorkload.get(personName)! + (duration > 0 ? duration : 1));
            }
        }
    });
    return tripWorkload;
};

/** NOVO (Regra 1, 3, 4): Lógica de sugestão genérica com filtros de carga e ocupação */
const getSuggestion = (
    personnel: Personnel[],
    workload: Map<string, number>,
    eventTurn: 'Manhã' | 'Tarde' | 'Noite',
    alreadyAssigned: Set<string>,
    eventDate: Date,
    eventsToday: Event[],
): Personnel | undefined => {
    
    const isWeekend = getDay(eventDate) === 0 || getDay(eventDate) === 6;

    // Filtra pessoal (Regra 1, 3, 4)
    const availablePersonnel = personnel.filter(p => {
        const isAvailable = !alreadyAssigned.has(p.name);
        const isUnderLimit = (workload.get(p.name) ?? 0) < 6; // Regra 1: Limite de 6h/eventos
        const isNotBusy = !isPersonBusy(p.name, eventDate, eventsToday); // Regra 3 & 4: Checagem de conflito
        return isAvailable && isUnderLimit && isNotBusy;
    });

    if (availablePersonnel.length === 0) return undefined;
    
    // Ordena por carga de trabalho
    const sortFn = (a: Personnel, b: Personnel) => (workload.get(a.name) ?? 0) - (workload.get(b.name) ?? 0);

    // 1. Prioriza especialistas do turno (Regra 2)
    const turnSpecialists = availablePersonnel.filter(p => p.turn === eventTurn).sort(sortFn);
    if (turnSpecialists.length > 0) {
        return turnSpecialists[0];
    }
    
    // 2. Backup: 'Geral'
    const generalists = availablePersonnel.filter(p => p.turn === 'Geral').sort(sortFn);
    if (generalists.length > 0) {
        return generalists[0];
    }
    
    // 3. Fim de semana: considera qualquer um
    if(isWeekend) {
        const anyAvailable = availablePersonnel.sort(sortFn);
        if (anyAvailable.length > 0) {
            return anyAvailable[0];
        }
    }
    
    return undefined;
};

// NOVO (Regra 8): Lógica específica para Operadores de Transmissão
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

    // Regra 6: Deputados Aqui
    if (isDeputadosAqui) {
        return operators.find(p => p.name === "Wilker Quirino");
    }

    // Regra 8.b: CCJR
    if (isCCJR) {
        // CORREÇÃO: Sua regra diz Mário Augusto, o código anterior dizia Rodrigo Sousa.
        return operators.find(p => p.name === "Mário Augusto"); 
    }

    // Regra 8.c: Fim de Semana
    if (isWeekend) {
        const weekendTeam = ["Bruno Almeida", "Mário Augusto", "Ovídio Dias"];
        const weekendPersonnel = operators.filter(p => weekendTeam.includes(p.name));
        return getSuggestion(weekendPersonnel, opWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
    }

    // Regra 8.a: Turno da Noite
    if (eventTurn === 'Noite') {
        // Verifica se Bruno já está em outro evento à noite
        const brunoIsBusy = eventsToday.some(e => 
            getEventTurn(new Date(e.date)) === 'Noite' && 
            e.transmissionOperator === "Bruno Almeida"
        );

        if (!brunoIsBusy) {
            const bruno = operators.find(p => p.name === "Bruno Almeida");
            if(bruno && !isPersonBusy(bruno.name, eventDate, eventsToday) && !assignedForThisEvent.has(bruno.name)) {
                return bruno;
            }
        }
        
        // Se Bruno estiver ocupado, escala Mário
        const mario = operators.find(p => p.name === "Mário Augusto");
        if(mario && !isPersonBusy(mario.name, eventDate, eventsToday) && !assignedForThisEvent.has(mario.name)) {
            return mario;
        }
    }

    // Padrão: Lógica genérica para Manhã/Tarde em dias de semana
    return getSuggestion(operators, opWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
};

// NOVO (Regra 9): Lógica específica para Repórteres Cinematográficos
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

    // Regra 9: Turno da Noite
    if (eventTurn === 'Noite') {
        // Revezamento entre a equipe da TARDE
        const afternoonTeam = cinematographers.filter(p => p.turn === 'Tarde');
        return getSuggestion(afternoonTeam, cineWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
    }

    // Padrão: Lógica genérica
    return getSuggestion(cinematographers, cineWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
};

// NOVO (Regra 10): Lógica específica para Repórteres
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

    // Regra 10: Turno da Noite
    if (eventTurn === 'Noite') {
        // Revezamento entre a equipe da TARDE ou GERAL
        const nightPool = reporters.filter(p => p.turn === 'Tarde' || p.turn === 'Geral');
        return getSuggestion(nightPool, reporterWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
    }

    // Padrão: Lógica genérica
    return getSuggestion(reporters, reporterWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
};


/** (Regra 7) Encontra conflitos de viagem - ESTA FUNÇÃO ESTÁ CORRETA E FOI MANTIDA */
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
        
        // Apenas conflita com eventos LOCAIS (não-viagem)
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

        // Tenta achar um substituto, excluindo a pessoa que viajará
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
// FUNÇÃO PRINCIPAL (MODIFICADA)
// ==========================================================================================

export const suggestTeam = async (params: SuggestTeamParams) => {
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

    // Regra 2: Ignorar turnos em viagem
    const isTrip = params.transmissionTypes.includes('viagem') || (eventDeparture && eventArrival && differenceInHours(eventArrival, eventDeparture) > 10);
    // Regras 6 & 8
    const isCCJR = location === "Sala Julio da Retifica \"CCJR\"";
    const isDeputadosAqui = name.toLowerCase().includes("deputados aqui");
    const isWeekend = getDay(eventDate) === 0 || getDay(eventDate) === 6;
    
    // Regra 4: Controle de alocação *neste* evento
    const assignedForThisEvent = new Set<string>();

    let suggestedOperator: string | undefined;
    let suggestedCinematographer: string | undefined;
    let suggestedReporter: string | undefined;
    let suggestedProducer: string | undefined;
    const reschedulingSuggestions: ReschedulingSuggestion[] = [];

    try {
        if (isTrip) {
            // --- LÓGICA PARA VIAGENS (Regra 5) ---
            const opTripWorkload = getTripDurationWorkload(operators, allFutureEvents, 'transmissionOperator');
            const cineTripWorkload = getTripDurationWorkload(cinematographicReporters, allFutureEvents, 'cinematographicReporter');
            const reporterTripWorkload = getTripDurationWorkload(reporters, allFutureEvents, 'reporter');
            const producerTripWorkload = getTripDurationWorkload(producers, allFutureEvents, 'producer');
            
            // Regra 6: Deputados Aqui (Operador Fixo)
            if(isDeputadosAqui) {
                suggestedOperator = "Wilker Quirino";
            } else {
                 const sortedOps = operators.sort((a,b) => (opTripWorkload.get(a.name) ?? 0) - (opTripWorkload.get(b.name) ?? 0));
                 suggestedOperator = sortedOps[0]?.name;
            }
            if(suggestedOperator) assignedForThisEvent.add(suggestedOperator);
            
            // Regra 6: Deputados Aqui (Rodízio normal para demais)
            const sortedCines = cinematographicReporters.filter(c => !assignedForThisEvent.has(c.name)).sort((a,b) => (cineTripWorkload.get(a.name) ?? 0) - (cineTripWorkload.get(b.name) ?? 0));
            suggestedCinematographer = sortedCines[0]?.name;
            if(suggestedCinematographer) assignedForThisEvent.add(suggestedCinematographer);

            const sortedReporters = reporters.filter(p => !assignedForThisEvent.has(p.name)).sort((a,b) => (reporterTripWorkload.get(a.name) ?? 0) - (reporterTripWorkload.get(b.name) ?? 0));
            suggestedReporter = sortedReporters[0]?.name;
            if(suggestedReporter) assignedForThisEvent.add(suggestedReporter);

            const sortedProducers = producers.filter(p => !assignedForThisEvent.has(p.name)).sort((a,b) => (producerTripWorkload.get(a.name) ?? 0) - (producerTripWorkload.get(b.name) ?? 0));
            suggestedProducer = sortedProducers[0]?.name;

            // Regra 7: Buscar conflitos e sugerir realocações
            if (eventDeparture && eventArrival) {
                const allPersonnel = { operators, cinematographicReporters, reporters, producers };
                if(suggestedOperator) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedOperator, 'transmissionOperator', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedCinematographer) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedCinematographer, 'cinematographicReporter', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedReporter) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedReporter, 'reporter', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
                if(suggestedProducer) reschedulingSuggestions.push(...findReschedulingSuggestions(suggestedProducer, 'producer', eventDeparture, eventArrival, allFutureEvents, allPersonnel));
            }

        } else {
            // --- LÓGICA PARA EVENTOS LOCAIS (Regras 1, 2, 3, 4, 8, 9, 10) ---
            const opWorkload = getDailyWorkload(operators, eventsToday, 'transmissionOperator');
            const cineWorkload = getDailyWorkload(cinematographicReporters, eventsToday, 'cinematographicReporter');
            const reporterWorkload = getDailyWorkload(reporters, eventsToday, 'reporter');
            const producerWorkload = getDailyWorkload(producers, eventsToday, 'producer');

            // Regra 8: Sugerir Operador
            const operator = getTransmissionOperatorSuggestion({
                isCCJR, isDeputadosAqui, isWeekend, eventTurn, eventDate, operators, opWorkload, assignedForThisEvent, eventsToday
            });
            suggestedOperator = operator?.name;
            if(suggestedOperator) assignedForThisEvent.add(suggestedOperator);
            
            // Regra 9: Sugerir Cinegrafista
            const cinematographer = getCinematographerSuggestion({
                eventTurn, eventDate, cinematographers: cinematographicReporters, cineWorkload, assignedForThisEvent, eventsToday
            });
            suggestedCinematographer = cinematographer?.name;
            if(suggestedCinematographer) assignedForThisEvent.add(suggestedCinematographer);

            // Regra 10: Sugerir Repórter
            const reporter = getReporterSuggestion({
                eventTurn, eventDate, reporters, reporterWorkload, assignedForThisEvent, eventsToday
            });
            suggestedReporter = reporter?.name;
            if(suggestedReporter) assignedForThisEvent.add(suggestedReporter);

            // Produtor (Lógica Genérica)
            const producer = getSuggestion(producers, producerWorkload, eventTurn, assignedForThisEvent, eventDate, eventsToday);
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
