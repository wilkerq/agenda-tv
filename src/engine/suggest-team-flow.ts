
// =========================
// suggest-team-flow.ts (Revisado)
// Função que integra a lógica pura com o fluxo que antes era pensado para IA.
// -------------------------


// Nota: esse arquivo substitui a versão que chamava IA; agora constrói um objeto de saída assertivo, válido para preencher o formulário.


import type { Event, Personnel, TransmissionType, ProductionPersonnel } from '@/lib/types';
import { suggestNextRole, type StepSuggestion } from './stepwise-scheduler';


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
  partialAllocations: Partial<Record<"transmissionOperator" | "cinematographicReporter" | "reporter" | "producer", string>>;
};

// A saída agora é a sugestão do passo
export type SuggestTeamFlowOutput = StepSuggestion;


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
  
  const eventInput = {
    id: `evt-${Date.now()}`,
    name: input.name,
    date: eventDate,
    durationHours: 1, // default
    location: input.location,
    transmissionTypes: input.transmissionTypes as TransmissionType[]
  }

  const result = suggestNextRole({
    event: eventInput,
    partialAllocations: input.partialAllocations,
    pools: {
      transmissionOps: input.operators,
      cinematographicReporters: input.cinematographicReporters,
      reporters: input.reporters,
      producers: input.producers,
    },
    allEvents: [...eventsToday, ...allFutureEvents]
  });

  return result;
}
