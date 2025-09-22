'use server';
/**
 * @fileOverview A flow for suggesting an event operator based on scheduling rules.
 * This has been refactored to use direct programming logic instead of an LLM.
 *
 * - suggestOperator - A function that suggests an operator based on event details.
 */

import {
    SuggestOperatorInput,
    SuggestOperatorOutput
} from '@/lib/types';
import { assignOperator, getAvailableOperators } from '@/lib/business-logic';
import { parseISO, isValid } from 'date-fns';

export async function suggestOperator(input: SuggestOperatorInput): Promise<SuggestOperatorOutput> {
    const { date, location } = input;
    
    try {
        const eventDate = parseISO(date);
        if (!isValid(eventDate)) {
            throw new Error("Invalid date format provided.");
        }

        // Get the list of available operators (excluding Wilker Quirino)
        const availableOperators = await getAvailableOperators();
        if (availableOperators.length === 0) {
            console.warn("No available operators found in the database. Cannot suggest an operator.");
            return { operator: undefined };
        }

        // Use the centralized business logic to assign an operator
        const suggestedOperator = await assignOperator(eventDate, location, availableOperators);
        
        return { operator: suggestedOperator };

    } catch (error) {
        console.error("Error in suggestOperator logic:", error);
        return { operator: undefined };
    }
}
