
import { initializeApp, getApps, type ServiceAccount, type App, credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { serviceAccount } from './service-account';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

function initializeAdminSDK() {
    // Verifica se já existe uma app com este nome para evitar re-inicialização
    if (getApps().some(app => app.name === 'firebase-admin-sdk')) {
        const existingApp = getApps().find(app => app.name === 'firebase-admin-sdk')!;
        if (!adminApp) adminApp = existingApp;
        if (!adminDb) adminDb = getFirestore(existingApp);
        if (!adminAuth) adminAuth = getAuth(existingApp);
        return;
    }

    // Verifica se as credenciais mínimas estão presentes no objeto importado
    const hasAllCredentials = 
        serviceAccount.project_id &&
        serviceAccount.private_key &&
        serviceAccount.client_email;

    if (hasAllCredentials) {
        try {
          adminApp = initializeApp({
            // Força a conversão de tipo para ServiceAccount, pois já validamos os campos
            credential: credential.cert(serviceAccount as ServiceAccount),
          }, 'firebase-admin-sdk'); // Nomeia a instância para evitar conflitos
          
          adminDb = getFirestore(adminApp);
          adminAuth = getAuth(adminApp);

        } catch (error: any) {
          console.error('CRITICAL: Falha na inicialização do Firebase Admin SDK. Verifique as credenciais.', error.message);
          // Deixa as instâncias como 'undefined' para que os getters lancem erros claros.
          adminApp = undefined;
          adminDb = undefined;
          adminAuth = undefined;
        }
    } else {
        console.warn("WARN: Credenciais do Firebase Admin SDK não encontradas no service-account.ts. As funções de admin não funcionarão.");
    }
}

// Garante que a inicialização ocorra na primeira vez que o módulo é carregado no servidor.
initializeAdminSDK();

/**
 * Retorna a instância do Firestore do Admin SDK.
 * @returns {Firestore} A instância do Firestore.
 * @throws {Error} Se a instância não foi inicializada.
 */
export function getAdminDb(): Firestore {
  if (!adminDb) {
    // Este erro agora indica uma falha na inicialização, que deve ser logada acima.
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
