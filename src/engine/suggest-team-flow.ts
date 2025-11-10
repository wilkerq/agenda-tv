// src/engine/suggest-team-flow.ts
import { suggestNextRole } from "./stepwise-scheduler";
import type { RoleKey, EventInput, SuggestTeamFlowOutput, Personnel } from "@/lib/types";


// This is just an example wrapper. The UI will likely call this repeatedly.
export async function suggestSingleStep(params: {
  event: EventInput;
  partialAllocations: Partial<Record<RoleKey, string>>;
  pools: {
    transmissionOps: Personnel[];
    cinematographicReporters: Personnel[];
    reporters: Personnel[];
    producers: Personnel[];
  };
  allEvents: EventInput[];
}): Promise<any> { // Note: Changed to 'any' to accommodate StepSuggestion type
  // prepara e chama o stepwise
  const suggestion = suggestNextRole({
    event: params.event,
    partialAllocations: params.partialAllocations,
    pools: params.pools,
    allEvents: params.allEvents,
  });

  // opção: gravar um log temporário (audit) aqui — schedule.audit.logSuggestion
  return suggestion;
}


// Keep the old function but adapt it to call the new stepwise scheduler
// This is a temporary measure for compatibility. Ideally, the form should be updated
// to handle the step-by-step flow.
export async function suggestTeam(input: any): Promise<SuggestTeamFlowOutput> {
  const {
      name, date, time, location, transmissionTypes, departure, arrival,
      operators, cinematographicReporters, reporters, producers,
      eventsToday, allFutureEvents
  } = input;

  const [h, m] = time.split(':').map(Number);
  const eventDate = new Date(date);
  eventDate.setHours(h, m, 0, 0);

  const event: EventInput = {
      name,
      date: eventDate,
      location,
      transmissionTypes,
      departure: departure ? new Date(departure) : null,
      arrival: arrival ? new Date(arrival) : null,
  };

  const allEvents: EventInput[] = [...(eventsToday || []), ...(allFutureEvents || [])].map((e: any) => ({
      ...e,
      date: new Date(e.date),
      departure: e.departure ? new Date(e.departure) : null,
      arrival: e.arrival ? new Date(e.arrival) : null,
      id: e.id,
      durationHours: e.durationHours || 1,
      transmissionOperator: e.transmissionOperator,
      cinematographicReporter: e.cinematographicReporter,
      reporter: e.reporter,
      producer: e.producer
  }));

  const pools = {
      transmissionOps: operators || [],
      cinematographicReporters: cinematographicReporters || [],
      reporters: reporters || [],
      producers: producers || [],
  };

  // Simulate the full flow by calling the stepwise scheduler in a loop
  let partialAllocations: Partial<Record<RoleKey, string>> = {};
  const finalSuggestion: SuggestTeamFlowOutput = {};
  let finalReschedulingSuggestions: any[] = [];
  
  const rolesToSuggest: RoleKey[] = ["transmissionOperator", "cinematographicReporter", "reporter", "producer"];

  for (const role of rolesToSuggest) {
      if (partialAllocations[role]) continue; // Skip if already allocated in a previous step

      const stepResult = suggestNextRole({
          event,
          partialAllocations, // Pass the current state of allocations
          pools,
          allEvents
      });

      if (stepResult.candidate && stepResult.nextRole) {
          const roleKey = stepResult.nextRole as RoleKey;
          
          // Update partialAllocations for the *next* iteration
          partialAllocations[roleKey] = stepResult.candidate.id;
          
          // Populate the final suggestion object
          (finalSuggestion as any)[roleKey] = stepResult.candidate.name;

          if (stepResult.candidate.reschedulingSuggestions && stepResult.candidate.reschedulingSuggestions.length > 0) {
              finalReschedulingSuggestions = [...finalReschedulingSuggestions, ...stepResult.candidate.reschedulingSuggestions];
          }
      }
  }

  if (finalReschedulingSuggestions.length > 0) {
      finalSuggestion.reschedulingSuggestions = finalReschedulingSuggestions.map(s => ({
          ...s,
          // Ensure role is correctly identified for reallocation
          role: allEvents.find(e => e.id === s.conflictingEventId)?.transmissionOperator === s.personToMove ? 'transmissionOperator' :
              allEvents.find(e => e.id === s.conflictingEventId)?.cinematographicReporter === s.personToMove ? 'cinematographicReporter' :
              allEvents.find(e => e.id === s.conflictingEventId)?.reporter === s.personToMove ? 'reporter' : 'producer',
      }));
  }


  return finalSuggestion;
}
