// =============================
// schedule.utils.ts
// Funções utilitárias usadas pela engine
// =============================
import { addMinutes, subMinutes, isWithinInterval } from "date-fns";
import type { Event, EventTurn, EventInput } from "@/lib/types";
import { ScheduleConfig } from "./schedule.config";

/** Retorna true se duas datas forem no mesmo dia */
export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Retorna o turno aproximado (manhã/tarde/noite) com base na hora */
export function determineShiftFromDate(date: Date): EventTurn {
  const h = date.getHours();
  if (h >= 6 && h < 12) return "Manhã";
  if (h >= 12 && h < 18) return "Tarde";
  return "Noite";
}

/** Calcula diferença de horas entre duas datas */
export function diffHours(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}


/**
 * Determines the event's turn (morning, afternoon, night) based on its start hour.
 * @param date The date and time of the event.
 * @returns 'Manhã', 'Tarde', or 'Noite'.
 */
export const getEventTurn = (date: Date): 'Manhã' | 'Tarde' | 'Noite' => {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'Manhã';
    if (hour >= 12 && hour < 18) return 'Tarde';
    return 'Noite'; // 18:00 onwards
};

/**
 * Checks if a person is busy with any other event at the same time.
 * This is the core logic for conflict detection.
 * @param personName The name of the person to check.
 * @param eventDate The date and time of the new event.
 * @param eventsToday A list of all other events happening on the same day.
 * @returns `true` if the person has a conflicting event, `false` otherwise.
 */
export const isPersonBusy = (personName: string, eventDate: Date, eventsToday: EventInput[]): boolean => {
    const margin = ScheduleConfig.CONFLICT_MARGIN_MINUTES;
    const newEventDuration = (ScheduleConfig.DEFAULT_EVENT_DURATION * 60); // in minutes

    // Define the time interval for the new event, including the conflict margin.
    const newEventInterval = { 
        start: subMinutes(eventDate, margin), 
        end: addMinutes(eventDate, newEventDuration + margin)
    };

    // Iterate through the existing events for the day.
    for (const existingEvent of eventsToday) {
        const isAssigned =
            existingEvent.transmissionOperator === personName ||
            existingEvent.cinematographicReporter === personName ||
            existingEvent.reporter === personName ||
            existingEvent.producer === personName;

        // If the person is not assigned to this existing event, skip it.
        if (!isAssigned) {
            continue;
        }

        const existingEventDate = new Date(existingEvent.date);
        const existingEventDuration = (existingEvent.durationHours || ScheduleConfig.DEFAULT_EVENT_DURATION) * 60; // in minutes
        
        // Define the time interval for the existing event.
        const existingEventInterval = {
            start: existingEventDate,
            end: addMinutes(existingEventDate, existingEventDuration)
        };
        
        // Check for overlap between the new event's interval and the existing event's interval.
        // A conflict exists if the start of one event is before the end of the other, AND the end of one is after the start of the other.
        const startsBeforeEnd = newEventInterval.start < existingEventInterval.end;
        const endsAfterStart = newEventInterval.end > existingEventInterval.start;

        if (startsBeforeEnd && endsAfterStart) {
            return true; // Conflict found
        }
    }
    
    return false; // No conflicts found for this person
};
