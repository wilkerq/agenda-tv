'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Variável para armazenar as instâncias dos serviços do Firebase
let firebaseServices: any = null;

// Esta função agora garante que o Firebase seja inicializado apenas uma vez.
export function initializeFirebase() {
  // Se os serviços já foram inicializados, retorne a instância existente.
  if (firebaseServices) {
    return firebaseServices;
  }

  // Se não houver aplicativos inicializados, inicialize um.
  if (!getApps().length) {
    let firebaseApp;
    try {
      // Tenta inicializar via variáveis de ambiente do Firebase App Hosting
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('A inicialização automática falhou. Usando o objeto de configuração do Firebase.', e);
      }
      // Se falhar (comum em desenvolvimento), usa o objeto de configuração local.
      firebaseApp = initializeApp(firebaseConfig);
    }
    // Armazena as instâncias dos SDKs na variável local.
    firebaseServices = getSdks(firebaseApp);
    return firebaseServices;
  }

  // Se já foi inicializado, mas a variável local está nula, obtenha e armazene.
  firebaseServices = getSdks(getApp());
  return firebaseServices;
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: initializeAuth(firebaseApp, {
      persistence: indexedDBLocalPersistence
    }),
    firestore: getFirestore(firebaseApp),
    messaging: typeof window !== 'undefined' ? getMessaging(firebaseApp) : undefined,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './auth/use-fcm-token';
export * from './errors';
export * from './error-emitter';
export type { SecurityRuleContext } from '@/lib/types';
