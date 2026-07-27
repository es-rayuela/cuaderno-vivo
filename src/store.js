// ============================================================
//  CAPA DE DATOS · Firestore
//  ------------------------------------------------------------
//  Modelo de datos (colección "users"):
//   users/{uid} = {
//     role: "teacher" | "student",
//     name, email,
//     teacherId,          // solo alumnas: uid de su profesora
//     level, deckName, date,
//     cards: [...],       // cuaderno + historial (schedule) de la alumna
//   }
// ============================================================
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db, createStudentAuth, toEmail } from "./firebase";

/** Lee el perfil (rol) de un usuario. */
export async function getProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** Crea el documento de perfil de la profesora tras registrarse en Auth. */
export async function createTeacherProfile(uid, { name, email }) {
  await setDoc(doc(db, "users", uid), {
    role: "teacher",
    name: name || "Profesora",
    email: email || "",
    createdAt: Date.now(),
  });
}

/** Escucha en tiempo real el cuaderno de una alumna (su propio documento). */
export function subscribeNotebook(uid, cb) {
  return onSnapshot(doc(db, "users", uid), (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const d = snap.data();
    cb({
      deck: {
        studentName: d.name || "",
        level: d.level || "",
        name: d.deckName || "Frases de las clases",
        date: d.date || "",
        avgSec: typeof d.avgSec === "number" ? d.avgSec : null,
      },
      cards: Array.isArray(d.cards) ? d.cards : [],
    });
  });
}

/** Guarda el cuaderno de una alumna (mezcla campos, no borra el rol). */
export async function saveNotebook(uid, { deck, cards }) {
  await setDoc(
    doc(db, "users", uid),
    {
      name: deck.studentName || "",
      level: deck.level || "",
      deckName: deck.name || "",
      date: deck.date || "",
      ...(typeof deck.avgSec === "number" ? { avgSec: deck.avgSec } : {}),
      cards: cards || [],
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/** Escucha la lista de alumnas de una profesora en tiempo real. */
export function subscribeRoster(teacherUid, cb) {
  const q = query(
    collection(db, "users"),
    where("role", "==", "student"),
    where("teacherId", "==", teacherUid)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((s) => {
      const d = s.data();
      return {
        id: s.id,
        name: d.name || "Alumna",
        email: d.email || "",
        level: d.level || "",
        deckName: d.deckName || "Frases de las clases",
        date: d.date || "",
        cards: Array.isArray(d.cards) ? d.cards : [],
      };
    });
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    cb(list);
  });
}

/**
 * Crea la cuenta de una alumna (Auth + documento) sin cerrar la sesión de la
 * profesora. Devuelve { id, email }.
 */
export async function createStudent(teacherUid, { name, user, password }) {
  const email = toEmail(user);
  const uid = await createStudentAuth(email, password);
  await setDoc(doc(db, "users", uid), {
    role: "student",
    teacherId: teacherUid,
    name: name || "Alumna",
    email,
    level: "",
    deckName: "Frases de las clases",
    date: new Date().toISOString().slice(0, 10),
    cards: [],
    createdAt: Date.now(),
  });
  return { id: uid, email };
}

/** Guarda los datos/cartas de una alumna concreta (usado por la profesora). */
export async function saveStudentDoc(uid, data) {
  await setDoc(
    doc(db, "users", uid),
    {
      name: data.name || "",
      level: data.level || "",
      deckName: data.deckName || "",
      date: data.date || "",
      cards: data.cards || [],
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * Elimina el documento de una alumna del roster. Nota: la cuenta de Auth no se
 * puede borrar desde el navegador; queda inactiva pero sin datos asociados.
 */
export async function removeStudentDoc(uid) {
  await deleteDoc(doc(db, "users", uid));
}
