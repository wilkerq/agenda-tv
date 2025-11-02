
import { initializeApp, getApps, type ServiceAccount, type App, credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { serviceAccount } from './service-account';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

function initializeAdminSDK() {
    // Verifica se todas as credenciais essenciais estão presentes
    const hasAllCredentials = 
        serviceAccount.project_id &&
        serviceAccount.private_key &&
        serviceAccount.client_email;

    if (getApps().some(app => app.name === 'firebase-admin-sdk')) {
        // Se já existe, usa a instância existente.
        const existingApp = getApps().find(app => app.name === 'firebase-admin-sdk')!;
        adminApp = existingApp;
    } else if (hasAllCredentials) {
        // Se não existe e tem credenciais, inicializa.
        try {
          adminApp = initializeApp({
            credential: credential.cert(serviceAccount as ServiceAccount),
          }, 'firebase-admin-sdk');
        } catch (error: any) {
          console.error('Falha na inicialização do Firebase Admin SDK:', error.message);
          // Impede que o restante do código tente usar um SDK não inicializado
          adminApp = undefined;
        }
    }
    
    if (adminApp) {
        adminDb = getFirestore(adminApp);
        adminAuth = getAuth(adminApp);
    }
}

// Garante que a inicialização ocorra na primeira vez que o módulo é carregado.
initializeAdminSDK();

/**
 * Retorna a instância do Firestore do Admin SDK.
 * @returns {Firestore} A instância do Firestore.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    throw new Error("Admin DB not initialized. Check Firebase Admin credentials.");
  }
  return adminDb;
}

/**
 * Retorna a instância do Auth do Admin SDK.
 * @returns {Auth} A instância do Auth.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminAuth(): Auth {
  if (!adminAuth) {
    throw new Error("Admin Auth not initialized. Check Firebase Admin credentials.");
  }
  return adminAuth;
}

/**
 * Retorna a instância do App do Admin SDK.
 * @returns {App} A instância do App.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminApp(): App {
    if (!adminApp) {
        throw new Error("Admin App not initialized. Check Firebase Admin credentials.");
    }
    return adminApp;
}
