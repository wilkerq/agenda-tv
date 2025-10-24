
'use server';
// This file is a workaround for a circular dependency issue.
// Do not import anything here that depends on `ai` from `genkit.ts`
// if it also needs to be imported by `genkit.ts` itself.

// Flows will be imported for their side effects in this file.
import "./flows/summarize-reports-flow";
import "./flows/create-event-from-image-flow";
import "./flows/generate-whatsapp-message-flow";
import "./flows/generate-daily-agenda-flow";
import "./flows/send-daily-agenda-to-all-flow";

// Tools
import "./tools/get-schedule-tool";

    