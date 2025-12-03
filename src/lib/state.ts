
'use client';

import { atomWithStorage, createJSONStorage } from 'jotai/utils';

// Define the type for operation mode
export type OperationMode = 'logic' | 'ai';

/**
 * Jotai atom to manage the application's operation mode ('logic' or 'ai').
 * This state is persisted in localStorage to be consistent across sessions.
 * It should be used in client components to read or update the operation mode.
 */
export const operationModeAtom = atomWithStorage<OperationMode>(
    'operationMode', // Key for localStorage
    'logic',         // Default value
    // Use a JSON storage that's only available on the client-side.
    createJSONStorage(() => localStorage)
);
