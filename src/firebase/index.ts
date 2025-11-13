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

  if (getApps().length === 0) {
    // A inicialização automática do App Hosting pode falhar em dev
    // então temos um fallback para o firebaseConfig local.
    try {
      const app = initializeApp();
      firebaseServices = getSdks(app);
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Firebase auto-init failed, falling back to local config. This is normal in dev mode.', e);
      }
      const app = initializeApp(firebaseConfig);
      firebaseServices = getSdks(app);
    }
  } else {
    // Se já houver um app, apenas obtemos a instância.
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
