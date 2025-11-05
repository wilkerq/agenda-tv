// =========================
// suggest-team-flow.ts (Revisado)
// Função que integra a lógica pura com o fluxo que antes era pensado para IA.
// -------------------------


// Nota: esse arquivo substitui a versão que chamava IA; agora constrói um objeto de saída assertivo, válido para preencher o formulário.


import { suggestTeamLogic as suggestTeamLogic } from './suggestion-logic';
import type { Event, Personnel } from '@/lib/types';


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


  const event: Event = {
    id: '', // Not needed for logic
    name: input.name,
    date: eventDate,
    location: input.location,
    transmission: input.transmissionTypes as any,
    departure: input.departure ? new Date(input.departure) : null,
    arrival: input.arrival ? new Date(input.arrival) : null,
    color: '',
    status: 'Agendado',
    turn: 'Manhã' // Placeholder, will be recalculated
  };

  const parseEvents = (raw: any[]): Event[] => raw.map(r => ({
    id: r.id,
    name: r.name,
    date: r.date instanceof Date ? r.date : new Date(r.date),
    location: r.location,
    transmission: r.transmission || [],
    departure: r.departure ? (r.departure instanceof Date ? r.departure : new Date(r.departure)) : null,
    arrival: r.arrival ? (r.arrival instanceof Date ? r.arrival : new Date(r.arrival)) : null,
    transmissionOperator: r.transmissionOperator ?? null,
    cinematographicReporter: r.cinematographicReporter ?? null,
    reporter: r.reporter ?? null,
    producer: r.producer ?? null,
    color: '',
    status: 'Agendado',
    turn: 'Manhã'
  })) as Event[];


  const allFutureEvents = parseEvents(input.allFutureEvents ?? []);
  const eventsToday = parseEvents(input.eventsToday ?? []);


  const result = await suggestTeamLogic({
    name: input.name,
    date: input.date,
    departure: input.departure,
    arrival: input.arrival,
    location: input.location,
    transmissionTypes: input.transmissionTypes as any,
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
