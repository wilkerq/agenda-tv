
'use server';

// Define the type for operation mode
export type OperationMode = 'logic' | 'ai';

// A simple server-side cache for the operation mode
// This is now DEPRECATED for flows called from the client, as the client will pass the mode directly.
// It can still be used for purely server-side initiated actions if needed.
let serverMode: OperationMode = 'logic';

/**
 * Server-side function to get the current operation mode.
 * In a real-world scenario, this would fetch the setting from a user-specific
 * database record. For this example, we'll use a simple in-memory variable.
 * @deprecated The client should now pass the operation mode directly to flows.
 */
export async function getOperationMode(): Promise<OperationMode> {
    // This is where you would typically fetch a user's setting from a database.
    // For now, we return the cached server-side value.
    return serverMode;
}

/**
 * Server-side function to update the operation mode.
 * @deprecated The client now manages its state via localStorage and passes it to flows.
 */
export async function setOperationMode(mode: OperationMode): Promise<void> {
    // In a real app, you'd save this to the user's profile in the database.
    serverMode = mode;
}
