
// =========================
// suggest-team-flow.ts (Revisado)
// Função que integra a lógica pura com o fluxo que antes era pensado para IA.
// -------------------------


// Nota: esse arquivo substitui a versão que chamava IA; agora constrói um objeto de saída assertivo, válido para preencher o formulário.


import { suggestTeamLogic } from './suggestion-logic';
import type { Event, Personnel, TransmissionType, ProductionPersonnel } from '@/lib/types';


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
  reporters: ProductionPersonnel[];
  producers: ProductionPersonnel[];
  eventsToday: any[]; // raw events from Firestore (convertidos abaixo)
  allFutureEvents: any[];
};


export type SuggestTeamFlowOutput = {
  transmissionOperator?: string | null;
  cinematographicReporter?: string | null;
  reporter?: string | null;
  producer?: string | null;
  reschedulingSuggestions?: any[];
  reason?: string[];
};


export async function suggestTeam(input: SuggestTeamFlowInput): Promise<SuggestTeamFlowOutput> {
  // converte dados
  const [h, m] = input.time.split(':').map(Number);
  const eventDate = new Date(input.date);
  eventDate.setHours(h, m, 0, 0);


  const parseEvents = (raw: any[]): Event[] => raw.map(r => ({
    id: r.id,
    name: r.name,
    date: r.date instanceof Date ? r.date : new Date(r.date),
    location: r.location,
    transmission: r.transmission || [],
    departure: r.departure ? (r.departure instanceof Date ? r.departure : new Date(r.departure)) : undefined,
    arrival: r.arrival ? (r.arrival instanceof Date ? r.arrival : new Date(r.arrival)) : undefined,
    transmissionOperator: r.transmissionOperator ?? null,
    cinematographicReporter: r.cinematographicReporter ?? null,
    reporter: r.reporter ?? null,
    producer: r.producer ?? null,
    color: r.color || 'gray',
    status: r.status || 'Agendado',
    turn: r.turn || 'Tarde',
  }));

  const eventsToday = parseEvents(input.eventsToday ?? []);
  const allFutureEvents = parseEvents(input.allFutureEvents ?? []);

  const result = await suggestTeamLogic({
    name: input.name,
    date: eventDate.toISOString(),
    departure: input.departure,
    arrival: input.arrival,
    location: input.location,
    transmissionTypes: input.transmissionTypes as TransmissionType[],
    operators: input.operators,
    cinematographicReporters: input.cinematographicReporters,
    reporters: input.reporters,
    producers: input.producers,
    eventsToday,
    allFutureEvents,
  });


  // resposta simples e assertiva
  const out: SuggestTeamFlowOutput = {
    transmissionOperator: result.transmissionOperator ?? null,
    cinematographicReporter: result.cinematographicReporter ?? null,
    reporter: result.reporter ?? null,
    producer: result.producer ?? null,
    reschedulingSuggestions: result.reschedulingSuggestions ?? [],
  };


  return out;
}
