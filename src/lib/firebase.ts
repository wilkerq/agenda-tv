
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Configuração do seu projeto Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyAiHptzLoHCtDR2_n9pPVbD89ewX8kd_f8",
  authDomain: "agenda-alego-v3-72653978-2d924.firebaseapp.com",
  projectId: "agenda-alego-v3-72653978-2d924",
  storageBucket: "agenda-alego-v3-72653978-2d924.firebasestorage.app",
  messagingSenderId: "547317231231",
  appId: "1:547317231231:web:b965cb0dc294adaba3194a"
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
