
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// As credenciais corretas para o projeto Firebase.
const firebaseConfig = {
  "projectId": "agenda-alego-v3-72653978-39fba",
  "appId": "1:814315709282:web:fbc64b7c698c68cde6823b",
  "storageBucket": "agenda-alego-v3-72653978-39fba.firebasestorage.app",
  "apiKey": "AIzaSyDGkB7kxb8oK39K-G_1J4weRoqxMQYKRhA",
  "authDomain": "agenda-alego-v3-72653978-39fba.firebaseapp.com",
  "messagingSenderId": "814315709282"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
