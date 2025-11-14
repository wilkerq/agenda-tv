// src/engine/stepwise-scheduler.ts
import type { EventInput, Personnel, RoleKey, Candidate, StepSuggestion, Event } from "@/lib/types";
import { sameDay, determineShiftFromDate, isPersonBusy } from "./schedule.utils";
import { ScheduleConfig } from "./schedule.config";
import { logSuggestion } from "./schedule.audit";


/**
 * Ordem padrão de sugestão - você pode mudar aqui.
 */
const DEFAULT_ROLE_ORDER: RoleKey[] = [
  "transmissionOperator",
  "cinematographicReporter",
  "reporter",
  "producer",
];

/**
 * Função pública: sugere apenas o próximo papel NÃO preenchido.
 * - partialAllocations: objeto com keys (role->personId) já confirmadas no passo atual.
 */
export function suggestNextRole(params: {
  event: EventInput;
  partialAllocations: Partial<Record<RoleKey, string>>; // ex: { transmissionOperator: "id1" }
  pools: {
    transmissionOps: Personnel[];
    cinematographicReporters: Personnel[];
    reporters: Personnel[];
    producers: Personnel[];
  };
  allEvents: EventInput[]; // eventos anteriores e futuros para checagem
}): StepSuggestion {
  const { event, partialAllocations, pools, allEvents } = params;
  const debug: any = { checked: [] };

  // acha próximo papel vazio pela ordem
  const nextRole = DEFAULT_ROLE_ORDER.find(r => !(partialAllocations as any)[r]) ?? null;
  if (!nextRole) {
    return { allRolesDone: true, nextRole: null, candidate: null, debug };
  }

  // seleciona pool de candidatos
  let pool: Personnel[] = [];
  if (nextRole === "transmissionOperator") pool = pools.transmissionOps;
  if (nextRole === "cinematographicReporter") pool = pools.cinematographicReporters;
  if (nextRole === "reporter") pool = pools.reporters;
  if (nextRole === "producer") pool = pools.producers;

  const eventDate = new Date(event.date);
  const shift = determineShiftFromDate(eventDate);
  const dayEvents = allEvents.filter(e => e.id !== event.id && sameDay(new Date(e.date), eventDate)) as Event[];

  // 1. Filtra candidatos que já estão ocupados
  const availablePool = pool.filter(p => !isPersonBusy(p.name, eventDate, dayEvents));
  debug.availableAfterConflictCheck = availablePool.map(p => p.name);

  // Se não houver ninguém disponível, retorna sem candidato
  if(availablePool.length === 0) {
      return { nextRole, candidate: null, debug };
  }


  function personAssignedHours(personId: string) {
    // soma duração dos eventos do mesmo dia onde a pessoa está alocada (por id)
    let total = 0;
    for (const ev of dayEvents) {
      if (!ev) continue;
      if (
        ev.transmissionOperator === personId ||
        ev.cinematographicReporter === personId ||
        ev.reporter === personId ||
        ev.producer === personId
      ) {
        total += ev.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION;
      }
    }
    // considerar partialAllocations (já confirmadas para este evento)
    for (const roleKey of Object.keys(partialAllocations) as RoleKey[]) {
      if ((partialAllocations as any)[roleKey] === personId) {
        total += event.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION;
      }
    }
    return total;
  }

  // função de heurística para rankear candidatos
  function rankCandidates(list: Personnel[]) {
    const scored = list.map(p => {
      const scoreObj: any = { p, score: 0, reasons: [] };
      const personTurn = p.turn;

      // 1) turno compatível
      if (personTurn && personTurn !== 'Geral' && personTurn !== shift) {
          scoreObj.score += 50; // penalidade alta
          scoreObj.reasons.push(`Turno incompatível: ${p.name} é do turno ${personTurn}`);
      } else {
          scoreObj.reasons.push("Turno ok");
      }


      // 2) carga diária
      const assigned = personAssignedHours(p.id);
      if (assigned + (event.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION) > ScheduleConfig.MAX_HOURS_PER_DAY) {
        scoreObj.score += 40;
        scoreObj.reasons.push("Excede carga horária diária");
      } else {
        scoreObj.reasons.push(`Carga atual ${assigned}h`);
      }

      // 3) fairness: quem trabalhou menos nos últimos N dias ganha pontos (simples: countAssignments)
      scoreObj.score += countAssignments(p, allEvents); // quanto maior, pior (mais trabalhou)
      debug.checked.push({ personId: p.id, score: scoreObj.score, reasons: scoreObj.reasons.slice() });
      return scoreObj;
    });

    // ordenar por score asc (menor score = melhor candidato)
    scored.sort((a, b) => a.score - b.score);
    return scored;
  }

  const ranked = rankCandidates(availablePool);
  if (ranked.length === 0) return { nextRole, candidate: null, debug };

  // candidato principal
  const top = ranked[0];
  const candidate: Candidate = {
    id: top.p.id,
    name: top.p.name,
    reason: top.reasons,
    conflictWarnings: [],
    reschedulingSuggestions: [],
    requiresReschedulePermission: false,
  };

  if (top.score > 0) {
      candidate.conflictWarnings = top.reasons.filter((r: string) => !r.includes("Turno ok"));
  }

  // registrar auditoria (não grava nada na DB ainda, só log)
  logSuggestion(event.id ?? "no-id", { nextRole, candidate, partialAllocations });

  return { nextRole, candidate, debug };
}

/** Conta alocações de uma pessoa em janela de FAIRNESS_WINDOW_DAYS (menor é melhor) */
function countAssignments(p: Personnel, allEvents: EventInput[]) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - ScheduleConfig.FAIRNESS_WINDOW_DAYS);
  const end = new Date(now);
  end.setDate(now.getDate() + ScheduleConfig.FAIRNESS_WINDOW_DAYS);

  let c = 0;
  for (const e of allEvents) {
    if (new Date(e.date) < start || new Date(e.date) > end) continue;
    if (e.transmissionOperator === p.id || e.cinematographicReporter === p.id || e.reporter === p.id || e.producer === p.id) c++;
  }
  return c;
}

/** Seleciona pool baseado em quem está alocado no evento conflictante (aproximação) */
function selectPoolForEventRole(ev: EventInput, pools: any): Personnel[] {
  // se o evento tem transmissionOperator (id) então a role conflitante provavelmente é transmissionOperator, etc.
  // aqui simplificamos: retorna o pool completo (poderia ser refinado)
  return [...(pools.transmissionOps || []), ...(pools.cinematographicReporters || []), ...(pools.reporters || []), ...(pools.producers || [])];
}

/** Tenta encontrar um substituto para um evento, excluindo `excludeId` */
function findReplacement(pool: Personnel[], ev: EventInput, allEvents: EventInput[], excludeId: string): Personnel | null {
  // filtro básico usando as mesmas regras de disponibilidade
  for (const p of pool) {
    if (p.id === excludeId) continue;
    // checar se p está disponível neste ev
    // não fazemos ranking complexo aqui (UI pode pedir próximos 3 substitutos)
    const assignedHours = allEvents.reduce((acc, e) => {
      if (e.transmissionOperator === p.id || e.cinematographicReporter === p.id || e.reporter === p.id || e.producer === p.id) {
        if (sameDay(new Date(e.date), new Date(ev.date))) acc += e.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION;
      }
      return acc;
    }, 0);
    if (assignedHours + (ev.durationHours ?? ScheduleConfig.DEFAULT_EVENT_DURATION) > ScheduleConfig.MAX_HOURS_PER_DAY) continue;
    // checar conflito de horário
    const margin = ScheduleConfig.CONFLICT_MARGIN_MINUTES * 60 * 1000;
    const hasConflict = allEvents.some(e => (
      (e.transmissionOperator === p.id || e.cinematographicReporter === p.id || e.reporter === p.id || e.producer === p.id)
      && Math.abs(new Date(e.date).getTime() - new Date(ev.date).getTime()) < margin
    ));
    if (hasConflict) continue;
    // passou nos filtros
    return p;
  }
  return null;
}