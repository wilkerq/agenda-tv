
import { initializeApp, cert, getApps, App, getApp as getAdminAppInstance, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;
let isInitialized = false;

function initializeAdminSDK() {
  if (getApps().length > 0) {
    adminApp = getAdminAppInstance();
  } else {
    try {
      const serviceAccountString = process.env.FIREBASE_CREDENTIALS;
      if (!serviceAccountString) {
        throw new Error("[Firebase Admin] Variável de ambiente FIREBASE_CREDENTIALS não está definida.");
      }
      const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("[Firebase Admin] Falha ao inicializar o Admin SDK:", error.message);
      // Lançar o erro para que a operação que depende do SDK falhe claramente
      throw new Error("Falha na inicialização do Firebase Admin. Verifique os logs do servidor e as credenciais.");
    }
  }

  firestore = getFirestore(adminApp);
  auth = getAuth(adminApp);
  isInitialized = true;
}

/**
 * Verifica se o SDK Admin foi inicializado com sucesso.
 * @returns {boolean} `true` se o SDK está pronto.
 */
export function isAdminSDKInitialized(): boolean {
    if (!isInitialized) {
        try {
            initializeAdminSDK();
        } catch (e) {
            return false;
        }
    }
    return isInitialized;
}

/**
 * Retorna a instância do Firestore Admin SDK.
 * Tenta inicializar o SDK se ainda não tiver sido inicializado.
 * Lança um erro se a inicialização falhar.
 */
export function getAdminDb(): Firestore {
  if (!isInitialized) {
    initializeAdminSDK();
  }
  return firestore!;
}

/**
 * Retorna a instância do Auth Admin SDK.
 * Tenta inicializar o SDK se ainda não tiver sido inicializado.
 * Lança um erro se a inicialização falhar.
 */
export function getAdminAuth(): Auth {
  if (!isInitialized) {
    initializeAdminSDK();
  }
  return auth!;
}

/**
 * Retorna a instância do App Admin SDK.
 * Tenta inicializar o SDK se ainda não tiver sido inicializado.
 * Lança um erro se a inicialização falhar.
 */
export function getAdminApp(): App {
  if (!isInitialized) {
    initializeAdminSDK();
  }
  return adminApp!;
}
