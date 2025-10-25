
'use server';

import { getDay } from 'date-fns';
import type { TransmissionType, Event } from "./types";

interface Personnel {
    id: string;
    name: string;
    turn: 'Manhã' | 'Tarde' | 'Noite' | 'Geral';
}

interface ProductionPersonnel extends Personnel {
    isReporter: boolean;
    isProducer: boolean;
}

interface SuggestTeamParams {
    date: string;
    location: string;
    transmissionTypes: TransmissionType[];
    // Dados agora passados pelo cliente
    operators: Personnel[];
    cinematographicReporters: Personnel[];
    productionPersonnel: ProductionPersonnel[];
    eventsToday: any[]; // Usando 'any' para simplicidade, conforme análise.
}


const getAvailablePersonnel = (
    personnel: Personnel[], 
    assignedNames: Set<string>,
    turn: 'Manhã' | 'Tarde' | 'Noite'
): Personnel[] => {
    return personnel.filter(p => {
        const isAvailable = !assignedNames.has(p.name);
        const worksTurn = p.turn === turn || p.turn === 'Geral';
        return isAvailable && worksTurn;
    });
};


const suggestTransmissionOperator = (
    eventDate: Date,
    location: string,
    operators: Personnel[],
    eventsToday: any[]
): string | undefined => {
    const dayOfWeek = getDay(eventDate); // Sunday = 0, Saturday = 6
    const hour = eventDate.getHours();
    const assignedOperators = new Set(eventsToday.map(e => e.transmissionOperator).filter(Boolean));
    
    if (location === 'Sala Julio da Retifica "CCJR"') {
        const mario = operators.find(op => op.name === "Mário Augusto");
        if (mario && !assignedOperators.has(mario.name)) return mario.name;
    }
    
    let turn: 'Manhã' | 'Tarde' | 'Noite' = 'Manhã';
    if (hour >= 12 && hour < 18) turn = 'Tarde';
    else if (hour >= 18) turn = 'Noite';

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (turn === 'Manhã') {
            const morningPriority = ["Rodrigo Sousa", "Ovidio Dias", "Mário Augusto"];
            for (const name of morningPriority) {
                if (!assignedOperators.has(name)) return name;
            }
            const nightEventsWithBruno = eventsToday.some(e => e.transmissionOperator === 'Bruno Almeida' && new Date(e.date.seconds * 1000).getHours() >= 18);
            if (!assignedOperators.has("Bruno Almeida") && !nightEventsWithBruno) return "Bruno Almeida";
        } 
        else if (turn === 'Tarde') {
            const afternoonPool = ["Ovidio Dias", "Mário Augusto", "Bruno Almeida"];
            for (const name of afternoonPool) {
                if (!assignedOperators.has(name)) return name;
            }
        } 
        else { // Noite
            const nightPriority = ["Bruno Almeida", "Mário Augusto"];
            for (const name of nightPriority) {
                if (!assignedOperators.has(name)) return name;
            }
        }
    }

    if (dayOfWeek === 0 || dayOfWeek === 6) {
        const weekendPool = ["Bruno Almeida", "Mário Augusto", "Ovidio Dias"];
         for (const name of weekendPool) {
            if (!assignedOperators.has(name)) return name;
        }
        return weekendPool[eventsToday.length % weekendPool.length];
    }
    
    const available = getAvailablePersonnel(operators, assignedOperators, turn);
    if (available.length > 0) return available[0].name;

    return operators.length > 0 ? operators[0].name : undefined;
}

const suggestCinematographicReporter = (
    eventDate: Date,
    reporters: Personnel[],
    eventsToday: any[]
): string | undefined => {
    const hour = eventDate.getHours();
    const assignedReporters = new Set(eventsToday.map(e => e.cinematographicReporter).filter(Boolean));
    
    let turn: 'Manhã' | 'Tarde' | 'Noite' = 'Manhã';
    if (hour >= 12 && hour < 18) turn = 'Tarde';
    else if (hour >= 18) turn = 'Noite';

    if (turn === 'Noite') {
        const afternoonReporters = reporters.filter(r => r.turn === 'Tarde' || r.turn === 'Geral');
        const available = afternoonReporters.filter(r => !assignedReporters.has(r.name));
        if (available.length > 0) return available[eventsToday.length % available.length].name;
        if (afternoonReporters.length > 0) return afternoonReporters[eventsToday.length % afternoonReporters.length].name;
    }

    const availableForTurn = getAvailablePersonnel(reporters, assignedReporters, turn);
     if (availableForTurn.length > 0) {
        return availableForTurn[eventsToday.length % availableForTurn.length].name;
    }

    const generalTurnAvailable = reporters.filter(r => r.turn === 'Geral' && !assignedReporters.has(r.name));
    if(generalTurnAvailable.length > 0) {
        return generalTurnAvailable[eventsToday.length % generalTurnAvailable.length].name;
    }

    return reporters.length > 0 ? reporters[0].name : undefined;
};

const suggestProductionMember = (
    eventDate: Date,
    personnel: ProductionPersonnel[],
    eventsToday: any[],
    role: 'reporter' | 'producer'
): string | undefined => {
    const hour = eventDate.getHours();
    const assignedPersonnel = new Set(
        eventsToday.flatMap(e => [e.reporter, e.producer]).filter(Boolean)
    );

    let turn: 'Manhã' | 'Tarde' | 'Noite' = 'Manhã';
    if (hour >= 12 && hour < 18) turn = 'Tarde';
    else if (hour >= 18) turn = 'Noite';

    const candidates = personnel.filter(p => (role === 'reporter' ? p.isReporter : p.isProducer));
    
    const availableForTurn = getAvailablePersonnel(candidates, assignedPersonnel, turn);
    if (availableForTurn.length > 0) {
        return availableForTurn[eventsToday.length % availableForTurn.length].name;
    }

    const generalTurn = getAvailablePersonnel(candidates, new Set<string>(), 'Geral' as 'Manhã');
    const availableGeneral = generalTurn.filter(p => !assignedPersonnel.has(p.name));
    if(availableGeneral.length > 0) {
        return availableGeneral[eventsToday.length % availableGeneral.length].name;
    }

    if (candidates.length > 0) {
        return candidates[eventsToday.length % candidates.length].name;
    }

    return undefined;
}


/**
 * Suggests a full team for an event based on a set of business rules.
 */
export const suggestTeam = async (params: SuggestTeamParams) => {
    const { 
      date, 
      location, 
      transmissionTypes,
      operators,
      cinematographicReporters,
      productionPersonnel,
      eventsToday
    } = params;
    
    const eventDate = new Date(date);

    try {
        let suggestedOperator: string | undefined;
        let suggestedCinematographer: string | undefined;
        let suggestedReporter: string | undefined;
        let suggestedProducer: string | undefined;
        
        if (location === "Deputados Aqui") {
            suggestedOperator = "Wilker Quirino";
            suggestedCinematographer = suggestCinematographicReporter(eventDate, cinematographicReporters, eventsToday);
            suggestedReporter = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'reporter');
            suggestedProducer = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'producer');
        } else {
             suggestedOperator = suggestTransmissionOperator(eventDate, location, operators, eventsToday);
             suggestedCinematographer = suggestCinematographicReporter(eventDate, cinematographicReporters, eventsToday);
             suggestedReporter = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'reporter');
             suggestedProducer = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'producer');
        }
        
        return {
            transmissionOperator: suggestedOperator,
            cinematographicReporter: suggestedCinematographer,
            reporter: suggestedReporter,
            producer: suggestedProducer,
            transmission: location === "Plenário Iris Rezende Machado" ? ["tv", "youtube"] : ["youtube"],
        };
    } catch (error) {
        console.error("An unexpected error occurred in suggestTeam logic:", error);
        throw new Error("Failed to suggest team due to an unexpected logic error.");
    }
};
