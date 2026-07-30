import { describe, it, expect } from "vitest";
import { evaluateAnswer, buildFeedback, wordsEquivalent, teacherHint } from "./answerEval";

/* ============================================================
   REGRESIÓN — evaluación de respuestas (answerEval.js)
   Cada bloque corresponde a un criterio pedagógico exigido:
   no depender de coincidencia exacta, no inventar errores falsos,
   reconocer sinónimos/variantes de uso real, diferenciar error de
   preferencia estilística, y disparar solo las pistas pertinentes.
   ============================================================ */

const card = (answer, extra = {}) => ({ type: "traduccion", front: "...", answer, ...extra });

describe("respuesta igual a la respuesta-modelo", () => {
  it("marca correct-same cuando coincide literalmente", () => {
    const ev = evaluateAnswer(card("Voy a la tienda"), "Voy a la tienda");
    expect(ev.status).toBe("correct-same");
    expect(ev.errorWords).toEqual([]);
  });
});

describe("respuesta correcta pero distinta del modelo (sin error real)", () => {
  it("pronombre sujeto opcional no es error", () => {
    const ev = evaluateAnswer(card("Trabajo en una oficina"), "Yo trabajo en una oficina");
    expect(ev.status).toBe("correct-alt");
    expect(ev.errorWords).toEqual([]);
  });

  it("pronombres sujeto entre paréntesis en una lista de formas verbales no son obligatorios", () => {
    const c = card("(yo) me equivoqué, (tú) te equivocaste, (él/ella/usted) se equivocó");
    const ev = evaluateAnswer(c, "me equivoqué, te equivocaste, se equivocó");
    expect(ev.status).toBe("correct-alt");
    expect(ev.errorWords).toEqual([]);
  });

  it("partícula móvil ('solo') no es error por cambiar de posición", () => {
    const ev = evaluateAnswer(card("Solo trabaja los lunes"), "Trabaja solo los lunes");
    expect(ev.status).toBe("correct-alt");
    expect(ev.errorWords).toEqual([]);
  });

  it("tilde libre en 'solo/sólo' no es error", () => {
    const ev = evaluateAnswer(card("Solo quiero descansar"), "Sólo quiero descansar");
    expect(ev.status).toBe("correct-alt");
  });

  it("sinónimo de uso corriente ('coche'/'carro'/'auto') no es error", () => {
    const ev = evaluateAnswer(card("Compré un coche nuevo"), "Compré un auto nuevo");
    expect(ev.status).toBe("correct-alt");
    expect(ev.errorWords).toEqual([]);
  });

  it("altAnswers explícitas cuentan como correctas e iguales a esa variante", () => {
    const c = card("Necesito estudiar", { altAnswers: ["Tengo que estudiar"] });
    const ev = evaluateAnswer(c, "Tengo que estudiar");
    expect(ev.status).toBe("correct-same");
  });
});

describe("respuesta parcialmente correcta (error real localizado)", () => {
  it("detecta un único error real sin marcar el resto de la frase", () => {
    const ev = evaluateAnswer(card("Necesito estudiar"), "Necesito de estudiar");
    expect(ev.status).toBe("partial");
    expect(ev.errorWords).toEqual(["de"]);
  });

  it("interferencia típica del portugués ('mais' por 'más')", () => {
    const ev = evaluateAnswer(card("Quiero más tiempo"), "Quiero mais tiempo");
    expect(ev.status).toBe("partial");
    expect(ev.errorWords).toEqual(["mais"]);
  });
});

describe("respuesta incorrecta", () => {
  it("marca incorrect cuando la mayoría de las palabras no encuentran pareja", () => {
    const ev = evaluateAnswer(card("Voy a la tienda"), "Como una pizza enorme");
    expect(ev.status).toBe("incorrect");
  });
});

describe("respuesta vacía", () => {
  it("marca empty y no error alguno cuando la alumna respondió en voz alta", () => {
    const ev = evaluateAnswer(card("Voy a la tienda"), "");
    expect(ev.status).toBe("empty");
    expect(ev.errorWords).toEqual([]);
  });
});

describe("pistas de la profesora: solo se disparan sobre errores reales", () => {
  it("dispara la pista cuando la palabra clave está entre los errores", () => {
    const c = card("Quiero más tiempo", {
      hints: { mais: "«Mais» es portugués. En español se escribe «más», con tilde." },
    });
    const hint = teacherHint(c, "Quiero mais tiempo", ["mais"]);
    expect(hint).toBe("«Mais» es portugués. En español se escribe «más», con tilde.");
  });

  it("NO dispara la pista si la palabra fue escrita correctamente (no es un error real)", () => {
    const c = card("Quiero más tiempo", {
      hints: { mais: "«Mais» es portugués. En español se escribe «más», con tilde." },
    });
    const hint = teacherHint(c, "Quiero más tiempo", []);
    expect(hint).toBeNull();
  });
});

describe("feedback final: nunca explica un error que no existe", () => {
  it("no muestra 'explain' cuando la respuesta es correcta (igual o alternativa)", () => {
    const c = card("Quiero más tiempo", { note: "Recuerda usar «más» con tilde." });
    const fbSame = buildFeedback(c, "Quiero más tiempo");
    expect(fbSame.explain).toBeNull();

    const fbAlt = buildFeedback(card("Trabajo en una oficina"), "Yo trabajo en una oficina");
    expect(fbAlt.explain).toBeNull();
  });

  it("muestra 'explain' (pista o nota) cuando hay un error real", () => {
    const c = card("Quiero más tiempo", { note: "Recuerda usar «más» con tilde." });
    const fb = buildFeedback(c, "Quiero mais tiempo");
    expect(fb.explain).toBeTruthy();
  });

  it("sugiere una forma alternativa solo cuando la respuesta ya es correcta", () => {
    const c = card("Necesito estudiar", { altAnswers: ["Tengo que estudiar"] });
    const fb = buildFeedback(c, "Necesito estudiar");
    expect(fb.alternative).toBe("Tengo que estudiar");
  });
});

describe("frase_personal: la respuesta es propia de la alumna", () => {
  const modelo = "Trabajo en una empresa de productos veterinarios y me encargo de la atención al cliente. (modelo — usa tu experiencia real)";
  const c = { type: "frase_personal", front: "Adapta para ti: «Trabajo en _ y me encargo de _.»", answer: modelo };

  it("acepta cualquier respuesta escrita como personal", () => {
    const ev = evaluateAnswer(c, "Trabajo en una empresa de enseñanza de idiomas y me encargo de absolutamente todo.");
    expect(ev.status).toBe("personal");
    expect(ev.errorWords).toEqual([]);
  });

  it("marca empty cuando no responde nada", () => {
    const ev = evaluateAnswer(c, "");
    expect(ev.status).toBe("empty");
  });

  it("el feedback muestra la nota, no un error", () => {
    const fb = buildFeedback({ ...c, note: "Completa com a sua realidade." }, "Trabajo en una escuela de idiomas.");
    expect(fb.status).toBe("personal");
    expect(fb.errorWords).toEqual([]);
  });
});

describe("equivalencia semántica de palabras (wordsEquivalent)", () => {
  it("reconoce sinónimos de uso corriente", () => {
    expect(wordsEquivalent("pelicula", "film")).toBe(true);
    expect(wordsEquivalent("celular", "movil")).toBe(true);
  });

  it("no confunde palabras no relacionadas", () => {
    expect(wordsEquivalent("coche", "casa")).toBe(false);
  });
});
