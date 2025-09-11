
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { getEventsForDay } from '@/lib/tools';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash-latest',
  tools: [getEventsForDay],
});
