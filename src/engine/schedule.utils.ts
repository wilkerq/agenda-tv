// =============================
// schedule.utils.ts
// Funções utilitárias usadas pela engine
// =============================
import { addHours, isWithinInterval, subHours } from "date-fns";
import type { Event, EventTurn } from "@/lib/types";
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
 * @param personName The name of the person to check.
 * @param eventDate The date and time of the new event.
 * @param eventsToday A list of all other events happening on the same day.
 * @returns `true` if the person has a conflicting event, `false` otherwise.
 */
export const isPersonBusy = (personName: string, eventDate: Date, eventsToday: Event[]): boolean => {
    const margin = ScheduleConfig.CONFLICT_MARGIN_MINUTES;
    const newEventInterval = { 
        start: subHours(eventDate, margin / 60), 
        end: addHours(eventDate, ScheduleConfig.DEFAULT_EVENT_DURATION + margin / 60)
    };

    for (const event of eventsToday) {
        const isAssigned =
            event.transmissionOperator === personName ||
            event.cinematographicReporter === personName ||
            event.reporter === personName ||
            event.producer === personName;

        if (!isAssigned) continue;

        const existingEventDate = new Date(event.date);
        const existingEventInterval = {
            start: subHours(existingEventDate, margin / 60),
            end: addHours(existingEventDate, ScheduleConfig.DEFAULT_EVENT_DURATION + margin / 60)
        };
        
        // Check for overlap
        const startsBeforeEnd = newEventInterval.start < existingEventInterval.end;
        const endsAfterStart = newEventInterval.end > existingEventInterval.start;

        if (startsBeforeEnd && endsAfterStart) {
            return true; // Conflict found
        }
    }
    return false; // No conflicts
};
    