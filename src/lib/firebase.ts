
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// COLE O NOVO OBJETO firebaseConfig AQUI
const firebaseConfig = {
  "projectId": "substitua-pelo-id-do-novo-projeto",
  "appId": "substitua-pelo-app-id",
  "storageBucket": "substitua-pelo-storage-bucket",
  "apiKey": "substitua-pela-api-key",
  "authDomain": "substitua-pelo-auth-domain",
  "messagingSenderId": "substitua-pelo-sender-id"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
