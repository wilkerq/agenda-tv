
import type { EventInput, Personnel, RoleKey, Candidate, StepSuggestion } from "@/lib/types";
import { isSameDayInTimezone, determineShiftFromDate, isPersonBusy } from "./schedule.utils";
import { ScheduleConfig } from "./schedule.config";
import { logSuggestion } from "./schedule.audit";
import { addMinutes, differenceInMinutes } from "date-fns";

/**
 * Ordem padrão de sugestão.
 */
const DEFAULT_ROLE_ORDER: RoleKey[] = [
  "transmissionOperator",
  "cinematographicReporter",
  "reporter",
  "producer",
];

/**
 * Função principal de sugestão passo a passo.
 */
export function suggestNextRole(params: {
  event: EventInput;
  partialAllocations: Partial<Record<RoleKey, string>>;
  pools: {
    transmissionOps: Personnel[];
    cinematographicReporters: Personnel[];
    reporters: Personnel[];
    producers: Personnel[];
  };
  allEvents: EventInput[];
}): StepSuggestion {
  const { event, partialAllocations, pools, allEvents } = params;
  const debug: any = { checked: [] };

  // 1. Identificar próximo papel vazio
  const nextRole = DEFAULT_ROLE_ORDER.find(r => !(partialAllocations as any)[r]) ?? null;
  if (!nextRole) {
    return { allRolesDone: true, nextRole: null, candidate: null, debug };
  }

  // 2. Selecionar o pool correto
  let pool: Personnel[] = [];
  if (nextRole === "transmissionOperator") pool = pools.transmissionOps;
  if (nextRole === "cinematographicReporter") pool = pools.cinematographicReporters;
  if (nextRole === "reporter") pool = pools.reporters;
  if (nextRole === "producer") pool = pools.producers;

  const eventDate = new Date(event.date);
  const shift = determineShiftFromDate(eventDate);
  const dayEvents = allEvents.filter(e => e.id !== event.id && isSameDayInTimezone(new Date(e.date), eventDate));

  // --- REGRA DE OPERADOR FIXO (Deputados Aqui) ---
  if (nextRole === "transmissionOperator" && event.location === "Deputados Aqui") {
      const fixedOpName = ScheduleConfig.FIXED_OPERATOR_DEPUTADOS_AQUI;
      const fixedPerson = pool.find(p => p.name === fixedOpName);
      
      // Se a pessoa existe e não está ocupada (conflito direto de horário), force-a.
      // Ignora regras de turno ou carga horária neste caso específico.
      if (fixedPerson && !isPersonBusy(fixedPerson.name, eventDate, dayEvents)) {
          logSuggestion(event.id ?? "temp", { action: "fixed_assignment", role: nextRole, person: fixedPerson.name });
          return {
              nextRole,
              candidate: { id: fixedPerson.id, name: fixedPerson.name, reason: ["Operador Fixo (Deputados Aqui)"], conflictWarnings: [] },
              debug
          };
      }
  }

  // 3. Filtragem Inicial (Conflito Direto de Horário & Viagem)
  const availablePool = pool.filter(p => {
      // a) Checa conflito de horário (overlap)
      if (isPersonBusy(p.name, eventDate, dayEvents)) return false;

      // b) Checa se a pessoa já está em uma VIAGEM no mesmo dia
      const isOnTripToday = dayEvents.some(e => {
          const isAssigned = Object.values(e).includes(p.name); // simplificação, ideal checar IDs
          return isAssigned && e.transmissionTypes?.includes("viagem");
      });
      if (isOnTripToday) return false;

      return true;
  });

  debug.availableAfterConflictCheck = availablePool.map(p => p.name);

  if(availablePool.length === 0) {
      return { nextRole, candidate: null, debug };
  }

  // Helper para calcular horas já alocadas no dia
  function personAssignedHours(personId: string) {
    let total = 0;
    // Eventos já salvos no banco
    for (const ev of dayEvents) {
      if (
        ev.transmissionOperator === personId ||
        ev.cinematographicReporter === personId ||
        ev.reporter === personId ||
        ev.producer === personId
      ) {
        total += ev.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION;
      }
    }
    // Alocações parciais (neste form session)
    for (const roleKey of Object.keys(partialAllocations) as RoleKey[]) {
      if ((partialAllocations as any)[roleKey] === personId) {
        total += event.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION;
      }
    }
    return total;
  }

  // 4. Ranqueamento (Score)
  // Menor score = Melhor candidato
  function rankCandidates(list: Personnel[]) {
    const scored = list.map(p => {
      const scoreObj: any = { p, score: 0, reasons: [] };
      const personTurn = p.turn;

      // -- Critério A: Turno --
      if (personTurn && personTurn !== 'Geral' && personTurn !== shift) {
          scoreObj.score += 50; 
          scoreObj.reasons.push(`Turno incompatível (${personTurn})`);
      } else {
          scoreObj.reasons.push("Turno OK");
      }

      // -- Critério B: Carga Horária Diária --
      const currentLoad = personAssignedHours(p.id);
      const newLoad = currentLoad + (event.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION);
      
      if (newLoad > ScheduleConfig.MAX_HOURS_PER_DAY) {
        scoreObj.score += 100; // Penalidade altíssima para hora extra excessiva
        scoreObj.reasons.push(`Estoura carga diária (${newLoad}h)`);
      } else if (currentLoad > 0) {
        scoreObj.score += (currentLoad * 5); // Penalidade leve para quem já trabalhou hoje (distribuir carga)
        scoreObj.reasons.push(`Carga acumulada: ${currentLoad}h`);
      }

      // -- Critério C: Intervalo Mínimo (Back-to-back) --
      // Verifica se há eventos terminando muito perto do início deste ou começando logo após
      const bufferMinutes = 60; 
      const hasTightSchedule = dayEvents.some(e => {
          const isAssigned = Object.values(e).includes(p.name) || Object.values(e).includes(p.id);
          if (!isAssigned) return false;
          
          const eStart = new Date(e.date);
          const eEnd = addMinutes(eStart, (e.durationHours || 1) * 60);
          const thisStart = eventDate;
          const thisEnd = addMinutes(thisStart, (event.durationHours || 1) * 60);

          const gapBefore = Math.abs(differenceInMinutes(thisStart, eEnd));
          const gapAfter = Math.abs(differenceInMinutes(eStart, thisEnd));

          return gapBefore < bufferMinutes || gapAfter < bufferMinutes;
      });

      if (hasTightSchedule) {
          scoreObj.score += 20;
          scoreObj.reasons.push("Horário apertado (<1h intervalo)");
      }

      // -- Critério D: Fairness (Janela de 30 dias) --
      const monthlyLoad = countAssignments(p, allEvents);
      scoreObj.score += monthlyLoad; // +1 ponto por evento no mês
      // scoreObj.reasons.push(`Eventos/mês: ${monthlyLoad}`);

      debug.checked.push({ personName: p.name, score: scoreObj.score, reasons: scoreObj.reasons });
      return scoreObj;
    });

    // Ordenar: Menor score primeiro. Em caso de empate, aleatório (para não viciar no mesmo)
    scored.sort((a, b) => {
        if (a.score === b.score) return Math.random() - 0.5;
        return a.score - b.score;
    });
    
    return scored;
  }

  const ranked = rankCandidates(availablePool);
  
  if (ranked.length === 0) return { nextRole, candidate: null, debug };

  const top = ranked[0];
  
  const candidate: Candidate = {
    id: top.p.id,
    name: top.p.name,
    reason: top.reasons,
    conflictWarnings: top.score > 40 ? top.reasons : [], // Só avisa se o score for alto
    requiresReschedulePermission: false,
  };

  logSuggestion(event.id ?? "no-id", { nextRole, candidate, partialAllocations });

  return { nextRole, candidate, debug };
}

/** Conta quantas vezes a pessoa foi escalada nos últimos N dias */
function countAssignments(p: Personnel, allEvents: EventInput[]) {
  const now = new Date();
  const startWindow = new Date();
  startWindow.setDate(now.getDate() - ScheduleConfig.FAIRNESS_WINDOW_DAYS); // ex: -30 dias

  let count = 0;
  // Otimização: filtrar apenas eventos dentro da janela antes do loop
  for (const e of allEvents) {
    const d = new Date(e.date);
    if (d < startWindow) continue;
    
    // Verifica ID ou Nome (para compatibilidade)
    if (
        e.transmissionOperator === p.id || e.transmissionOperator === p.name ||
        e.cinematographicReporter === p.id || e.cinematographicReporter === p.name ||
        e.reporter === p.id || e.reporter === p.name ||
        e.producer === p.id || e.producer === p.name
    ) {
        count++;
    }
  }
  return count;
}

