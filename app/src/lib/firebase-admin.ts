
import { initializeApp, cert, getApps, App, getApp as getAdminAppInstance } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';


let adminApp: App;
let firestore: Firestore;
let auth: Auth;

function initializeAdminSDK() {
  // Check if the app is already initialized to avoid errors
  if (getApps().some(app => app.name === '[DEFAULT]')) {
      adminApp = getAdminAppInstance();
      firestore = getFirestore(adminApp);
      auth = getAuth(adminApp);
      return true;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // The private key must be passed as a string, with newlines escaped as "\\n"
  // The JSON parser will handle the un-escaping.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase Admin] Credenciais do Admin SDK não estão configuradas. Funções do servidor podem falhar.");
    return false;
  }
  
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
    });
    firestore = getFirestore(adminApp);
    auth = getAuth(adminApp);
    
  } catch (error) {
     console.error("[Firebase Admin] Falha ao inicializar o Admin SDK:", error);
     return false;
  }
  
  return true;
}

const isInitialized = initializeAdminSDK();


/**
 * Verifica se o SDK Admin foi inicializado com sucesso.
 * @returns {boolean} `true` se as credenciais foram carregadas e o SDK está pronto.
 */
export function isAdminSDKInitialized(): boolean {
    return isInitialized;
}


/**
 * Retorna a instância do Firestore Admin SDK.
 * Lança um erro se o SDK não foi inicializado.
 */
export function getAdminDb(): Firestore {
  if (!isInitialized) {
    throw new Error("O SDK de Admin do Firebase não foi inicializado. Verifique as variáveis de ambiente do servidor.");
  }
  return firestore;
}

/**
 * Retorna a instância do Auth Admin SDK.
 * Lança um erro se o SDK não foi inicializado.
 */
export function getAdminAuth(): Auth {
  if (!isInitialized) {
    throw new Error("O SDK de Admin do Firebase não foi inicializado. Verifique as variáveis de ambiente do servidor.");
  }
  return auth;
}

/**
 * Retorna a instância do App Admin SDK.
 * Lança um erro se o SDK não foi inicializado.
 */
export function getAdminApp(): App {
  if (!isInitialized) {
    throw new Error("O SDK de Admin do Firebase não foi inicializado. Verifique as variáveis de ambiente do servidor.");
  }
  return adminApp;
}
