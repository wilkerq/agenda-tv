// =========================
// suggest-team-flow.ts (Revisado)
// Função que integra a lógica pura com o fluxo que antes era pensado para IA.
// -------------------------

// Nota: esse arquivo substitui a versão que chamava IA; agora constrói um objeto de saída assertivo, válido para preencher o formulário.

import { suggestTeamLogic, EventInput, Personnel, SuggestionResult } from './suggestion-logic';
import type { ReschedulingSuggestion } from '@/lib/types';


export type SuggestTeamFlowInput = {
  name: string;
  date: string; // ISO
  time: string; // HH:mm
  location: string;
  transmissionTypes: string[];
  departure?: string | null; // iso
  arrival?: string | null;
  operators: Personnel[];
  cinematographicReporters: Personnel[];
  reporters: Personnel[];
  producers: Personnel[];
  eventsToday: any[]; // raw events from Firestore (convertidos abaixo)
  allFutureEvents: any[];
};


export type SuggestTeamFlowOutput = {
  transmissionOperator?: string | null; // Continua sendo string (nome) para o formulário
  cinematographicReporter?: string | null;
  reporter?: string | null;
  producer?: string | null;
  reschedulingSuggestions?: ReschedulingSuggestion[];
  reason?: string[];
};


// Mapeia IDs para Nomes para preencher o formulário
function findNameById(id: string | null | undefined, lists: Personnel[][]): string | null {
    if (!id) return null;
    for (const list of lists) {
        const person = list.find(p => p.id === id);
        if (person) return person.name;
    }
    return null;
}


export async function suggestTeam(input: SuggestTeamFlowInput): Promise<SuggestTeamFlowOutput> {
  // converte dados
  const [h, m] = input.time.split(':').map(Number);
  const eventDate = new Date(input.date);
  eventDate.setHours(h, m, 0, 0);


  const event: EventInput = {
    name: input.name,
    date: eventDate,
    location: input.location,
    durationHours: 1, // Duração padrão
    transmissionTypes: input.transmissionTypes,
    departure: input.departure ? new Date(input.departure) : null,
    arrival: input.arrival ? new Date(input.arrival) : null,
  };


  const parseEvents = (raw: any[]): EventInput[] => raw.map(r => ({
    id: r.id,
    name: r.name,
    date: r.date instanceof Date ? r.date : new Date(r.date),
    location: r.location,
    transmissionTypes: r.transmission || [],
    durationHours: r.durationHours || 1,
    departure: r.departure ? (r.departure instanceof Date ? r.departure : new Date(r.departure)) : null,
    arrival: r.arrival ? (r.arrival instanceof Date ? r.arrival : new Date(r.arrival)) : null,
    transmissionOperatorId: r.transmissionOperatorId ?? null,
    cinematographicReporterId: r.cinematographicReporterId ?? null,
    reporterId: r.reporterId ?? null,
    producerId: r.producerId ?? null,
  }));


  const allEvents = parseEvents((input.eventsToday ?? []).concat(input.allFutureEvents ?? []));


  const result: SuggestionResult = suggestTeamLogic({
    event,
    transmissionOps: input.operators,
    cinematographicReporters: input.cinematographicReporters,
    reporters: input.reporters,
    producers: input.producers,
    allEvents,
  });

  // Mapeia os IDs retornados pela lógica de volta para nomes para o formulário
  const allPersonnelLists = [input.operators, input.cinematographicReporters, input.reporters, input.producers];

  const out: SuggestTeamFlowOutput = {
    transmissionOperator: findNameById(result.transmissionOperatorId, allPersonnelLists),
    cinematographicReporter: findNameById(result.cinematographicReporterId, allPersonnelLists),
    reporter: findNameById(result.reporterId, allPersonnelLists),
    producer: findNameById(result.producerId, allPersonnelLists),
    reschedulingSuggestions: result.reschedulingSuggestions ?? [],
    reason: result.reason ?? [],
  };


  return out;
}