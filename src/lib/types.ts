
import { z } from 'zod';

export type TransmissionType = "youtube" | "tv" | "pauta";
export type EventStatus = "Agendado" | "Concluído" | "Cancelado";
export type EventTurn = "Manhã" | "Tarde" | "Noite";

export interface Event {
  id: string;
  name: string;
  date: Date;
  location: string;
  transmission: TransmissionType;
  color: string;
  operator: string;
  status: EventStatus;
  turn: EventTurn;
}

export type EventFormData = Omit<Event, "id" | "color" | "status" | "turn">;

export interface Operator {
  id: string;
  name: string;
  phone: string;
}

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
  transmission: z.enum(["youtube", "tv", "pauta"]).optional().describe('The type of transmission.'),
  operator: z.string().optional().describe('The operator responsible for the event.'),
});
export type CreateEventFromImageOutput = z.infer<typeof CreateEventFromImageOutputSchema>;

// AI-related Schemas for suggestOperator flow
export const SuggestOperatorInputSchema = z.object({
  date: z.string().describe("The full date and time of the event in ISO 8601 format."),
  location: z.string().describe("The venue or place where the event will occur."),
});
export type SuggestOperatorInput = z.infer<typeof SuggestOperatorInputSchema>;

export const SuggestOperatorOutputSchema = z.object({
  operator: z.string().optional().describe('The suggested operator for the event.'),
  transmission: z.enum(["youtube", "tv", "pauta"]).optional().describe('The suggested transmission type for the event.'),
});
export type SuggestOperatorOutput = z.infer<typeof SuggestOperatorOutputSchema>;


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
export const DailyAgendaInputSchema = z.object({
  scheduleDate: z.string().describe("The date of the schedule (e.g., 'terça-feira, 13 de agosto de 2024')."),
  events: z.array(z.string()).describe("A list of formatted event strings, each including time, name, and location."),
});
export type DailyAgendaInput = z.infer<typeof DailyAgendaInputSchema>;

export const DailyAgendaOutputSchema = z.object({
  message: z.string().describe("The full, friendly, and formatted WhatsApp message for the daily agenda."),
});
export type DailyAgendaOutput = z.infer<typeof DailyAgendaOutputSchema>;

// AI-related Schemas for get-schedule-tool
export const ScheduleEventSchema = z.object({
  name: z.string().describe('The name of the event.'),
  time: z.string().describe('The time of the event in HH:mm format.'),
  operator: z.string().describe('The operator assigned to the event.'),
});
export type ScheduleEvent = z.infer<typeof ScheduleEventSchema>;

export const DailyScheduleSchema = z.object({
  events: z.array(ScheduleEventSchema).describe('A list of events for the specified day.'),
});
export type DailySchedule = z.infer<typeof DailyScheduleSchema>;
