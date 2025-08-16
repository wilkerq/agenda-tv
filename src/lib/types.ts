
import { z } from 'zod';

export type TransmissionType = "youtube" | "tv";

export interface Event {
  id: string;
  name: string;
  date: Date;
  location: string;
  transmission: TransmissionType;
  color: string;
  operator: string;
}

export type EventFormData = Omit<Event, "id" | "color">;


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
