'use server';

import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from './firebase';
import { startOfDay, endOfDay, getDay } from 'date-fns';

/**
 * Determines the type of transmission based on the event location.
 * @param location The event location string.
 * @returns 'tv' for the main plenary, 'youtube' otherwise.
 */
export const determineTransmission = (location: string): 'youtube' | 'tv' => {
    if (location === "Plenário Iris Rezende Machado") {
        return "tv";
    }
    return "youtube";
};

/**
 * Fetches the list of available operators from Firestore, excluding 'Wilker Quirino'.
 * @returns A promise that resolves to an array of operator names.
 */
export const getAvailableOperators = async (): Promise<string[]> => {
    const operatorsCollection = collection(db, 'operators');
    const operatorsSnapshot = await getDocs(query(operatorsCollection));
    return operatorsSnapshot.docs
        .map(doc => doc.data().name as string)
        .filter(name => name !== 'Wilker Quirino');
};

/**
 * Fetches events for a specific day to check for operator availability.
 * @param date The date to fetch events for.
 * @returns A promise that resolves to an array of event data.
 */
const getEventsForDay = async (date: Date): Promise<{operator: string}[]> => {
    const startOfTargetDay = startOfDay(date);
    const endOfTargetDay = endOfDay(date);

    const eventsCollection = collection(db, 'events');
    const q = query(
      eventsCollection,
      where('date', '>=', Timestamp.fromDate(startOfTargetDay)),
      where('date', '<=', Timestamp.fromDate(endOfTargetDay))
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return { operator: data.operator };
    });
};

/**
 * Assigns an operator based on business rules, including location, time of day, and availability.
 * @param date The date and time of the event.
 * @param location The location of the event.
 * @param availableOperators A list of operator names to choose from.
 * @returns A promise that resolves to the name of the suggested operator.
 */
export const assignOperator = async (date: Date, location: string, availableOperators?: string[]): Promise<string> => {
    const operators = availableOperators || await getAvailableOperators();
    if (operators.length === 0) return 'Nenhum disponível';

    const dayOfWeek = getDay(date); // Sunday = 0, Saturday = 6
    const hour = date.getHours();

    // Rule 1: Specific Location (Highest Priority)
    if (location === 'Sala Julio da Retifica "CCJR"') {
        if (operators.includes("Mário Augusto")) return "Mário Augusto";
    }

    const eventsToday = await getEventsForDay(date);
    const assignedOperatorsToday = new Set(eventsToday.map(e => e.operator));

    // Rule 2: Weekday Shifts (Monday to Friday)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        // Morning Shift
        if (hour < 12) {
            if (operators.includes("Rodrigo Sousa") && !assignedOperatorsToday.has("Rodrigo Sousa")) {
                return "Rodrigo Sousa";
            }
        }
        // Afternoon Shift
        else if (hour < 18) {
            const afternoonPool = ["Ovidio Dias", "Mário Augusto", "Bruno Michel"].filter(op => operators.includes(op));
            const availableAfternoon = afternoonPool.filter(op => !assignedOperatorsToday.has(op));
            if (availableAfternoon.length > 0) return availableAfternoon[0]; // Return the first available
             // If all are busy, pick one from the pool randomly
            if (afternoonPool.length > 0) return afternoonPool[Math.floor(Math.random() * afternoonPool.length)];
        }
        // Night Shift
        else {
            if (operators.includes("Bruno Michel") && !assignedOperatorsToday.has("Bruno Michel")) {
                return "Bruno Michel";
            }
        }
    }

    // Rule 3: Weekend/Fallback Rotation
    const unassignedOperators = operators.filter(op => !assignedOperatorsToday.has(op));
    if (unassignedOperators.length > 0) {
        // Prefer operators who haven't worked today
        return unassignedOperators[Math.floor(Math.random() * unassignedOperators.length)];
    }

    // If all operators are assigned, just rotate among all available ones
    return operators[Math.floor(Math.random() * operators.length)];
};
