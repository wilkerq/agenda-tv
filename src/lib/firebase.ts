
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// As credenciais corretas para o projeto Firebase.
const firebaseConfig = {
  "projectId": "agenda-alego-v3-72653978-2d924",
  "appId": "1:547317231231:web:b965cb0dc294adaba3194a",
  "storageBucket": "agenda-alego-v3-72653978-2d924.firebasestorage.app",
  "apiKey": "AIzaSyAiHptzLoHCtDR2_n9pPVbD89ewX8kd_f8",
  "authDomain": "agenda-alego-v3-72653978-2d924.firebaseapp.com",
  "messagingSenderId": "547317231231"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
