
// =============================
// schedule.audit.ts
// Responsável por logs e auditoria de decisões da Scheduling Engine
// =============================

import { ScheduleConfig } from "./schedule.config";
import type { RoleKey, Candidate } from '@/lib/types';

export type AuditEntry = {
  timestamp?: string;
  eventId?: string;
  action: string;
  details?: any;
};

export function logAudit(entry: AuditEntry) {
  const logEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  if (ScheduleConfig.DEBUG) {
    // console.log("[SCHEDULE AUDIT]", JSON.stringify(logEntry, null, 2));
  }

  // 🔸 Futuro: integração com Firestore
  // Exemplo:
  // const db = getFirestore();
  // await addDoc(collection(db, "logs_suggestions"), logEntry);
}

export function logSuggestion(eventId: string, suggestion: {
    nextRole: RoleKey | null;
    candidate: Candidate | null;
    partialAllocations: Partial<Record<RoleKey, string>>;
}) {
  logAudit({
    eventId,
    action: "suggestTeam-step",
    details: {
        role: suggestion.nextRole,
        suggestion: suggestion.candidate?.name,
        reason: suggestion.candidate?.reason,
        currentTeam: suggestion.partialAllocations,
    },
  });
}
