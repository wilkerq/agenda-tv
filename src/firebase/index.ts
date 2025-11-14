
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  messaging?: Messaging;
}

let firebaseServices: FirebaseServices | null = null;

function getSdks(firebaseApp: FirebaseApp): FirebaseServices {
  const isClient = typeof window !== 'undefined';
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    messaging: isClient ? getMessaging(firebaseApp) : undefined,
  };
}

export function initializeFirebase(): FirebaseServices {
  if (firebaseServices) {
    return firebaseServices;
  }

  // Se nenhum aplicativo Firebase foi inicializado ainda, inicialize um.
  // A função initializeApp é idempotente; se a configuração for a mesma,
  // ela não criará uma nova instância.
  // Fornecer a configuração localmente garante que funcione em todos os ambientes.
  if (getApps().length === 0) {
    const app = initializeApp(firebaseConfig);
    firebaseServices = getSdks(app);
  } else {
    // Se um aplicativo já existir (por exemplo, via auto-init do App Hosting),
    // apenas obtenha a instância e os serviços.
    firebaseServices = getSdks(getApp());
  }

  return firebaseServices;
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
