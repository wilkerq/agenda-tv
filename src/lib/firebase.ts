
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  "projectId": "agenda-alego-ugf4q",
  "appId": "1:855770576745:web:832b6f49d0a866c8da2ff8",
  "storageBucket": "agenda-alego-ugf4q.firebasestorage.app",
  "apiKey": "AIzaSyBNxIdOfYiGmSSS-PNpImvNDb20JSSkTSo",
  "authDomain": "agenda-alego-ugf4q.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "855770576745"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
