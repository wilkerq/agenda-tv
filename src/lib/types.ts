
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
  date: z.string().optional().describe("The extracted date and time of the event in ISO 8601 format."),
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
