
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do seu projeto Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAiHptzLoHCtDR2_n9pPVbD89ewX8kd_f8",
  authDomain: "agenda-alego-v3-72653978-2d924.firebaseapp.com",
  projectId: "agenda-alego-v3-72653978-2d924",
  storageBucket: "agenda-alego-v3-72653978-2d924.firebasestorage.app",
  messagingSenderId: "547317231231",
  appId: "1:547317231231:web:76251ee44f43c657a3194a"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };

