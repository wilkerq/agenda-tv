
import { initializeApp, cert, getApps, App, getApp as getAdminAppInstance, ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;
let isInitialized = false;

function initializeAdminSDK() {
  // Se já estiver inicializado, não faz nada.
  if (isInitialized && adminApp) {
    return true;
  }

  // Se já houver apps (inicializados por outro meio), usa a instância existente.
  if (getApps().length > 0) {
    adminApp = getAdminAppInstance();
    firestore = getFirestore(adminApp);
    auth = getAuth(adminApp);
    isInitialized = true;
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
    isInitialized = true; // Marca como inicializado com sucesso.
    return true;

  } catch (error: any) {
    console.error("[Firebase Admin] Falha ao inicializar o Admin SDK:", error.message);
    isInitialized = false; // Garante que o estado seja de não inicializado em caso de erro.
    return false;
  }
}


/**
 * Verifica se o SDK Admin foi inicializado com sucesso.
 * Tenta inicializar se ainda não o fez.
 * @returns {boolean} `true` se o SDK está pronto.
 */
export function isAdminSDKInitialized(): boolean {
    if (isInitialized) return true;
    // Tenta inicializar sob demanda
    return initializeAdminSDK();
}

/**
 * Retorna a instância do Firestore Admin SDK.
 * Tenta inicializar o SDK se ainda não tiver sido inicializado.
 * Lança um erro se a inicialização falhar.
 */
export function getAdminDb(): Firestore {
  if (!isAdminSDKInitialized() || !firestore) {
    throw new Error("O SDK de Admin do Firebase não foi inicializado. Verifique as variáveis de ambiente do servidor.");
  }
  return firestore;
}

/**
 * Retorna a instância do Auth Admin SDK.
 * Tenta inicializar o SDK se ainda não tiver sido inicializado.
 * Lança um erro se a inicialização falhar.
 */
export function getAdminAuth(): Auth {
  if (!isAdminSDKInitialized() || !auth) {
    throw new Error("O SDK de Admin do Firebase não foi inicializado. Verifique as variáveis de ambiente do servidor.");
  }
  return auth;
}

/**
 * Retorna a instância do App Admin SDK.
 * Tenta inicializar o SDK se ainda não tiver sido inicializado.
 * Lança um erro se a inicialização falhar.
 */
export function getAdminApp(): App {
  if (!isAdminSDKInitialized() || !adminApp) {
    throw new Error("O SDK de Admin do Firebase não foi inicializado. Verifique as variáveis de ambiente do servidor.");
  }
  return adminApp;
}
