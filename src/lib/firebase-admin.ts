
import { initializeApp, getApps, type App, credential } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let adminApp: App | undefined;
let adminDb: Firestore | undefined;
let adminAuth: Auth | undefined;

function initializeAdminSDK() {
  const adminApps = getApps().filter(app => app.name === 'firebase-admin-sdk');

  if (adminApps.length > 0) {
    adminApp = adminApps[0];
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    return;
  }
  
  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  const hasAllCredentials = 
      serviceAccount.projectId &&
      serviceAccount.privateKey &&
      serviceAccount.clientEmail;

  if (hasAllCredentials) {
    try {
      adminApp = initializeApp({
        credential: credential.cert(serviceAccount),
      }, 'firebase-admin-sdk');
      
      adminDb = getFirestore(adminApp);
      adminAuth = getAuth(adminApp);
      console.log("Firebase Admin SDK inicializado com sucesso.");

    } catch (error: any) {
      console.error('CRITICAL: Falha na inicialização do Firebase Admin SDK. Verifique as credenciais.', error.message);
      adminApp = undefined;
      adminDb = undefined;
      adminAuth = undefined;
    }
  } else {
    console.warn("WARN: Credenciais do Firebase Admin SDK incompletas. As funções de admin não funcionarão.");
  }
}

// Chame a função de inicialização no nível do módulo para garantir que seja executada uma vez.
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
