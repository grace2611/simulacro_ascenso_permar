/*
  Persistencia (localStorage) con validación, migración y manejo de errores.

  - Todo el estado nuevo vive en UNA clave: "permar_v2" (JSON con versión).
  - El historial anterior ("historial") se IMPORTA una sola vez y nunca se borra
    salvo que el usuario elija "Borrar progreso".
  - Si el JSON guardado está corrupto se conserva una copia ("permar_v2_corrupt")
    y la app arranca limpia en lugar de romperse.
  - Si no hay localStorage (modo privado, etc.) la app sigue funcionando en memoria.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var C = P.CONFIG, U = P.Util;

  var backend = null;      // { getItem, setItem, removeItem }
  var state = null;        // caché en memoria
  var persistent = true;   // false si no se pudo escribir
  var ACTIVE_KINDS = ["estudio", "tarjetas", "simulacro"];
  function activeKey(kind) { return C.storageKey + "_active_" + kind; }

  function detect() {
    try {
      var s = root.localStorage;
      s.setItem("__permar_t", "1");
      s.removeItem("__permar_t");
      return s;
    } catch (e) { return null; }
  }
  function be() {
    if (backend === null) {
      backend = detect();
      if (!backend) { persistent = false; backend = memoryBackend(); }
    }
    return backend;
  }
  function memoryBackend() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; }
    };
  }

  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }

  function blank() {
    var g = C.goals.types[C.goals.defaultType];
    return {
      v: C.version,
      created: U.nowISO(),
      q: {},                 // progreso por pregunta (clave = id estable)
      attempts: [],          // práctica clásica por fases + historial importado
      sessions: [],          // errores / repasos / sesiones rápidas / tarjetas
      exams: [],             // simulacros
      daily: {},             // actividad por día (AAAA-MM-DD)
      totals: { answers: 0, correct: 0, seconds: 0, cards: 0, recovered: 0, byCat: {} },
      xp: { total: 0, awarded: {} },
      badges: {},            // id → fecha ISO
      goal: { type: C.goals.defaultType, target: g.def },
      prefs: { reduceMotion: false },
      bestStreak: 0,
      migrated: { legacy: false }
    };
  }

  /* ---------- validación: nunca confiar en lo que hay guardado ---------- */
  function sanitize(raw) {
    var s = blank();
    if (!isObj(raw)) return s;
    if (typeof raw.created === "string") s.created = raw.created;

    if (isObj(raw.q)) {
      Object.keys(raw.q).forEach(function (id) {
        var e = raw.q[id];
        if (!isObj(e) || !/^[a-z]+-\d{3}$/.test(id)) return;
        var cat = String(id).split("-")[0];
        if (!C.catByKey[cat]) return;
        s.q[id] = {
          cat: cat,
          n: Math.max(0, U.int(e.n)), ok: Math.max(0, U.int(e.ok)),
          last: e.last === "c" || e.last === "w" || e.last === "d" ? e.last : null,
          lastDate: U.isDateKey(e.lastDate) ? e.lastDate : null,
          due: U.isDateKey(e.due) ? e.due : null,
          step: U.clamp(U.int(e.step), 0, C.srs.intervals.length - 1),
          streak: Math.max(0, U.int(e.streak)),
          lapses: Math.max(0, U.int(e.lapses)),
          mastered: !!e.mastered,
          indep: U.isDateKey(e.indep) ? e.indep : null,
          fd: U.isDateKey(e.fd) ? e.fd : null,
          firstSeen: U.isDateKey(e.firstSeen) ? e.firstSeen : null,
          hist: typeof e.hist === "string" ? e.hist.replace(/[^cwd]/g, "").slice(-12) : ""
        };
      });
    }
    ["attempts", "sessions", "exams"].forEach(function (k) {
      if (Array.isArray(raw[k])) s[k] = raw[k].filter(isObj);
    });
    if (isObj(raw.daily)) {
      Object.keys(raw.daily).forEach(function (d) {
        var e = raw.daily[d];
        if (!U.isDateKey(d) || !isObj(e)) return;
        s.daily[d] = {
          a: Math.max(0, U.int(e.a)), c: Math.max(0, U.int(e.c)), r: Math.max(0, U.int(e.r)),
          s: Math.max(0, U.int(e.s)), t: Math.max(0, U.int(e.t)), x: Math.max(0, U.int(e.x)),
          xa: Math.max(0, U.int(e.xa)), xq: isObj(e.xq) ? e.xq : {}
        };
      });
    }
    if (isObj(raw.totals)) {
      var t = raw.totals;
      s.totals.answers = Math.max(0, U.int(t.answers));
      s.totals.correct = Math.max(0, U.int(t.correct));
      s.totals.seconds = Math.max(0, U.int(t.seconds));
      s.totals.cards = Math.max(0, U.int(t.cards));
      s.totals.recovered = Math.max(0, U.int(t.recovered));
      if (isObj(t.byCat)) {
        Object.keys(t.byCat).forEach(function (k) {
          if (!C.catByKey[k] || !isObj(t.byCat[k])) return;
          s.totals.byCat[k] = {
            answers: Math.max(0, U.int(t.byCat[k].answers)),
            correct: Math.max(0, U.int(t.byCat[k].correct)),
            seconds: Math.max(0, U.int(t.byCat[k].seconds))
          };
        });
      }
    }
    if (isObj(raw.xp)) {
      s.xp.total = Math.max(0, U.int(raw.xp.total));
      if (isObj(raw.xp.awarded)) s.xp.awarded = raw.xp.awarded;
    }
    if (isObj(raw.badges)) s.badges = raw.badges;
    if (isObj(raw.goal) && C.goals.types[raw.goal.type]) {
      s.goal.type = raw.goal.type;
      var tg = U.int(raw.goal.target);
      s.goal.target = tg > 0 && tg <= 500 ? tg : C.goals.types[raw.goal.type].def;
    }
    if (isObj(raw.prefs)) s.prefs.reduceMotion = !!raw.prefs.reduceMotion;
    s.bestStreak = Math.max(0, U.int(raw.bestStreak));
    if (isObj(raw.migrated)) s.migrated.legacy = !!raw.migrated.legacy;
    return s;
  }

  /* ---------- migración del historial anterior ---------- */
  function migrateLegacy(s) {
    if (s.migrated.legacy) return false;
    var changed = false;
    try {
      var raw = be().getItem(C.legacyHistoryKey);
      var list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        var have = {};
        s.attempts.forEach(function (a) { have[a.id] = true; });
        list.forEach(function (h, idx) {
          if (!isObj(h) || !C.catByKey[h.categoria]) return;
          var id = "legacy-" + idx + "-" + String(h.fecha || "").replace(/\W+/g, "");
          if (have[id]) return;
          var total = Math.max(0, U.int(h.total)), pts = Math.max(0, U.int(h.puntaje));
          if (pts > total) pts = total;
          s.attempts.push({
            id: id, source: "legacy", cat: h.categoria,
            correct: pts, total: total,
            grade: total > 0 ? U.num(h.nota, U.grade(pts, total)) : 0,
            phase: Math.max(1, Math.min(4, U.int(h.fase, 1))),
            when: String(h.fecha || ""), ts: null, status: "guardado",
            phases: [], wrong: []
          });
          changed = true;
        });
      }
    } catch (e) { /* un historial ilegible no debe romper la app */ }
    s.migrated.legacy = true;
    return changed || true;
  }

  /* ---------- API ---------- */
  var Store = {
    // pruebas: sustituir el almacenamiento
    setBackend: function (b) { backend = b || null; state = null; persistent = true; },
    isPersistent: function () { be(); return persistent; },
    lastError: null,

    get: function () {
      if (state) return state;
      var raw = null;
      try { raw = be().getItem(C.storageKey); } catch (e) { raw = null; }
      var parsed = null;
      if (raw) {
        try { parsed = JSON.parse(raw); }
        catch (e) {
          try { be().setItem(C.storageKey + "_corrupt", raw); } catch (e2) { /* nada */ }
          Store.lastError = "Los datos guardados estaban dañados; se guardó una copia y se inició de nuevo.";
          parsed = null;
        }
      }
      state = sanitize(parsed);
      if (migrateLegacy(state)) Store.save();
      return state;
    },

    save: function () {
      if (!state) return false;
      var tries = 0;
      while (tries < 3) {
        try {
          be().setItem(C.storageKey, JSON.stringify(state));
          return true;
        } catch (e) {
          Store.lastError = "No se pudo guardar el progreso (almacenamiento lleno o bloqueado).";
          tries++;
          // recortar lo menos valioso y reintentar
          state.sessions = state.sessions.slice(-Math.floor(C.limits.sessions / (tries + 1)));
          var keys = Object.keys(state.daily).sort();
          while (keys.length > 120) delete state.daily[keys.shift()];
        }
      }
      persistent = false;
      return false;
    },

    // Borra TODO el progreso (el usuario ya confirmó en la interfaz).
    reset: function () {
      try {
        be().removeItem(C.storageKey);
        be().removeItem(C.storageKey + "_corrupt");
        ACTIVE_KINDS.forEach(function (k) { be().removeItem(activeKey(k)); });
        be().removeItem(C.legacyHistoryKey);
      } catch (e) { /* nada */ }
      state = blank();
      state.migrated.legacy = true;
      Store.save();
      return state;
    },

    // Sesión / simulacro en curso (una por tipo) para restaurar tras recargar
    getActive: function (kind) {
      try {
        var a = JSON.parse(be().getItem(activeKey(kind)) || "null");
        if (isObj(a) && a.kind === kind) return a;
      } catch (e) { /* nada */ }
      return null;
    },
    setActive: function (obj) {
      try { be().setItem(activeKey(obj.kind), JSON.stringify(obj)); return true; } catch (e) { return false; }
    },
    clearActive: function (kind) { try { be().removeItem(activeKey(kind)); } catch (e) { /* nada */ } },

    // fuerza relectura (pruebas / recarga simulada)
    invalidate: function () { state = null; },
    blank: blank,
    sanitize: sanitize
  };

  P.Store = Store;
  if (typeof module !== "undefined" && module.exports) module.exports = Store;
})(typeof window !== "undefined" ? window : globalThis);
