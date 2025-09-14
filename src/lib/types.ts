
import { z } from 'zod';

export type TransmissionType = "youtube" | "tv";
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
const OperatorReportSchema = z.object({
  count: z.number(),
  nightCount: z.number(),
});

const TransmissionReportSchema = z.object({
  youtube: z.number(),
  tv: z.number(),
});

export const ReportDataInputSchema = z.object({
  totalEvents: z.number().describe('The total number of events.'),
  totalNightEvents: z.number().describe('The total number of events happening at or after 6 PM.'),
  reportData: z.record(z.string(), OperatorReportSchema).describe('A map of operator names to their event counts.'),
  locationReport: z.record(z.string(), z.number()).describe('A map of locations to their event counts.'),
  transmissionReport: TransmissionReportSchema.describe('A report of event counts by transmission type (YouTube vs. TV).'),
});
export type ReportDataInput = z.infer<typeof ReportDataInputSchema>;


export const ReportSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, data-driven summary of the reports in portuguese.'),
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
  description: z.string().describe('The user\'s specific request or context for the event.'),
});
export type CreateEventFromImageInput = z.infer<typeof CreateEventFromImageInputSchema>;

export const CreateEventFromImageOutputSchema = z.object({
  name: z.string().optional().describe('The extracted name of the event.'),
  location: z.string().optional().describe('The extracted location of the event.'),
  date: z.string().nullable().describe("The extracted date and time of the event in ISO 8601 format. Should be null if time is not found."),
  transmission: z.enum(["youtube", "tv"]).optional().describe('The type of transmission.'),
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
