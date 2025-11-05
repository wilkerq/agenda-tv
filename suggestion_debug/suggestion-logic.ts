// =============================================================
// suggestion-logic.ts (Lógica Pura)
// Responsável por todas as regras de negócio para escalar equipes.
// Opera com IDs para evitar ambiguidade.
// =============================================================

import {
  isWithinInterval,
  addHours,
  subHours,
  differenceInHours,
  differenceInDays,
  isSameDay,
  addDays,
  startOfDay,
  endOfDay,
  getDay,
} from 'date-fns';

// =============================================================
// TIPOS E INTERFACES
// =============================================================

export interface Personnel {
  id: string;
  name: string;
  shifts: string[]; // e.g., ['morning', 'afternoon']
  isReporter?: boolean; // Para equipe de produção
  isProducer?: boolean; // Para equipe de produção
}

export interface EventInput {
  id?: string;
  name: string;
  date: Date;
  location: string;
  durationHours?: number;
  transmissionTypes: string[];
  departure?: Date | null;
  arrival?: Date | null;
  transmissionOperatorId?: string | null;
  cinematographicReporterId?: string | null;
  reporterId?: string | null;
  producerId?: string | null;
}

export type Role =
  | 'transmissionOperatorId'
  | 'cinematographicReporterId'
  | 'reporterId'
  | 'producerId';

export interface ReschedulingSuggestion {
    conflictingEventId: string;
    conflictingEventTitle: string;
    personToMove: { id: string, name: string };
    suggestedReplacement: { id: string, name: string } | null;
    role: Role;
}

export interface SuggestionResult {
  transmissionOperatorId?: string | null;
  cinematographicReporterId?: string | null;
  reporterId?: string | null;
  producerId?: string | null;
  reschedulingSuggestions?: ReschedulingSuggestion[];
  reason: string[];
}

interface SuggestTeamParams {
  event: EventInput;
  transmissionOps: Personnel[];
  cinematographicReporters: Personnel[];
  reporters: Personnel[];
  producers: Personnel[];
  allEvents: EventInput[];
}

// =============================================================
// LOGGER (Ativado com variável de ambiente)
// =============================================================

const DEBUG_MODE = process.env.DEBUG_SUGGESTIONS === 'true';
const log = (message: string, data?: any) => {
    if (DEBUG_MODE) {
        console.log(`[SuggestionLogic] ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
}

// =============================================================
// FUNÇÕES UTILITÁRIAS
// =============================================================

const getEventTurn = (date: Date): 'morning' | 'afternoon' | 'night' => {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
};

const getDailyWorkload = (
  personnel: Personnel[],
  events: EventInput[],
  role: Role,
): Map<string, number> => {
  const workload = new Map<string, number>();
  personnel.forEach(p => workload.set(p.id, 0));
  events.forEach(e => {
    const personId = e[role];
    if (personId && workload.has(personId)) {
      workload.set(personId, workload.get(personId)! + (e.durationHours || 1));
    }
  });
  return workload;
};

const isPersonBusy = (
  personId: string,
  event: EventInput,
  allEvents: EventInput[],
  conflictMarginMinutes: number = 45,
): boolean => {
  const newEventStart = subHours(event.date, conflictMarginMinutes / 60);
  const newEventEnd = addHours(event.date, (event.durationHours || 1) + conflictMarginMinutes / 60);

  for (const existingEvent of allEvents) {
    if (existingEvent.id === event.id) continue;

    const isAssigned =
      existingEvent.transmissionOperatorId === personId ||
      existingEvent.cinematographicReporterId === personId ||
      existingEvent.reporterId === personId ||
      existingEvent.producerId === personId;

    if (!isAssigned) continue;

    const existingEventStart = subHours(existingEvent.date, conflictMarginMinutes / 60);
    const existingEventEnd = addHours(existingEvent.date, (existingEvent.durationHours || 1) + conflictMarginMinutes / 60);
    
    if (isWithinInterval(newEventStart, { start: existingEventStart, end: existingEventEnd }) ||
        isWithinInterval(newEventEnd, { start: existingEventStart, end: existingEventEnd })) {
        log(`Person ${personId} is busy. Conflict with event:`, { name: existingEvent.name, date: existingEvent.date });
        return true;
    }
  }
  return false;
};

const getTripDaysWorkload = (
  personnel: Personnel[],
  allEvents: EventInput[],
): Map<string, number> => {
  const tripWorkload = new Map<string, number>();
  personnel.forEach(p => tripWorkload.set(p.id, 0));

  allEvents.forEach(e => {
    if (e.transmissionTypes.includes('viagem') && e.departure && e.arrival) {
      const duration = Math.max(1, differenceInDays(e.arrival, e.departure) + 1);
      const roles: Role[] = ['transmissionOperatorId', 'cinematographicReporterId', 'reporterId', 'producerId'];
      roles.forEach(role => {
          const personId = e[role];
          if(personId && tripWorkload.has(personId)) {
              tripWorkload.set(personId, tripWorkload.get(personId)! + duration);
          }
      });
    }
  });
  return tripWorkload;
};


// =============================================================
// LÓGICA DE SUGESTÃO PRINCIPAL
// =============================================================

function findBestPerson(
  personnel: Personnel[],
  workload: Map<string, number>,
  event: EventInput,
  allEvents: EventInput[],
  alreadyAssignedIds: Set<string>,
  maxDailyHours: number = 6,
): Personnel | null {

    const eventTurn = getEventTurn(event.date);
    const isWeekend = [0, 6].includes(getDay(event.date));
    log(`Finding best person for turn: ${eventTurn}, isWeekend: ${isWeekend}`);

    const available = personnel.filter(p => {
        if (alreadyAssignedIds.has(p.id)) {
             log(`- ${p.name} (${p.id}) filtered: already assigned to this event.`);
             return false;
        }
        if ((workload.get(p.id) || 0) >= maxDailyHours) {
            log(`- ${p.name} (${p.id}) filtered: exceeds daily workload.`);
            return false;
        }
        if (isPersonBusy(p.id, event, allEvents)) {
             log(`- ${p.name} (${p.id}) filtered: busy with another event.`);
            return false;
        }
        return true;
    });

    log(`Available candidates:`, available.map(p => p.name));
    if(available.length === 0) return null;

    // Prioridades de Turno
    const turnMatches = available.filter(p => p.shifts.includes(eventTurn) || p.shifts.includes('geral') || p.shifts.includes('all'));
    const generalMatches = available.filter(p => (p.shifts.includes('geral') || p.shifts.includes('all')) && !p.shifts.includes(eventTurn));
    const otherMatches = available.filter(p => !turnMatches.includes(p) && !generalMatches.includes(p));

    // Ordenar por menor carga de trabalho
    const sortedTurnMatches = turnMatches.sort((a, b) => (workload.get(a.id) || 0) - (workload.get(b.id) || 0));
    const sortedGeneralMatches = generalMatches.sort((a, b) => (workload.get(a.id) || 0) - (workload.get(b.id) || 0));
    const sortedOtherMatches = otherMatches.sort((a, b) => (workload.get(a.id) || 0) - (workload.get(b.id) || 0));

    if (sortedTurnMatches.length > 0) return sortedTurnMatches[0];
    if (sortedGeneralMatches.length > 0) return sortedGeneralMatches[0];
    if (isWeekend && sortedOtherMatches.length > 0) return sortedOtherMatches[0];

    return null;
}

// =============================================================
// FUNÇÃO PRINCIPAL
// =============================================================

export function suggestTeamLogic(params: SuggestTeamParams): SuggestionResult {
  const {
    event,
    transmissionOps,
    cinematographicReporters,
    reporters,
    producers,
    allEvents,
  } = params;

  const result: SuggestionResult = { reason: [] };
  const alreadyAssignedIds = new Set<string>();

  const isTrip = event.transmissionTypes.includes('viagem');
  const eventsToday = allEvents.filter(e => isSameDay(e.date, event.date));

  // --- LÓGICA PARA VIAGENS ---
  if (isTrip) {
    log('--- Starting suggestion for TRIP ---');
    const tripWorkload = getTripDaysWorkload([...transmissionOps, ...cinematographicReporters, ...reporters, ...producers], allEvents);

    const sortFn = (a: Personnel, b: Personnel) => (tripWorkload.get(a.id) || 0) - (tripWorkload.get(b.id) || 0);

    const sortedOps = transmissionOps.sort(sortFn);
    const sortedCine = cinematographicReporters.sort(sortFn);
    const sortedRep = reporters.sort(sortFn);
    const sortedProd = producers.sort(sortFn);

    if (sortedOps.length > 0) result.transmissionOperatorId = sortedOps[0].id;
    if (sortedCine.length > 0) result.cinematographicReporterId = sortedCine[0].id;
    if (sortedRep.length > 0) result.reporterId = sortedRep[0].id;
    if (sortedProd.length > 0) result.producerId = sortedProd[0].id;

    // Regra 7: Conflitos de viagem (implementação simplificada)
    // ...
    return result;
  }

  // --- LÓGICA PARA EVENTOS LOCAIS ---
  log('--- Starting suggestion for LOCAL EVENT ---');
  const opWorkload = getDailyWorkload(transmissionOps, eventsToday, 'transmissionOperatorId');
  const cineWorkload = getDailyWorkload(cinematographicReporters, eventsToday, 'cinematographicReporterId');
  const repWorkload = getDailyWorkload(reporters, eventsToday, 'reporterId');
  const prodWorkload = getDailyWorkload(producers, eventsToday, 'producerId');
  
  log('Daily Workloads:', { op: [...opWorkload], cine: [...cineWorkload], rep: [...repWorkload], prod: [...prodWorkload] });

  // Regra especial: Deputados Aqui
  if (event.name.toLowerCase().includes('deputados aqui')) {
    const wilker = transmissionOps.find(p => p.name === 'Wilker Quirino');
    if (wilker) {
      result.transmissionOperatorId = wilker.id;
      alreadyAssignedIds.add(wilker.id);
      result.reason.push('Regra "Deputados Aqui" aplicada para Operador.');
      log('Rule applied: "Deputados Aqui" -> Wilker Quirino');
    }
  }

  // Regra especial: CCJR
  if (event.location === 'Sala Julio da Retifica "CCJR"') {
    const mario = transmissionOps.find(p => p.name === 'Mário Augusto');
    if (mario && !alreadyAssignedIds.has(mario.id)) {
      result.transmissionOperatorId = mario.id;
      alreadyAssignedIds.add(mario.id);
      result.reason.push('Regra "CCJR" aplicada para Operador.');
      log('Rule applied: "CCJR" -> Mário Augusto');
    }
  }

  // Sugestão para cada cargo
  if (!result.transmissionOperatorId) {
      const op = findBestPerson(transmissionOps, opWorkload, event, allEvents, alreadyAssignedIds);
      if(op) {
          result.transmissionOperatorId = op.id;
          alreadyAssignedIds.add(op.id);
      }
  }

  const cine = findBestPerson(cinematographicReporters, cineWorkload, event, allEvents, alreadyAssignedIds);
  if(cine) {
      result.cinematographicReporterId = cine.id;
      alreadyAssignedIds.add(cine.id);
  }
  
  const rep = findBestPerson(reporters, repWorkload, event, allEvents, alreadyAssignedIds);
   if(rep) {
      result.reporterId = rep.id;
      alreadyAssignedIds.add(rep.id);
  }

  // Evita que um repórter seja produtor no mesmo evento, se possível
  const prod = findBestPerson(producers.filter(p => !p.isReporter || !alreadyAssignedIds.has(p.id)), prodWorkload, event, allEvents, alreadyAssignedIds);
  if(prod) {
      result.producerId = prod.id;
      alreadyAssignedIds.add(prod.id);
  } else {
      // Fallback: se não achar um produtor "puro", tenta com os que são repórteres
      const fallbackProd = findBestPerson(producers, prodWorkload, event, allEvents, alreadyAssignedIds);
      if(fallbackProd) {
          result.producerId = fallbackProd.id;
          alreadyAssignedIds.add(fallbackProd.id);
      }
  }

  log('Final suggestion:', result);
  return result;
}