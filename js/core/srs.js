/*
  Repetición espaciada y dominio (funciones puras sobre UNA pregunta).

  Estado por pregunta (q):
    n        respuestas totales            ok     respuestas correctas
    last     'c' correcta · 'w' fallo · 'd' dudas
    due      próxima fecha de repaso       step   paso actual de los intervalos
    streak   aciertos INDEPENDIENTES seguidos (días distintos, sin ayuda)
    lapses   veces que se ha fallado       mastered  dominada
    indep    último día con acierto independiente    fd  último día con fallo
    hist     últimos resultados (c/w/d)

  Reglas clave:
   • Una pregunta nunca estudiada NO existe en q (no se confunde con una fallada).
   • Fallar → paso 0, vence HOY, racha a 0, deja de estar dominada.
   • Acierto independiente (sin ayuda y no el mismo día de un fallo) → sube un paso;
     la próxima fecha = hoy + intervals[paso].
   • Solo cuenta UN acierto independiente por pregunta y por día (no sirve "empollar").
   • Dominada = masteryStreak aciertos independientes seguidos.
   • Acertar tras haber visto la solución (ayuda) no hace avanzar el calendario.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var C = P.CONFIG, U = P.Util;

  function blank(cat) {
    return { cat: cat, n: 0, ok: 0, last: null, lastDate: null, due: null, step: 0, streak: 0,
             lapses: 0, mastered: false, indep: null, fd: null, firstSeen: null, hist: "" };
  }
  function clone(q) { return JSON.parse(JSON.stringify(q)); }

  var SRS = {
    blank: blank,

    // ev: { result: 'correct'|'wrong'|'doubt', assisted: bool }
    next: function (q0, cat, ev, today) {
      var cfg = C.srs, iv = cfg.intervals, lastStep = iv.length - 1;
      var q = q0 ? clone(q0) : blank(cat);
      var flags = {
        first: !q0,
        wasDue: !!(q0 && q0.due && q0.due <= today),
        wasError: !!(q0 && q0.lapses > 0 && !q0.mastered),
        wasMastered: !!(q0 && q0.mastered),
        lapse: false, progressed: false, newlyMastered: false, recovered: false
      };
      q.n++;
      q.lastDate = today;
      if (!q.firstSeen) q.firstSeen = today;

      if (ev.result === "wrong") {
        q.last = "w"; q.lapses++; q.streak = 0; q.step = 0; q.mastered = false;
        q.due = today; q.fd = today; flags.lapse = true;
      } else if (ev.result === "doubt") {
        q.last = "d";
        q.due = U.addDays(today, cfg.doubtDelayDays);
        if (q.due < (q0 && q0.due ? q0.due : q.due)) q.due = q0.due;
      } else {
        q.ok++; q.last = "c";
        // tras fallar HOY, un acierto el mismo día ya vio la solución → es ayudado
        var assisted = !!ev.assisted || q.fd === today;
        if (assisted) {
          var tomorrow = U.addDays(today, 1);
          if (!q.due || q.due < tomorrow) q.due = tomorrow;
        } else if (q.indep === today) {
          var t2 = U.addDays(today, 1);
          if (!q.due || q.due < t2) q.due = t2;
        } else {
          q.indep = today;
          q.streak++;
          q.step = Math.min(q.step + 1, lastStep);
          q.due = U.addDays(today, iv[q.step]);
          flags.progressed = true;
          if (!q.mastered && q.streak >= cfg.masteryStreak) {
            q.mastered = true; flags.newlyMastered = true;
            if (q.lapses > 0) flags.recovered = true;
          }
        }
      }
      q.hist = (q.hist + (q.last || "")).slice(-12);
      return { q: q, flags: flags };
    },

    // Estado legible
    status: function (q, today) {
      if (!q) return "nueva";
      if (q.mastered) return q.due && q.due <= today ? "pendiente" : "dominada";
      if (q.due && q.due <= today) return "pendiente";
      return q.lapses > 0 && q.last === "w" ? "fallada" : "aprendiendo";
    },
    isDue: function (q, today) { return !!(q && q.due && q.due <= today); },
    isErrorOpen: function (q) { return !!(q && q.lapses > 0 && !q.mastered); },

    // Dificultad estimada según las respuestas
    difficulty: function (q) {
      if (!q || q.n === 0) return "sin datos";
      var acc = q.ok / q.n;
      if (q.lapses >= 2 || (q.n >= 2 && acc < 0.5)) return "difícil";
      if (q.n >= 3 && acc >= 0.85 && q.lapses === 0) return "fácil";
      return "media";
    }
  };

  P.SRS = SRS;
  if (typeof module !== "undefined" && module.exports) module.exports = SRS;
})(typeof window !== "undefined" ? window : globalThis);
