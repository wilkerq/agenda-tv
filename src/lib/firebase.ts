
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

let app;
if (!getApps().length) {
  try {
    // This will succeed on the client side, where the config is available
    app = initializeApp(firebaseConfig);
  } catch (e) {
    // This might happen in some server-side rendering scenarios during build if config is not properly propagated
    console.error("Firebase initialization failed:", e);
    // As a fallback, try to get the app if it was initialized elsewhere
    app = getApps().length > 0 ? getApp() : undefined;
  }
} else {
  app = getApp();
}

// Check if app was successfully initialized before getting other services
const db = app ? getFirestore(app) : undefined;
const auth = app ? getAuth(app) : undefined;

// Export potentially undefined services. The app should handle this gracefully.
// The use of FirebaseClientProvider and hooks like useAuth is the recommended way
// to ensure services are available.
export { app, db, auth };
