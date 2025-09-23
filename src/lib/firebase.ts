
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

// Inicializa o App Check para proteger seu backend (opcional, mas recomendado)
if (typeof window !== 'undefined') {
  try {
    const appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6Ld-pB8pAAAAAN_3_yVu_1f_3_yVu_1f_3_yVu'), // Chave de site reCAPTCHA v3 de exemplo
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    console.warn("Firebase App Check não pôde ser inicializado. Verifique a configuração do reCAPTCHA.", error);
  }
}


const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
