// =============================
// schedule.audit.ts
// Responsável por logs e auditoria de decisões da Scheduling Engine
// =============================

import { ScheduleConfig } from "./schedule.config";

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
    console.log("[SCHEDULE AUDIT]", logEntry);
  }

  // 🔸 Futuro: integração com Firestore
  // Exemplo:
  // const db = getFirestore();
  // await addDoc(collection(db, "logs_suggestions"), logEntry);
}

export function logSuggestion(eventId: string, suggestion: any) {
  logAudit({
    eventId,
    action: "suggestTeam",
    details: suggestion,
  });
}
