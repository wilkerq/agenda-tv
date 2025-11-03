
'use server';

import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { atom } from 'jotai';

// Define the type for operation mode
export type OperationMode = 'logic' | 'ai';

// Create an atom with storage to persist the user's choice in localStorage.
// This atom will hold the string 'logic' or 'ai'.
export const operationModeAtom = atomWithStorage<OperationMode>(
    'operationMode', // Key for localStorage
    'logic',         // Default value
    createJSONStorage(() => localStorage)
);

// A simple server-side cache for the operation mode
let serverMode: OperationMode = 'logic';

/**
 * Server-side function to get the current operation mode.
 * In a real-world scenario, this would fetch the setting from a user-specific
 * database record. For this example, we'll use a simple in-memory variable.
 */
export async function getOperationMode(): Promise<OperationMode> {
    // This is where you would typically fetch a user's setting from a database.
    // For now, we return the cached server-side value.
    return serverMode;
}

/**
 * Server-side function to update the operation mode.
 */
export async function setOperationMode(mode: OperationMode): Promise<void> {
    // In a real app, you'd save this to the user's profile in the database.
    serverMode = mode;
}

// It's important to have a client-side hook as well that can sync with the server
// For now, the client will rely on the atomWithStorage which is client-side only.
