
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configuração do seu projeto Firebase.
const firebaseConfig = {
  "projectId": "agenda-alego-openai-4456-b2bd6",
  "appId": "1:468496928261:web:371cc5cb4a76f29257566c",
  "apiKey": "AIzaSyCK9BqNa1lqmlmcEqdHYHGMb1kly0orXGs",
  "authDomain": "agenda-alego-openai-4456-b2bd6.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "468496928261"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
