
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// ATENÇÃO: Substitua o objeto abaixo pela configuração do seu projeto Firebase.
// Você pode encontrá-lo no Firebase Console > Configurações do Projeto.
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
