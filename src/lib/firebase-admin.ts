
import { initializeApp, cert, getApps, App, getApp as getAdminAppInstance, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';


let adminApp: App;
let firestore: Firestore;
let auth: Auth;

function initializeAdminSDK() {
  if (getApps().length > 0) {
    adminApp = getAdminAppInstance();
    firestore = getFirestore(adminApp);
    auth = getAuth(adminApp);
    return true;
  }

  try {
    const serviceAccountString = process.env.FIREBASE_CREDENTIALS;
    if (!serviceAccountString) {
      console.warn("[Firebase Admin] Variável de ambiente FIREBASE_CREDENTIALS não está definida. Funções do servidor podem falhar.");
      return false;
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });

    firestore = getFirestore(adminApp);
    auth = getAuth(adminApp);
    return true;

  } catch (error: any) {
    console.error("[Firebase Admin] Falha ao inicializar o Admin SDK:", error.message);
    return false;
  }
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
