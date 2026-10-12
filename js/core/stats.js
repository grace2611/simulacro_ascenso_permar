/*
  Estadísticas y selección de preguntas. Solo lectura sobre el estado guardado.

  Se diferencian explícitamente:
   · preguntas ÚNICAS respondidas   (cuántas del banco has visto)
   · respuestas TOTALES             (incluye repeticiones)
   · % de aciertos histórico        (aciertos / respuestas totales)
   · % de dominio                   (preguntas dominadas / banco)  ← NO es el % de aciertos
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var C = P.CONFIG, U = P.Util, S = P.SRS, G = P.Gamify;

  function bank(cat) { return (P.DATA && P.DATA[cat]) || []; }
  var cache = null;
  function index() {                      // id → { cat, i, q }
    if (cache) return cache;
    cache = {};
    C.catKeys.forEach(function (cat) {
      bank(cat).forEach(function (q, i) { cache[q.id] = { cat: cat, i: i, q: q }; });
    });
    return cache;
  }

  var Stats = {
    bank: bank,
    find: function (id) { return index()[id] || null; },
    resetIndex: function () { cache = null; },

    catStats: function (state, cat, today) {
      var total = bank(cat).length, seen = 0, n = 0, ok = 0, mastered = 0, due = 0, errorsOpen = 0, failedEver = 0;
      Object.keys(state.q).forEach(function (id) {
        var q = state.q[id];
        if (q.cat !== cat || !index()[id]) return;      // ignora ids que ya no existen en el banco
        seen++; n += q.n; ok += q.ok;
        if (q.mastered) mastered++;
        if (S.isDue(q, today)) due++;
        if (q.lapses > 0) failedEver++;
        if (S.isErrorOpen(q)) errorsOpen++;
      });
      var bc = state.totals.byCat[cat] || { answers: 0, correct: 0, seconds: 0 };
      return {
        cat: cat, total: total, seen: seen, unseen: Math.max(0, total - seen),
        answers: bc.answers, correct: bc.correct, wrong: Math.max(0, bc.answers - bc.correct),
        accuracy: U.pct(bc.correct, bc.answers),
        mastered: mastered, masteredPct: U.pct(mastered, total),
        due: due, errorsOpen: errorsOpen, failedEver: failedEver, seconds: bc.seconds
      };
    },

    overview: function (state, today) {
      var cats = C.catKeys.map(function (k) { return Stats.catStats(state, k, today); });
      var sum = function (f) { return cats.reduce(function (a, c) { return a + c[f]; }, 0); };
      var last7 = { a: 0, c: 0 };
      for (var i = 0; i < 7; i++) {
        var d = state.daily[U.addDays(today, -i)];
        if (d) { last7.a += d.a; last7.c += d.c; }
      }
      var lastDay = Object.keys(state.daily).filter(function (k) { return state.daily[k].a > 0; }).sort().pop() || null;
      return {
        cats: cats, total: sum("total"), seen: sum("seen"), mastered: sum("mastered"),
        due: sum("due"), errorsOpen: sum("errorsOpen"), failedEver: sum("failedEver"),
        answers: state.totals.answers, correct: state.totals.correct,
        accuracy: U.pct(state.totals.correct, state.totals.answers),
        recentAccuracy: last7.a >= 10 ? U.pct(last7.c, last7.a) : null, // sin muestra suficiente → null
        recentAnswers: last7.a, seconds: state.totals.seconds, lastDay: lastDay,
        hasActivity: state.totals.answers > 0 || state.attempts.length > 0 || state.exams.length > 0
      };
    },

    /* ----- tiempo estimado ----- */
    secondsPerQuestion: function (state) {
      var t = state.totals;
      return t.answers >= 20 && t.seconds > 0
        ? Math.max(10, Math.round(t.seconds / t.answers))
        : C.session.fallbackSecondsPerQuestion;
    },
    estimateMinutes: function (state, n) {
      return Math.max(1, Math.round((n * Stats.secondsPerQuestion(state)) / 60));
    },

    /* ----- listas de preguntas ----- */
    dueIds: function (state, cats, today) {
      var out = [];
      Object.keys(state.q).forEach(function (id) {
        var q = state.q[id];
        if (!index()[id] || cats.indexOf(q.cat) < 0 || !S.isDue(q, today)) return;
        out.push(id);
      });
      // primero las falladas y las más atrasadas
      out.sort(function (a, b) {
        var qa = state.q[a], qb = state.q[b];
        var wa = qa.last === "w" ? 0 : 1, wb = qb.last === "w" ? 0 : 1;
        if (wa !== wb) return wa - wb;
        if (qa.due !== qb.due) return qa.due < qb.due ? -1 : 1;
        return a < b ? -1 : 1;
      });
      return out;
    },
    // filtro: 'todas' | 'pendientes' | <categoría>
    errorIds: function (state, filter) {
      var out = [];
      Object.keys(state.q).forEach(function (id) {
        var q = state.q[id];
        if (!index()[id] || q.lapses <= 0) return;
        if (filter === "pendientes") { if (q.mastered) return; }
        else if (filter !== "todas" && q.cat !== filter) return;
        out.push(id);
      });
      out.sort(function (a, b) {
        var qa = state.q[a], qb = state.q[b];
        if (qa.mastered !== qb.mastered) return qa.mastered ? 1 : -1;
        if (qa.lapses !== qb.lapses) return qb.lapses - qa.lapses;
        return a < b ? -1 : 1;
      });
      return out;
    },
    unseenIds: function (state, cats) {
      var out = [];
      cats.forEach(function (cat) {
        bank(cat).forEach(function (q) { if (!state.q[q.id]) out.push(q.id); });
      });
      return out;
    },
    allIds: function (cats) {
      var out = [];
      cats.forEach(function (cat) { bank(cat).forEach(function (q) { out.push(q.id); }); });
      return out;
    },

    // Cola para una sesión: pendientes → nunca vistas → resto (sin repetir, aleatorio dentro de cada grupo)
    buildQueue: function (state, cats, limit, today) {
      var seen = {}, out = [];
      function push(list) {
        U.shuffle(list).forEach(function (id) { if (!seen[id] && out.length < limit) { seen[id] = 1; out.push(id); } });
      }
      var due = Stats.dueIds(state, cats, today);
      push(due.slice());
      push(Stats.unseenIds(state, cats));
      push(Stats.allIds(cats).filter(function (id) { return state.q[id] && !S.isDue(state.q[id], today); }));
      return out;
    },

    /* ----- series para gráficos ----- */
    gradeSeries: function (state) {
      var series = {};
      C.catKeys.forEach(function (k) { series[k] = []; });
      state.attempts.forEach(function (a) {
        if (series[a.cat] && a.total > 0) series[a.cat].push({ grade: U.num(a.grade), label: a.when || U.fmtDateTime(a.ts), kind: "práctica", total: a.total });
      });
      state.exams.forEach(function (e) {
        if (series[e.cat] && e.counted && e.total > 0) series[e.cat].push({ grade: U.num(e.grade), label: U.fmtDateTime(e.ts), kind: "simulacro", total: e.total });
      });
      return series;
    },
    // Rendimiento medio por fase (bloques 1-25, 26-50, 51-75, 76-100)
    phaseStats: function (state) {
      var out = C.phases.map(function (_, i) { return { phase: i + 1, n: 0, sumGrade: 0, avg: null }; });
      state.attempts.forEach(function (a) {
        (a.phases || []).forEach(function (p) {
          var o = out[p.phase - 1];
          if (o && p.total > 0) { o.n++; o.sumGrade += U.num(p.grade); }
        });
      });
      out.forEach(function (o) { o.avg = o.n ? o.sumGrade / o.n : null; });
      return out;
    },
    dailySeries: function (state, today, days) {
      var out = [];
      for (var i = days - 1; i >= 0; i--) {
        var k = U.addDays(today, -i), d = state.daily[k] || { a: 0, c: 0 };
        out.push({ key: k, a: d.a, c: d.c });
      }
      return out;
    }
  };

  P.Stats = Stats;
  if (typeof module !== "undefined" && module.exports) module.exports = Stats;
})(typeof window !== "undefined" ? window : globalThis);
