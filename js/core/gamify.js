/*
  Gamificación: niveles, racha, meta diaria, desafíos semanales y medallas.
  Todo se calcula a partir del estado guardado; las medallas solo se desbloquean
  cuando su condición REAL se cumple (nunca por mostrar su tarjeta).
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var C = P.CONFIG, U = P.Util;

  /* ---------- niveles ---------- */
  function xpAt(level) { return C.levels.base * (level - 1) * level; }

  function levelFor(total) {
    total = Math.max(0, U.int(total));
    var L = 1;
    while (xpAt(L + 1) <= total) L++;
    var names = C.levels.names;
    var from = xpAt(L), to = xpAt(L + 1);
    return {
      level: L,
      name: names[Math.min(L - 1, names.length - 1)] + (L > names.length ? " " + (L - names.length + 1) : ""),
      xp: total, into: total - from, need: to - from, toNext: to - total,
      pct: Math.round(((total - from) / (to - from)) * 100)
    };
  }

  /* ---------- racha ---------- */
  function isStudyDay(state, key) {
    var d = state.daily[key];
    return !!(d && d.a >= C.goals.studyDayMin);
  }
  function streak(state, today) {
    var doneToday = isStudyDay(state, today);
    var cursor = doneToday ? today : U.addDays(today, -1);
    var n = 0;
    while (isStudyDay(state, cursor)) { n++; cursor = U.addDays(cursor, -1); }
    // mejor racha histórica (de los días conservados)
    var keys = Object.keys(state.daily).filter(function (k) { return isStudyDay(state, k); }).sort();
    var best = 0, run = 0, prev = null;
    keys.forEach(function (k) {
      run = prev && U.diffDays(prev, k) === 1 ? run + 1 : 1;
      if (run > best) best = run;
      prev = k;
    });
    best = Math.max(best, state.bestStreak || 0, n);
    return { current: n, best: best, doneToday: doneToday, alive: n > 0 };
  }

  /* ---------- meta diaria ---------- */
  function goalValue(state, key, type) {
    var d = state.daily[key] || { a: 0, r: 0, s: 0 };
    return type === "sesion" ? d.s : type === "repasos" ? d.r : d.a;
  }
  function goalProgress(state, today) {
    var g = state.goal, def = C.goals.types[g.type];
    var value = goalValue(state, today, g.type);
    return { type: g.type, label: def.label, unit: def.unit, target: g.target, value: value,
             pct: Math.min(100, U.pct(value, g.target)), done: value >= g.target };
  }

  /* ---------- desafíos semanales ---------- */
  function weekProgress(state, today) {
    var start = U.weekStart(today), days = 0, mastered = 0, answers = 0;
    for (var i = 0; i < 7; i++) {
      var k = U.addDays(start, i), d = state.daily[k];
      if (!d) continue;
      if (d.a >= C.goals.studyDayMin) days++;
      answers += d.a;
    }
    Object.keys(state.q).forEach(function (id) {
      var q = state.q[id];
      if (q.mastered && q.indep && q.indep >= start && q.indep <= U.addDays(start, 6)) mastered++;
    });
    return { start: start, studyDays: days, mastered: mastered, answers: answers };
  }
  function challenges(state, today) {
    var w = weekProgress(state, today), cfg = C.challenges;
    return [
      { id: "dias", icon: "📅", title: "Constancia semanal",
        desc: "Estudia al menos " + C.goals.studyDayMin + " preguntas durante " + cfg.weeklyStudyDays + " días esta semana.",
        value: w.studyDays, target: cfg.weeklyStudyDays, unit: "días", href: "estudio.html?modo=rapida", cta: "Estudiar ahora" },
      { id: "dominio", icon: "🎯", title: "Domina preguntas",
        desc: "Consigue dominar " + cfg.weeklyMastered + " preguntas esta semana (" + C.srs.masteryStreak + " aciertos independientes cada una).",
        value: w.mastered, target: cfg.weeklyMastered, unit: "preguntas", href: "estudio.html?modo=hoy", cta: "Repasar pendientes" },
      { id: "volumen", icon: "🏃", title: "Ritmo de la semana",
        desc: "Responde 100 preguntas esta semana.",
        value: w.answers, target: 100, unit: "preguntas", href: "estudio.html?modo=rapida", cta: "Practicar" }
    ];
  }

  /* ---------- medallas ---------- */
  function sessionsDone(state) {
    var n = 0;
    state.sessions.forEach(function (s) { if (s.counted) n++; });
    state.attempts.forEach(function (a) { if (a.source !== "legacy" && a.counted) n++; });
    state.exams.forEach(function (e) { if (e.counted) n++; });
    return n;
  }
  function masteredByCat(state) {
    var out = {};
    C.catKeys.forEach(function (k) { out[k] = 0; });
    Object.keys(state.q).forEach(function (id) { var q = state.q[id]; if (q.mastered) out[q.cat]++; });
    return out;
  }
  function bankSize(cat) { return (P.DATA && P.DATA[cat]) ? P.DATA[cat].length : 0; }

  function gradeImproved(state) {
    var found = false;
    C.catKeys.forEach(function (cat) {
      var list = [];
      state.attempts.forEach(function (a) { if (a.cat === cat && a.total >= 25) list.push(U.num(a.grade)); });
      state.exams.forEach(function (e) { if (e.cat === cat && e.counted && e.total >= 25) list.push(U.num(e.grade)); });
      if (list.length >= 2) {
        var last = list[list.length - 1], bestBefore = Math.max.apply(null, list.slice(0, -1));
        if (last > bestBefore) found = true;
      }
    });
    return found;
  }

  var BADGES = [
    { id: "primera", icon: "🚀", name: "Primera sesión", desc: "Completa tu primera sesión de estudio.",
      cond: "1 sesión completada", check: function (s) { return sessionsDone(s) >= 1; } },
    { id: "cien", icon: "💯", name: "Primeras 100", desc: "Responde 100 preguntas en total.",
      cond: "100 respuestas", check: function (s) { return s.totals.answers >= 100; } },
    { id: "cinco", icon: "🗓️", name: "Cinco sesiones", desc: "Completa cinco sesiones de estudio.",
      cond: "5 sesiones completadas", check: function (s) { return sessionsDone(s) >= 5; } },
    { id: "semana", icon: "🔥", name: "Una semana de constancia", desc: "Estudia 7 días seguidos.",
      cond: "racha de 7 días", check: function (s, t) { return streak(s, t).best >= 7; } },
    { id: "recupera", icon: "🛟", name: "Remontada", desc: "Recupera 5 preguntas que antes habías fallado.",
      cond: "5 preguntas fallidas recuperadas", check: function (s) { return s.totals.recovered >= 5; } },
    { id: "categoria", icon: "🏅", name: "Categoría dominada", desc: "Domina el 80 % de las preguntas de una categoría.",
      cond: "80 % de una categoría dominada", check: function (s) {
        var m = masteredByCat(s), ok = false;
        C.catKeys.forEach(function (k) { var b = bankSize(k); if (b > 0 && m[k] / b >= 0.8) ok = true; });
        return ok;
      } },
    { id: "mejora", icon: "📈", name: "Mejorando", desc: "Supera tu mejor nota anterior en una categoría (mínimo 25 preguntas).",
      cond: "nota mayor que tu mejor intento previo", check: function (s) { return gradeImproved(s); } },
    { id: "simulacro", icon: "⏱️", name: "Bajo presión", desc: "Termina un simulacro de examen.",
      cond: "1 simulacro finalizado", check: function (s) {
        return s.exams.some(function (e) { return e.counted; });
      } },
    { id: "tarjetas", icon: "🃏", name: "Memoria en acción", desc: "Evalúa 50 tarjetas de memoria.",
      cond: "50 tarjetas evaluadas", check: function (s) { return s.totals.cards >= 50; } }
  ];

  var Gamify = {
    xpAt: xpAt, levelFor: levelFor, streak: streak, isStudyDay: isStudyDay,
    goalProgress: goalProgress, weekProgress: weekProgress, challenges: challenges,
    badges: BADGES, sessionsDone: sessionsDone, masteredByCat: masteredByCat, bankSize: bankSize,

    // Devuelve las medallas recién desbloqueadas (y las registra)
    evaluateBadges: function (state, today) {
      var fresh = [];
      BADGES.forEach(function (b) {
        if (state.badges[b.id]) return;
        var ok = false;
        try { ok = !!b.check(state, today); } catch (e) { ok = false; }
        if (ok) { state.badges[b.id] = U.nowISO(); fresh.push(b); }
      });
      return fresh;
    }
  };

  P.Gamify = Gamify;
  if (typeof module !== "undefined" && module.exports) module.exports = Gamify;
})(typeof window !== "undefined" ? window : globalThis);
