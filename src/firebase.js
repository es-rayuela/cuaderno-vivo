// ============================================================
//  FIREBASE · Cuaderno Vivo Rayuela
//  ------------------------------------------------------------
//  1. Crea un proyecto en https://console.firebase.google.com
//  2. Activa Authentication -> Sign-in method -> Email/Password
//  3. Activa Firestore Database (modo producción) y publica las
//     reglas del archivo firestore.rules (en la raíz del repo).
//  4. En "Configuración del proyecto" -> "Tus apps" -> Web,
//     copia el objeto de configuración y pégalo abajo.
//
//  Nota: estas claves son públicas por diseño (van al navegador).
//  La seguridad real vive en las reglas de Firestore.
// ============================================================
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAtu8tyCXl2UjdpJhSiRncZqEjh-Sg33JU",
  authDomain: "ray-cuaderno-vivo.firebaseapp.com",
  projectId: "ray-cuaderno-vivo",
  storageBucket: "ray-cuaderno-vivo.firebasestorage.app",
  messagingSenderId: "332870030218",
  appId: "1:332870030218:web:234881b00af86ed92cee73"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ¿Ya está configurado el proyecto? (para avisar con claridad si falta)
export const firebaseReady = firebaseConfig.apiKey !== "TU_API_KEY";

/** Convierte un usuario simple (sin @) en un email interno para Firebase Auth. */
export function toEmail(userOrEmail) {
  const v = String(userOrEmail || "").trim();
  if (!v) return v;
  return v.includes("@") ? v.toLowerCase() : v.toLowerCase() + "@rayuela.app";
}

/**
 * Crea la cuenta de una alumna SIN cerrar la sesión de la profesora.
 * Usa una instancia secundaria de Firebase, crea el usuario allí y la elimina.
 * Devuelve el uid de la alumna nueva.
 */
export async function createStudentAuth(email, password) {
  const secondary = initializeApp(firebaseConfig, "secondary-" + Date.now());
  try {
    const secAuth = getAuth(secondary);
    const cred = await createUserWithEmailAndPassword(secAuth, email, password);
    const uid = cred.user.uid;
    await signOut(secAuth);
    return uid;
  } finally {
    await deleteApp(secondary);
  }
}
