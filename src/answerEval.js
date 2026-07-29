/* ============================================================
   ANSWER EVAL — evalúa el español real de la alumna
   ------------------------------------------------------------
   Objetivo: distinguir con criterio pedagógico entre
     - correcta e igual al modelo,
     - correcta pero distinta del modelo,
     - correcta con una diferencia meramente estilística,
     - parcialmente correcta (errores localizados),
     - incorrecta.

   La respuesta guardada en la tarjeta (card.answer / card.altAnswers)
   es UNA posibilidad, no la única forma válida. Antes de marcar algo
   como error se revisa si la diferencia es: sinónimo, variante
   regional, pronombre sujeto opcional, partícula que puede moverse
   de lugar, o una tilde libre (solo/sólo). Solo lo que sobra después
   de ese filtro se trata como error real.
   ============================================================ */

/* ---------- normalización básica ---------- */
export const stripEdges = (w) => w.replace(/^[¡¿"«'(\[]+/, "").replace(/[!?.,;:"»')\]]+$/, "");
export const normWord = (w) => stripEdges(w).toLowerCase();
export const noAccent = (w) => normWord(w).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/* ---------- listas generales (no ligadas a ningún ejemplo puntual) ---------- */

/* pronombres sujeto: su presencia o ausencia es una elección discursiva,
   nunca un error (contraste, énfasis, cambio de tema, o simplemente estilo). */
const SUBJECT_PRONOUNS = new Set([
  "yo", "tu", "vos", "usted", "el", "ella", "nosotros", "nosotras",
  "vosotros", "vosotras", "ustedes", "ellos", "ellas",
]);

/* partículas que pueden cambiar de posición sin cambiar el sentido
   en la mayoría de los contextos (p. ej. "solo trabaja..." / "trabaja solo..."). */
const MOVABLE_PARTICLES = new Set([
  "solo", "tambien", "tampoco", "ya", "siempre", "nunca", "incluso", "ademas",
]);

/* lemas con doble grafía aceptada por la RAE (la tilde no cambia el sentido aquí). */
const FREE_ACCENT_LEMMAS = new Set(["solo"]);

/* sinónimos y variantes léxicas de uso corriente (incluye préstamos ya
   asentados en español). Son grupos de PALABRAS, reutilizables en
   cualquier tarjeta — no respuestas completas memorizadas. */
const SYNONYM_GROUPS = [
  ["show", "shows", "espectaculo", "espectaculos"],
  ["pelicula", "peliculas", "film", "films", "filme", "filmes"],
  ["coche", "coches", "carro", "carros", "auto", "autos"],
  ["computadora", "computadoras", "ordenador", "ordenadores", "computador", "computadores"],
  ["celular", "celulares", "movil", "moviles"],
  ["platicar", "charlar", "conversar"],
  ["lograr", "conseguir"],
  ["logre", "consegui"],
  ["logro", "consigo"],
  ["logró", "consiguio"],
  ["oficina", "escritorio"],
  ["chevere", "genial", "guay", "chido", "buenisimo"],
];
const synonymIndex = new Map();
for (const group of SYNONYM_GROUPS) for (const w of group) synonymIndex.set(w, group);

/* ¿"a" y "b" son intercambiables en este contexto? (sinónimo, variante libre) */
export function wordsEquivalent(a, b) {
  const na = normWord(a), nb = normWord(b);
  if (na === nb) return true;
  const ua = noAccent(a), ub = noAccent(b);
  if (ua === ub && (FREE_ACCENT_LEMMAS.has(ua) || FREE_ACCENT_LEMMAS.has(ub))) return true;
  const group = synonymIndex.get(ua);
  if (group && group.includes(ub)) return true;
  return false;
}

/* ---------- variantes aceptadas de una tarjeta ---------- */

/* Para "hueco": rellena el/los espacios en el frente con la respuesta,
   quitando la pista de conjugación entre paréntesis al final si la hay. */
export function fullAnswer(card) {
  if (!card) return "";
  const ans = String(card.answer || "");
  if (card.type !== "hueco") return ans;
  const front = String(card.front || "");
  const blanks = front.match(/_{2,}/g);
  if (!blanks) return ans;
  const parts = ans.split(/\s*\/\s*/).map((x) => x.trim()).filter(Boolean);
  let i = 0;
  const filled = front.replace(/_{2,}/g, () => {
    const v = blanks.length > 1 && parts.length === blanks.length ? parts[i] : parts[0] || ans;
    i++;
    return v;
  });
  return filled.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

/* Todas las formas aceptadas: la(s) guardada(s) en "answer" (separadas por "/")
   más las alternativas explícitas en "altAnswers" (formulaciones igual de
   correctas, idealmente anticipadas al crear la tarjeta). */
export function getVariants(card) {
  const base = fullAnswer(card);
  const primary = String(base || "").split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
  const alt = Array.isArray(card.altAnswers) ? card.altAnswers.map((s) => String(s || "").trim()).filter(Boolean) : [];
  const all = [...primary, ...alt];
  return all.length ? all : [""];
}

/* ---------- alineación palabra a palabra ---------- */

/* Alinea dos oraciones (LCS con equivalencia semántica, no solo textual).
   Devuelve qué palabras de cada lado NO tienen pareja — candidatas a error,
   antes de aplicar las excepciones de pronombre/partícula móvil. */
function rawAlign(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = wordsEquivalent(a[i], b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const aMark = new Array(n).fill(true), bMark = new Array(m).fill(true);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (wordsEquivalent(a[i], b[j])) { aMark[i] = false; bMark[j] = false; i++; j++; continue; }
    const skipA = dp[i + 1][j], skipB = dp[i][j + 1];
    if (skipA === skipB) {
      /* empate: si un lado es una partícula móvil y el otro no, se descarta
         primero la partícula — así no le "roba" el lugar a la palabra de
         contenido con la que en realidad debería emparejarse más adelante. */
      const aIsParticle = MOVABLE_PARTICLES.has(noAccent(a[i]));
      const bIsParticle = MOVABLE_PARTICLES.has(noAccent(b[j]));
      if (bIsParticle && !aIsParticle) { j++; continue; }
      if (aIsParticle && !bIsParticle) { i++; continue; }
    }
    if (skipA >= skipB) i++; else j++;
  }
  return { aMark, bMark };
}

/* Quita del marcado las partículas que solo cambiaron de posición. */
function clearMovable(a, b, aMark, bMark) {
  const bByWord = new Map();
  b.forEach((w, j) => {
    if (!bMark[j]) return;
    const k = noAccent(w);
    if (!bByWord.has(k)) bByWord.set(k, []);
    bByWord.get(k).push(j);
  });
  a.forEach((w, i) => {
    if (!aMark[i]) return;
    const k = noAccent(w);
    if (!MOVABLE_PARTICLES.has(k)) return;
    const list = bByWord.get(k);
    if (list && list.length) { aMark[i] = false; bMark[list.shift()] = false; }
  });
}

/* Quita del marcado un pronombre sujeto sobrante/faltante al inicio de la frase
   (su presencia u omisión es una elección válida, no un error). */
function clearOptionalSubject(a, b, aMark, bMark) {
  if (a.length > b.length && aMark[0] && SUBJECT_PRONOUNS.has(noAccent(a[0]))) {
    // ¿el resto de "a" (sin el pronombre) sigue alineando bien con "b"?
    const rest = a.slice(1);
    const { aMark: restMark } = rawAlign(rest, b);
    const restErrors = restMark.filter(Boolean).length;
    const currentErrors = aMark.slice(1).filter(Boolean).length;
    if (restErrors <= currentErrors) {
      aMark[0] = false;
      for (let k = 1; k < a.length; k++) aMark[k] = restMark[k - 1];
    }
  } else if (b.length > a.length && bMark[0] && SUBJECT_PRONOUNS.has(noAccent(b[0]))) {
    const restB = b.slice(1);
    const { bMark: restMark } = rawAlign(a, restB);
    bMark[0] = false;
    for (let k = 1; k < b.length; k++) bMark[k] = restMark[k - 1];
  }
}

/* Alinea y aplica las excepciones (partícula móvil, pronombre opcional).
   El resultado son los errores REALES: lo que sobra después de descartar
   diferencias que son solo estilo o variantes válidas. */
export function alignMarks(a, b) {
  const { aMark, bMark } = rawAlign(a, b);
  clearMovable(a, b, aMark, bMark);
  clearOptionalSubject(a, b, aMark, bMark);
  return { aMark, bMark };
}

/* Elige, entre las variantes aceptadas, la más parecida a lo que escribió
   la alumna (para mostrarla y para calcular el detalle del error). */
export function bestVariant(mine, variants) {
  const list = Array.isArray(variants) ? variants : String(variants || "").split(/\s*\/\s*/).map((s) => s.trim()).filter(Boolean);
  if (!list.length) return { variant: "", vw: [], aMark: [], bMark: [], errorCount: 0 };
  const mw = (mine || "").trim() ? mine.trim().split(/\s+/) : [];
  let best = null;
  for (const v of list) {
    const vw = v.trim().split(/\s+/);
    const { aMark, bMark } = alignMarks(mw, vw);
    const errorCount = aMark.filter(Boolean).length + (mw.length < vw.length ? bMark.filter(Boolean).length : 0);
    const score = mw.length - errorCount - Math.abs(mw.length - vw.length) * 0.3;
    if (!best || score > best.score) best = { variant: v, vw, aMark, bMark, errorCount, score };
  }
  return best;
}

/* ¿"mine" es literalmente igual (mód. mayúsculas/puntuación) a alguna variante? */
function isLiteralMatch(mineW, vw) {
  return mineW.length === vw.length && mineW.every((w, k) => normWord(w) === normWord(vw[k]));
}

/* ---------- evaluación completa ---------- */

/**
 * Evalúa la respuesta de la alumna contra todas las formas aceptadas.
 * status: "empty" | "correct-same" | "correct-alt" | "partial" | "incorrect"
 */
export function evaluateAnswer(card, mineRaw) {
  const mine = String(mineRaw || "");
  const variants = getVariants(card);

  if (!mine.trim()) {
    const vw = (variants[0] || "").split(/\s+/).filter(Boolean);
    return {
      status: "empty", mineWords: [], targetWords: vw,
      mineMarks: [], targetMarks: vw.map(() => false),
      target: variants[0] || "", variants, errorWords: [],
    };
  }

  const mineW = mine.trim().split(/\s+/);
  const best = bestVariant(mine, variants);
  const literal = isLiteralMatch(mineW, best.vw);
  const status = best.errorCount === 0 ? (literal ? "correct-same" : "correct-alt")
    : best.errorCount < mineW.length ? "partial"
    : "incorrect";

  return {
    status,
    mineWords: mineW,
    targetWords: best.vw,
    mineMarks: best.aMark,
    targetMarks: best.bMark,
    target: best.variant,
    variants,
    errorWords: mineW.filter((w, i) => best.aMark[i]),
  };
}

/* Otra formulación válida para mostrar como "también podrías decir",
   distinta de la que ya coincide con la respuesta de la alumna. */
export function alternativeVariant(evaluation) {
  if (!evaluation || !evaluation.variants) return null;
  const other = evaluation.variants.find((v) => v !== evaluation.target);
  return other || null;
}

/* ---------- pista de la profesora ---------- */

/* Solo se dispara si la palabra (o al menos una palabra, en frases de
   varias palabras) que activa la pista está entre los ERRORES reales
   de la alumna — nunca sobre algo que ella ya escribió bien. */
export function teacherHint(card, mine, errorWords = []) {
  if (!card || !card.hints || !mine || !mine.trim()) return null;
  const text = " " + mine.toLowerCase().trim().replace(/\s+/g, " ") + " ";
  const errSet = new Set(errorWords.map(normWord));
  const entries = Array.isArray(card.hints) ? card.hints.map((h) => [h.when, h.say]) : Object.entries(card.hints);
  for (const [key, say] of entries) {
    if (!key || !say) continue;
    const k = String(key).toLowerCase().trim();
    const kWords = k.split(/\s+/);
    if (kWords.length === 1) {
      if (errSet.has(normWord(k))) return String(say);
    } else if (text.includes(" " + k + " ") && kWords.some((w) => errSet.has(normWord(w)))) {
      return String(say);
    }
  }
  return null;
}

/* ---------- feedback final para la pantalla de repaso ---------- */

/**
 * Combina la evaluación con la pista de la profesora / nota de la tarjeta,
 * respetando la regla: nunca se explica un error que no fue cometido, y
 * nunca se muestra una explicación de error cuando la respuesta es correcta.
 */
export function buildFeedback(card, mineRaw) {
  const ev = evaluateAnswer(card, mineRaw);
  const hint = teacherHint(card, mineRaw, ev.errorWords);
  const explain = ev.status === "partial" || ev.status === "incorrect" ? (hint || card.note || null) : null;
  const alternative = ev.status === "correct-same" || ev.status === "correct-alt" ? alternativeVariant(ev) : null;
  return { ...ev, explain, alternative };
}
