// Este arquivo foi preterido em favor da estrutura centralizada em /src/firebase.
// A lógica foi movida para garantir uma única fonte de verdade para a inicialização do Firebase.
// As exportações são mantidas temporariamente para evitar quebras em importações não migradas,
// mas elas agora apontam para a nova estrutura.

import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";

const { app, db, auth } = initializeFirebase();

export { app, db, auth };
