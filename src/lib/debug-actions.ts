
'use server';

import { getAdminDb, isAdminSDKInitialized } from './firebase-admin';

type Status = 'checking' | 'online' | 'offline' | 'error';

/**
 * Checks the status of the Ollama server by sending a HEAD request.
 * This is a Server Action and must be called from a Client Component.
 */
export async function checkOllamaStatus(): Promise<{ status: Status, url: string }> {
    // This URL must match the one in src/ai/genkit.ts
    const OLLAMA_URL = 'http://170.254.10.34:11434'; 
    try {
        // Use fetch with a short timeout to avoid long waits
        const response = await fetch(OLLAMA_URL, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        // Ollama usually responds with 200 OK on its base URL
        if (response.ok) {
            return { status: 'online', url: OLLAMA_URL };
        }
        return { status: 'offline', url: OLLAMA_URL };
    } catch (error: any) {
        console.error("[Debug Action] Error pinging Ollama:", error.message);
        // Network errors (like ECONNREFUSED) mean the server is likely down or unreachable
        return { status: 'error', url: OLLAMA_URL };
    }
}


/**
 * Checks if the FIREBASE_CREDENTIALS environment variable is set on the server.
 * This is a Server Action.
 */
export async function checkCredentialsStatus(): Promise<{
  credentialsExist: boolean;
  projectId?: string;
  clientEmail?: string;
  parseError?: string;
}> {
  let credentialsStr = process.env.FIREBASE_CREDENTIALS;
  const credentialsExist = !!credentialsStr;
  
  if (!credentialsExist) {
    return { credentialsExist: false };
  }

  try {
    // Check if it's a Base64 string
    if (!credentialsStr.trim().startsWith('{')) {
        try {
            credentialsStr = Buffer.from(credentialsStr, 'base64').toString('utf-8');
        } catch (e) {
            return {
                credentialsExist: true,
                parseError: "A credencial parece estar codificada em Base64, mas falhou ao ser decodificada.",
            };
        }
    }
    
    const creds = JSON.parse(credentialsStr);
    return {
      credentialsExist: true,
      projectId: creds.project_id,
      clientEmail: creds.client_email,
    };
  } catch (e: any) {
    return {
      credentialsExist: true, // It exists but is malformed
      parseError: `Erro ao processar FIREBASE_CREDENTIALS: ${e.message}. Verifique se o conteúdo da variável (após decodificação, se aplicável) é um JSON válido.`,
    };
  }
}

/**
 * Checks the connection to the Firestore backend from the server side.
 * This helps diagnose if the server itself has network access to Firebase.
 */
export async function checkFirestoreConnection(): Promise<{ status: Status }> {
  // First, check if the Admin SDK can even be initialized.
  if (!isAdminSDKInitialized()) {
    return { status: 'error' };
  }
  
  try {
    const db = getAdminDb();
    // Attempt a simple and fast read operation.
    // Reading the root collections metadata is a lightweight way to check connectivity.
    await db.listCollections(); 
    return { status: 'online' };
  } catch (error: any) {
    console.error("[Debug Action] Error connecting to Firestore:", error.message);
    // Any error here suggests a problem with reaching the Firestore backend.
    return { status: 'error' };
  }
}
