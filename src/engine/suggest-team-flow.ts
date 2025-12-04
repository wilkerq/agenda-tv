'use server';

import { suggestNextRole } from "./stepwise-scheduler";
import type { RoleKey, EventInput, SuggestTeamFlowOutput, Personnel, ReschedulingSuggestion } from "@/lib/types";
import { scheduleWithAI } from "@/ai/flows/ai-scheduler-flow";

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

  // 1. Tentar com a lógica determinística primeiro
  let partialAllocations: Partial<Record<RoleKey, string>> = {};
  const finalSuggestion: SuggestTeamFlowOutput = {};
  let finalReschedulingSuggestions: ReschedulingSuggestion[] = [];
  
  const rolesToSuggest: RoleKey[] = ["transmissionOperator", "cinematographicReporter", "reporter", "producer"];
  let logicFailed = false;

  for (const role of rolesToSuggest) {
      if (partialAllocations[role]) continue;

      const stepResult = suggestNextRole({
          event,
          partialAllocations,
          pools,
          allEvents
      });
      
      if (stepResult.candidate && stepResult.nextRole) {
          const roleKey = stepResult.nextRole;
          partialAllocations[roleKey] = stepResult.candidate.id;
          (finalSuggestion as any)[roleKey] = stepResult.candidate.name;

          if (stepResult.candidate.reschedulingSuggestions && stepResult.candidate.reschedulingSuggestions.length > 0) {
              finalReschedulingSuggestions = [...finalReschedulingSuggestions, ...stepResult.candidate.reschedulingSuggestions];
          }
      } else {
          // Se qualquer passo falhar em encontrar um candidato, marcamos para usar IA
          logicFailed = true;
          break; // Sai do loop para não continuar tentando
      }
  }

  // 2. Se a lógica determinística falhou, usar o fallback de IA
  if (logicFailed) {
      console.log("Lógica determinística falhou. Acionando fallback de IA...");
      try {
          const aiSuggestion = await scheduleWithAI({
              event,
              pools,
              allEvents
          });
          // A IA retorna um objeto completo, então o usamos diretamente
          // A IA não vai sugerir reescalonamento, ela vai tentar evitar o conflito
          return {
            transmissionOperator: aiSuggestion.transmissionOperator,
            cinematographicReporter: aiSuggestion.cinematographicReporter,
            reporter: aiSuggestion.reporter,
            producer: aiSuggestion.producer,
          };
      } catch (aiError) {
          console.error("Falha no fallback de IA:", aiError);
          // Se a IA também falhar, retorna o que a lógica conseguiu fazer até agora
          return {
              ...finalSuggestion,
              reschedulingSuggestions: finalReschedulingSuggestions.length > 0 ? finalReschedulingSuggestions : undefined,
          };
      }
  }

  // 3. Se a lógica determinística funcionou, retorna a sugestão dela
  if (finalReschedulingSuggestions.length > 0) {
      finalSuggestion.reschedulingSuggestions = finalReschedulingSuggestions;
  }

  return finalSuggestion;
}
