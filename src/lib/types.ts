
import { z } from 'zod';

export const transmissionTypes = ["youtube", "tv", "pauta", "viagem"] as const;
export type TransmissionType = (typeof transmissionTypes)[number];

export type EventStatus = "Agendado" | "Concluído" | "Cancelado" | "Pendente" | "Alerta";
export type EventTurn = "Manhã" | "Tarde" | "Noite";

export interface Event {
  id: string;
  name: string;
  date: Date;
  location: string;
  transmission: TransmissionType[];
  pauta?: string;
  color: string;
  transmissionOperator?: string | null;
  cinematographicReporter?: string | null;
  reporter?: string | null;
  producer?: string | null;
  status?: EventStatus;
  turn?: EventTurn;
  departure?: Date | null;
  arrival?: Date | null;
  externalId?: string | null;
  origin?: 'manual' | 'n8n';
}

export type EventFormData = Omit<Event, "id" | "color" | "status" | "turn">;

export type Personnel = {
  id: string;
  name: string;
  turn?: 'Manhã' | 'Tarde' | 'Noite' | 'Geral';
  shifts?: string[]; // ex: ['morning','afternoon','night','all','geral']
  isReporter?: boolean;
  isProducer?: boolean;
};

export type EventInput = {
  id?: string;
  name: string;
  date: Date;
  durationHours?: number;
  location: string;
  transmissionTypes: string[]; // ex ['youtube','viagem']
  departure?: Date | null;
  arrival?: Date | null;
  transmissionOperator?: string | null; // id
  cinematographicReporter?: string | null; // id
  reporter?: string | null; // id
  producer?: string | null; // id
};

export type RoleKey = "transmissionOperator" | "cinematographicReporter" | "reporter" | "producer";


// AI-related Schemas for summarizeReports flow
const ReportItemSchema = z.object({
  nome: z.string(),
  eventos: z.number(),
});
export type ReportItem = z.infer<typeof ReportItemSchema>;


export const ReportDataInputSchema = z.object({
  totalEvents: z.number().describe('The total number of events.'),
  totalNightEvents: z.number().describe('The total number of events happening at or after 6 PM.'),
  reportData: z.array(ReportItemSchema).describe('A list of operators and their event counts.'),
  locationReport: z.array(ReportItemSchema).describe('A list of locations and their event counts.'),
  transmissionReport: z.array(ReportItemSchema).describe('A list of transmission types and their event counts.'),
});
export type ReportDataInput = z.infer<typeof ReportDataInputSchema>;


export const ReportSummaryOutputSchema = z.object({
  resumoNarrativo: z.string().describe('A concise, data-driven summary of the reports in portuguese.'),
  destaques: z.object({
    operador: ReportItemSchema,
    local: ReportItemSchema,
  })
});
export type ReportSummaryOutput = z.infer<typeof ReportSummaryOutputSchema>;

export interface RepeatSettings {
    frequency: 'daily' | 'weekly' | 'monthly';
    count: number;
}


// AI-related Schemas for createEventFromImage flow
export const CreateEventFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the event flyer or details, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type CreateEventFromImageInput = z.infer<typeof CreateEventFromImageInputSchema>;

export const CreateEventFromImageOutputSchema = z.object({
  name: z.string().optional().describe('The extracted name of the event.'),
  location: z.string().optional().describe('The extracted location of the event.'),
  date: z.string().optional().describe("The extracted date of the event in 'YYYY-MM-DD' format."),
  time: z.string().nullable().optional().describe("The extracted time of the event in 'HH:mm' format."),
  transmission: z.array(z.enum(transmissionTypes)).optional().describe('The types of transmission.'),
  transmissionOperator: z.string().optional().describe('The transmission operator responsible for the event.'),
  cinematographicReporter: z.string().optional().describe('The cinematographic reporter for the event.'),
  reporter: z.string().optional().describe('The reporter for the event.'),
  producer: z.string().optional().describe('The producer for the event.'),
});
export type CreateEventFromImageOutput = z.infer<typeof CreateEventFromImageOutputSchema>;

export const ProductionPersonnelSchema = z.object({
    id: z.string(),
    name: z.string(),
    turn: z.enum(['Manhã', 'Tarde', 'Noite', 'Geral']),
    isReporter: z.boolean(),
    isProducer: z.boolean(),
});
export type ProductionPersonnel = z.infer<typeof ProductionPersonnelSchema>;

const PersonnelSchema = z.object({
    id: z.string(),
    name: z.string(),
    turn: z.enum(['Manhã', 'Tarde', 'Noite', 'Geral']).optional(),
    shifts: z.array(z.string()).optional(),
    isReporter: z.boolean().optional(),
    isProducer: z.boolean().optional(),
});


export const ReschedulingSuggestionSchema = z.object({
    conflictingEventId: z.string(),
    conflictingEventTitle: z.string(),
    personToMove: z.string(),
    suggestedReplacement: z.string().optional().nullable(),
    role: z.enum(['transmissionOperator', 'cinematographicReporter', 'reporter', 'producer']),
});
export type ReschedulingSuggestion = z.infer<typeof ReschedulingSuggestionSchema>;

// This now includes the data fetched on the client for logic mode
export const SuggestTeamInputSchema = z.object({
  name: z.string().describe("The name of the event."),
  date: z.string().describe("The date for the event, in ISO 8601 format."),
  time: z.string().describe("The time of the event in HH:mm format."),
  location: z.string().describe("The venue or place where the event will occur."),
  transmissionTypes: z.array(z.enum(transmissionTypes)).describe("The type of event (e.g., youtube, tv)."),
  departure: z.string().optional().nullable().describe("Data de partida ISO (para viagens)"),
  arrival: z.string().optional().nullable().describe("Data de chegada ISO (para viagens)"),
  
  // Personnel lists for both modes
  operators: z.array(PersonnelSchema).describe("List of available transmission operators."),
  cinematographicReporters: z.array(PersonnelSchema).describe("List of available cinematographic reporters."),
  reporters: z.array(PersonnelSchema).describe("List of available reporters (filtered from production personnel)."),
  producers: z.array(PersonnelSchema).describe("List of available producers (filtered from production personnel)."),
  
  // Data for logic mode (fetched on client)
  eventsToday: z.array(z.any()).optional().describe("List of events happening on the same day."),
  allFutureEvents: z.array(z.any()).optional().describe("List of all future events."),
});
export type SuggestTeamInput = z.infer<typeof SuggestTeamInputSchema>;


export const SuggestTeamFlowOutputSchema = z.object({
  transmissionOperator: z.string().optional().nullable().describe('The suggested transmission operator.'),
  cinematographicReporter: z.string().optional().nullable().describe('The suggested cinematographic reporter.'),
  reporter: z.string().optional().nullable().describe('The suggested reporter.'),
  producer: z.string().optional().nullable().describe('The suggested producer.'),
  transmission: z.array(z.enum(transmissionTypes)).optional().describe('The suggested transmission types for the event.'),
  reschedulingSuggestions: z.array(ReschedulingSuggestionSchema).optional().describe("A list of events that need to be rescheduled due to conflicts."),
});
export type SuggestTeamFlowOutput = z.infer<typeof SuggestTeamFlowOutputSchema>;


// AI-related Schemas for generate-whatsapp-message flow
export const WhatsAppMessageInputSchema = z.object({
  operatorName: z.string().describe("The name of the operator."),
  operatorPhone: z.string().describe("The phone number of the operator for sending the message."),
  scheduleDate: z.string().describe("The date of the schedule (e.g., 'terça-feira, 13 de agosto de 2024')."),
  events: z.array(z.string()).describe("A list of formatted event strings, each including time, name, and location."),
});
export type WhatsAppMessageInput = z.infer<typeof WhatsAppMessageInputSchema>;

export const WhatsAppMessageOutputSchema = z.object({
  message: z.string().describe("The full, friendly, and formatted WhatsApp message."),
  sent: z.boolean().describe("Indicates whether the message was successfully sent to the webhook."),
});
export type WhatsAppMessageOutput = z.infer<typeof WhatsAppMessageOutputSchema>;


// AI-related Schemas for generate-daily-agenda flow
export const EventForAgendaSchema = z.object({
    time: z.string(),
    name: z.string(),
    location: z.string(),
    operator: z.string().nullable(),
    cineReporter: z.string().nullable(),
    reporter: z.string().nullable(),
    producer: z.string().nullable(),
});

export const DailyAgendaInputSchema = z.object({
  scheduleDate: z.string().describe("The date of the schedule (e.g., 'terça-feira, 13 de agosto de 2024')."),
  events: z.union([z.array(EventForAgendaSchema), z.array(z.string())]).describe("A list of event objects or pre-formatted strings."),
  mode: z.enum(['ai', 'logic'])
});
export type DailyAgendaInput = z.infer<typeof DailyAgendaInputSchema>;
export type OperationMode = DailyAgendaInput['mode'];


export const DailyAgendaOutputSchema = z.object({
  message: z.string().describe("The full, friendly, and formatted WhatsApp message for the daily agenda."),
});
export type DailyAgendaOutput = z.infer<typeof DailyAgendaOutputSchema>;

// AI-related Schemas for get-schedule-tool
export const ScheduleEventSchema = z.object({
  name: z.string().describe('The name of the event.'),
  time: z.string().describe('The time of the event in HH:mm format.'),
  transmissionOperator: z.string().optional().describe('The transmission operator assigned to the event.'),
});
export type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

export const DailyScheduleSchema = z.object({
  events: z.array(ScheduleEventSchema).describe('A list of events for the specified day.'),
});
export type DailySchedule = z.infer<typeof DailyScheduleSchema>;


// Audit Log Types
export type AuditLogAction = 'create' | 'update' | 'delete' | 'automatic-send' | 'create-user' | 'reallocate' | 'sync-approve' | 'sync-cancel-alert';

export interface AuditLog {
    id: string;
    action: AuditLogAction;
    collectionName: string;
    documentId: string;
    userEmail: string;
    timestamp: Date;
    before?: object;
    after?: object;
    details?: object;
}

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};


// Tipos para stepwise-scheduler
export interface Candidate {
    id: string;
    name: string;
    reason?: string[];
    conflictWarnings?: string[];
    reschedulingSuggestions?: any[]; // Simplified for now
    requiresReschedulePermission?: boolean;
}

export interface StepSuggestion {
    allRolesDone?: boolean;
    nextRole: RoleKey | null;
    candidate: Candidate | null;
    debug: any;
}


export const ScrapedEventSchema = z.object({
    externalId: z.string().describe("Unique ID from the source system (n8n, etc)."),
    name: z.string().describe("The name/title of the event."),
    date: z.string().describe("The date of the event in 'YYYY-MM-DD' format."),
    time: z.string().describe("The time of the event in 'HH:mm' format."),
    location: z.string().describe("The location/venue of the event."),
    // Add other fields that might come from the scraper
});
export type ScrapedEvent = z.infer<typeof ScrapedEventSchema>;
