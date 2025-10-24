
'use server';

import { collection, getDocs, query, where, Timestamp, getFirestore } from "firebase/firestore";
import { db } from './firebase';
import { startOfDay, endOfDay, getDay } from 'date-fns';
import type { TransmissionType } from "./types";
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from './errors';


interface SuggestTeamParams {
    date: string;
    location: string;
    transmissionTypes: TransmissionType[];
}

interface Personnel {
    id: string;
    name: string;
    turn: 'Manhã' | 'Tarde' | 'Noite' | 'Geral';
}

interface ProductionPersonnel extends Personnel {
    isReporter: boolean;
    isProducer: boolean;
}

/**
 * Fetches all personnel from a given collection.
 * @param collectionName The name of the Firestore collection.
 * @returns A promise that resolves to an array of personnel objects.
 */
const getPersonnel = async (collectionName: string): Promise<Personnel[]> => {
    const personnelCollectionRef = collection(db, collectionName);
    try {
        const snapshot = await getDocs(query(personnelCollectionRef));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name as string,
            turn: doc.data().turn as Personnel['turn'] || 'Geral',
        }));
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
            path: personnelCollectionRef.path,
            operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // Re-throw to stop execution
    }
};

const getProductionPersonnel = async (): Promise<ProductionPersonnel[]> => {
    const personnelCollectionRef = collection(db, 'production_personnel');
    try {
        const snapshot = await getDocs(query(personnelCollectionRef));
        return snapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name as string,
            turn: doc.data().turn as Personnel['turn'] || 'Geral',
            isReporter: doc.data().isReporter || false,
            isProducer: doc.data().isProducer || false,
        }));
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
          path: personnelCollectionRef.path,
          operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // Re-throw to stop execution
    }
}

/**
 * Fetches events for a specific day to check for existing assignments.
 * @param date The date to fetch events for.
 * @returns A promise that resolves to an array of event data.
 */
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
        return querySnapshot.docs.map(doc => doc.data());
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
          path: eventsCollectionRef.path,
          operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // Re-throw to stop execution
    }
};

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
    
    // Rule: Specific location
    if (location === 'Sala Julio da Retifica "CCJR"') {
        const mario = operators.find(op => op.name === "Mário Augusto");
        if (mario) return mario.name;
    }
    
    let turn: 'Manhã' | 'Tarde' | 'Noite' = 'Manhã';
    if (hour >= 12 && hour < 18) turn = 'Tarde';
    else if (hour >= 18) turn = 'Noite';

    // Rule: Weekday shifts
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        if (turn === 'Manhã') {
            const morningOperator = operators.find(op => op.name === "Rodrigo Sousa");
            if (morningOperator && !assignedOperators.has(morningOperator.name)) {
                return morningOperator.name;
            }
            // Fallback for morning
            const ovidio = operators.find(op => op.name === "Ovidio Dias");
            if (ovidio && !assignedOperators.has(ovidio.name)) return ovidio.name;
        } else if (turn === 'Tarde') {
            const afternoonPool = ["Ovidio Dias", "Mário Augusto", "Bruno Almeida"];
            for (const name of afternoonPool) {
                const operator = operators.find(op => op.name === name);
                if (operator && !assignedOperators.has(operator.name)) return operator.name;
            }
        } else { // Noite
            const nightOperator = operators.find(op => op.name === "Bruno Almeida");
            if (nightOperator && !assignedOperators.has(nightOperator.name)) {
                return nightOperator.name;
            }
             const mario = operators.find(op => op.name === "Mário Augusto");
            if (mario && !assignedOperators.has(mario.name)) return mario.name;
        }
    }

    // Rule: Weekend rotation
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        const weekendPool = ["Bruno Almeida", "Mário Augusto", "Ovidio Dias"];
        for (const name of weekendPool) {
            const operator = operators.find(op => op.name === name);
            if(operator && !assignedOperators.has(operator.name)) return operator.name;
        }
        // If all are busy, return one from the pool
        if(weekendPool.length > 0) return weekendPool[eventDate.getDate() % weekendPool.length];
    }
    
    // Fallback: Find any available operator matching the turn
    const available = getAvailablePersonnel(operators, assignedOperators, turn);
    if (available.length > 0) return available[0].name;

    // If no one is available, return undefined
    return undefined;
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
        if (available.length > 0) return available[eventDate.getDate() % available.length].name;
        if (afternoonReporters.length > 0) return afternoonReporters[eventDate.getDate() % afternoonReporters.length].name;
    }

    const availableForTurn = getAvailablePersonnel(reporters, assignedReporters, turn);
    if(availableForTurn.length > 0) return availableForTurn[0].name;

    return undefined;
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
        // Simple rotation for now
        return availableForTurn[eventDate.getDate() % availableForTurn.length].name;
    }

    // Fallback: Check 'Geral' turn if no one else is available
    const generalTurn = getAvailablePersonnel(candidates, assignedPersonnel, 'Geral' as 'Manhã');
    if(generalTurn.length > 0) {
        return generalTurn[eventDate.getDate() % generalTurn.length].name;
    }

    return undefined;
}


/**
 * Suggests a full team for an event based on a set of business rules.
 */
export const suggestTeam = async (params: SuggestTeamParams) => {
    const { date, location, transmissionTypes } = params;
    const eventDate = new Date(date);

    // 1. Fetch all necessary data in parallel
    const [
        operators, 
        cinematographicReporters,
        productionPersonnel, 
        eventsToday
    ] = await Promise.all([
        getPersonnel('transmission_operators'),
        getPersonnel('cinematographic_reporters'),
        getProductionPersonnel(),
        getEventsForDay(eventDate),
    ]);
    
    let suggestedOperator: string | undefined;
    let suggestedCinematographer: string | undefined;
    
    // Logic for "Deputados Aqui"
    if (location === "Deputados Aqui") {
        suggestedOperator = "Wilker Quirino";
        // Other team members are on rotation
        suggestedCinematographer = suggestCinematographicReporter(eventDate, cinematographicReporters, eventsToday);
    } else {
         suggestedOperator = suggestTransmissionOperator(eventDate, location, operators, eventsToday);
         suggestedCinematographer = suggestCinematographicReporter(eventDate, cinematographicReporters, eventsToday);
    }
    
    const suggestedReporter = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'reporter');
    const suggestedProducer = suggestProductionMember(eventDate, productionPersonnel, eventsToday, 'producer');


    return {
        transmissionOperator: suggestedOperator,
        cinematographicReporter: suggestedCinematographer,
        reporter: suggestedReporter,
        producer: suggestedProducer,
        transmission: location === "Plenário Iris Rezende Machado" ? ["tv", "youtube"] : ["youtube"],
    };
};
