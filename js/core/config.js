/*
  Configuración central. Todo lo "ajustable" vive aquí: categorías, fases,
  repetición espaciada, criterio de dominio, XP, niveles, metas y simulacro.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});

  P.CONFIG = {
    version: 2,
    storageKey: "permar_v2",          // estado nuevo (v2)
    legacyHistoryKey: "historial",    // historial anterior: se importa, NO se borra
    themeKey: "simulacro_theme",

    /* ---------- categorías (la clave "oficinista" se conserva por compatibilidad) ---------- */
    categories: [
      { key: "cultura",    nombre: "Cultura General", corto: "Cultura",      icono: "📚" },
      { key: "deberes",    nombre: "Deberes",         corto: "Deberes",      icono: "⚓" },
      { key: "oficinista", nombre: "Especialidad",    corto: "Especialidad", icono: "🧰" }
    ],

    /* ---------- práctica clásica por fases ---------- */
    phases: [25, 50, 75, 100],

    /* ---------- notas ----------
       nota = (aciertos / preguntas evaluadas) × 20   (sin penalización por error).
       Las preguntas sin responder cuentan como no acertadas en el simulacro.        */
    gradeScale: 20,
    passGrade: 13,                      // color verde/rojo en el historial (igual que antes)
    exam: {
      countOptions: [25, 50, 75, 100],
      defaultCount: 50,
      minutesPerQuestion: 1,            // tiempo sugerido = preguntas × 1 min (editable)
      minMinutes: 5, maxMinutes: 180,
      penaltyPerWrong: 0                // puntos que restan por error (0 = sin penalización)
    },

    /* ---------- repetición espaciada ----------
       intervals[k] = días hasta el próximo repaso tras k aciertos "independientes".
       Falla  → vuelve al paso 0 (hoy). Acierto → sube un paso.                      */
    srs: {
      intervals: [0, 1, 3, 7, 14, 30, 60],
      doubtDelayDays: 1,                // "Tuve dudas": se repite mañana, sin subir de paso
      masteryStreak: 3                  // aciertos independientes (en días distintos, sin ver la respuesta antes)
    },

    /* ---------- sesiones cortas ---------- */
    session: {
      timeOptions: [5, 10, 15],
      countOptions: [10, 15, 25, 100],
      minAnswersToCount: 5,             // una sesión cuenta (XP/medallas) con al menos 5 respuestas
      maxSecondsPerAnswer: 120,         // tope para no inflar el tiempo si te distraes
      fallbackSecondsPerQuestion: 35,   // estimación mientras no haya datos tuyos
      dueLimitOptions: [10, 20, 0]      // 0 = todas
    },

    /* ---------- meta diaria ---------- */
    goals: {
      studyDayMin: 5,                   // un "día de estudio" exige al menos 5 preguntas respondidas / tarjetas evaluadas
      defaultType: "respuestas",
      types: {
        respuestas: { label: "Estudiar preguntas",         unit: "preguntas",  options: [10, 15, 25, 50], def: 15 },
        sesion:     { label: "Completar sesiones",         unit: "sesiones",   options: [1, 2, 3],        def: 1 },
        repasos:    { label: "Revisar preguntas pendientes", unit: "repasos",  options: [5, 10, 20],      def: 10 }
      }
    },

    /* ---------- XP (puntos de experiencia) ----------
       Reglas anti-abuso: solo la PRIMERA respuesta sin ayuda de cada pregunta cada día da XP,
       las preguntas ya dominadas y no vencidas no dan XP, hay un tope diario y los bonos
       únicos se registran para no repetirse.                                              */
    xp: {
      correctNew: 10,
      correctReview: 8,
      correctPractice: 4,
      relearned: 5,
      mastered: 25,
      recoveredBonus: 15,
      cardRemembered: 3,
      cardDoubt: 1,
      sessionComplete: 20,
      examComplete: 40,
      dailyGoal: 30,
      weeklyChallenge: 50,
      categoryMilestones: { 25: 100, 50: 150, 75: 200, 100: 300 },   // % dominado → XP (una vez)
      dailyAnswerCap: 300
    },

    /* ---------- niveles ----------
       XP acumulado para llegar al nivel L: 50 × (L−1) × L  (L2 = 100, L3 = 300, L4 = 600 …)
       Los nombres son ilustrativos (no son grados oficiales).                              */
    levels: {
      names: ["Aprendiz", "Grumete", "Marinero", "Timonel", "Contramaestre",
              "Oficial de guardia", "Jefe de cubierta", "Capitán de estudio",
              "Maestre", "Almirante del saber"],
      base: 50
    },

    /* ---------- desafíos semanales ---------- */
    challenges: {
      weeklyStudyDays: 5,
      weeklyMastered: 10
    },

    /* ---------- límites de almacenamiento ---------- */
    limits: { attempts: 200, sessions: 300, exams: 100, dailyDays: 400, wrongPerSession: 100 }
  };

  P.CONFIG.catKeys = P.CONFIG.categories.map(function (c) { return c.key; });
  P.CONFIG.catByKey = {};
  P.CONFIG.categories.forEach(function (c) { P.CONFIG.catByKey[c.key] = c; });

  if (typeof module !== "undefined" && module.exports) module.exports = P.CONFIG;
})(typeof window !== "undefined" ? window : globalThis);
