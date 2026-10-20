/*
  Utilidades PURAS para dividir el progreso en partes (documentos de Firestore pequeños) y para
  combinar dos versiones del progreso sin perder datos (p. ej. cambios hechos sin conexión).
  Sin dependencias del navegador: se prueba en Node (tests/sync.test.js).
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});

  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  function max(a, b) { return Math.max(+a || 0, +b || 0); }

  /* ---------- partes ----------
     core      totales, XP, medallas, meta, preferencias
     daily     actividad por día
     attempts / sessions / exams   historiales (cada uno en su propio documento)
     q_<cat>   progreso por pregunta de cada categoría                                  */
  function split(state) {
    var parts = {
      core: {
        v: state.v, created: state.created, totals: state.totals, xp: state.xp, badges: state.badges,
        goal: state.goal, prefs: state.prefs, bestStreak: state.bestStreak, migrated: state.migrated
      },
      daily: state.daily, attempts: state.attempts, sessions: state.sessions, exams: state.exams
    };
    var byCat = {};
    Object.keys(state.q || {}).forEach(function (id) {
      var c = (state.q[id] && state.q[id].cat) || String(id).split("-")[0];
      (byCat[c] = byCat[c] || {})[id] = state.q[id];
    });
    Object.keys(byCat).forEach(function (c) { parts["q_" + c] = byCat[c]; });
    return parts;
  }
  function join(parts) {
    var s = {};
    var core = parts.core || {};
    Object.keys(core).forEach(function (k) { s[k] = core[k]; });
    s.daily = parts.daily || {}; s.attempts = parts.attempts || []; s.sessions = parts.sessions || []; s.exams = parts.exams || [];
    s.q = {};
    Object.keys(parts).forEach(function (k) {
      if (k.indexOf("q_") === 0 && isObj(parts[k])) Object.keys(parts[k]).forEach(function (id) { s.q[id] = parts[k][id]; });
    });
    return s;
  }

  function newerQ(a, b) {
    if (!a) return b; if (!b) return a;
    if ((+a.n || 0) !== (+b.n || 0)) return (+a.n || 0) > (+b.n || 0) ? a : b;
    return String(a.lastDate || "") >= String(b.lastDate || "") ? a : b;
  }
  function unionById(a, b) {
    var seen = {}, out = [];
    (a || []).concat(b || []).forEach(function (x) {
      if (!isObj(x)) return;
      var id = x.id != null ? x.id : JSON.stringify(x);
      if (seen[id]) return; seen[id] = 1; out.push(x);
    });
    return out;
  }

  /* merge(remote, local): ambos son estados ya validados. Nunca pierde preguntas, historiales ni totales. */
  function merge(remote, local, limits) {
    limits = limits || { attempts: 200, sessions: 300, exams: 100 };
    var out = JSON.parse(JSON.stringify(remote));
    out.q = out.q || {};
    Object.keys(local.q || {}).forEach(function (id) { out.q[id] = newerQ(out.q[id], local.q[id]); });
    ["attempts", "sessions", "exams"].forEach(function (k) {
      var u = unionById(remote[k], local[k]);
      while (u.length > limits[k]) u.shift();
      out[k] = u;
    });
    out.daily = out.daily || {};
    Object.keys(local.daily || {}).forEach(function (d) {
      var a = out.daily[d], b = local.daily[d];
      if (!a) { out.daily[d] = b; return; }
      var m = {};
      ["a", "c", "r", "s", "t", "x", "xa"].forEach(function (f) { m[f] = max(a[f], b[f]); });
      m.xq = Object.assign({}, a.xq || {}, b.xq || {});
      out.daily[d] = m;
    });
    var t = out.totals = out.totals || {}, lt = local.totals || {};
    ["answers", "correct", "seconds", "cards", "recovered"].forEach(function (f) { t[f] = max(t[f], lt[f]); });
    t.byCat = t.byCat || {};
    Object.keys(lt.byCat || {}).forEach(function (c) {
      var a = t.byCat[c] || {}, b = lt.byCat[c];
      t.byCat[c] = { answers: max(a.answers, b.answers), correct: max(a.correct, b.correct), seconds: max(a.seconds, b.seconds) };
    });
    out.xp = { total: max(remote.xp && remote.xp.total, local.xp && local.xp.total), awarded: Object.assign({}, remote.xp && remote.xp.awarded, local.xp && local.xp.awarded) };
    out.badges = Object.assign({}, local.badges || {}, remote.badges || {});
    out.goal = local.goal || remote.goal;          // el local con cambios pendientes es lo más reciente que hizo la persona
    out.prefs = local.prefs || remote.prefs;
    out.bestStreak = max(remote.bestStreak, local.bestStreak);
    if (local.created && (!out.created || local.created < out.created)) out.created = local.created;
    out.migrated = { legacy: true };
    return out;
  }

  P.Merge = { split: split, join: join, merge: merge };
  if (typeof module !== "undefined" && module.exports) module.exports = P.Merge;
})(typeof window !== "undefined" ? window : globalThis);
