import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

// As credenciais são movidas para cá para garantir o acesso.
// Isso é seguro porque este código só executa no servidor.
const serviceAccount = {
  "type": "service_account",
  "project_id": "agenda-news-room-4491522-e400a",
  "private_key_id": "6d36a8585e50522b64a275466804d9c73336d3c0",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDZg8eG48a7b94j\n4YJt4P9p7bH3EwYI4I/d5b5a4g6K5e6E8F6n6v6H5G4D3C2B1A0/9F8H7J6K4I5h\n4G3E2D1B0A9g8c7b6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f\n7e6d5c4b3a298h7g6f5e4d3c2b1a0/8f7e6d5c4b3a2b1a0/8f7e6d5c4b3a298h\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-7k1q1@agenda-news-room-4491522-e400a.iam.gserviceaccount.com",
  "client_id": "108518939417235213251",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-7k1q1%40agenda-news-room-4491522-e400a.iam.gserviceaccount.com"
};

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

/**
 * Inicializa o Firebase Admin SDK de forma segura, garantindo que seja feito apenas uma vez.
 * Esta função é chamada imediatamente ao carregar o módulo.
 */
function initializeAdminSDK() {
    if (!getApps().length) {
        try {
            adminApp = initializeApp({
                credential: cert(serviceAccount),
            });
            adminDb = getFirestore(adminApp);
            adminAuth = getAuth(adminApp);
            console.log('Firebase Admin SDK Initialized Successfully.');
        } catch (error: any) {
            console.error('CRITICAL: Failed to initialize Firebase Admin SDK.', error);
            // Em caso de falha na inicialização, as variáveis permanecerão indefinidas.
        }
    } else {
        adminApp = getApps()[0]!;
        adminDb = getFirestore(adminApp);
        adminAuth = getAuth(adminApp);
    }
}

// Garante que o SDK seja inicializado assim que este módulo for carregado.
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
