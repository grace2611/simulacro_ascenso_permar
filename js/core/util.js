/*
  Utilidades compartidas: fechas locales, aleatoriedad, formato y escape de HTML.
  Todas las fechas "de calendario" se manejan como texto local AAAA-MM-DD (dateKey),
  así la racha y los repasos no cambian por zonas horarias ni por recargar la página.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});

  var clockFn = null;      // permite simular fechas en las pruebas
  var rngFn = null;        // permite aleatoriedad determinista en las pruebas

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  var Util = {
    /* ---------- reloj ---------- */
    now: function () { return clockFn ? new Date(clockFn()) : new Date(); },
    setClock: function (fn) { clockFn = typeof fn === "function" ? fn : null; },
    setRandom: function (fn) { rngFn = typeof fn === "function" ? fn : null; },
    random: function () { return rngFn ? rngFn() : Math.random(); },

    /* ---------- fechas ---------- */
    dateKey: function (d) {
      d = d || Util.now();
      return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
    },
    today: function () { return Util.dateKey(Util.now()); },
    isDateKey: function (s) { return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s); },
    // Fecha al mediodía local: evita errores por cambios de horario (DST).
    parseKey: function (key) {
      var p = String(key).split("-");
      return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0, 0);
    },
    addDays: function (key, n) {
      var d = Util.parseKey(key);
      d.setDate(d.getDate() + n);
      return Util.dateKey(d);
    },
    diffDays: function (a, b) { // b - a en días de calendario
      return Math.round((Util.parseKey(b) - Util.parseKey(a)) / 86400000);
    },
    weekStart: function (key) { // lunes de esa semana
      var d = Util.parseKey(key);
      var wd = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - wd);
      return Util.dateKey(d);
    },
    nowISO: function () { return Util.now().toISOString(); },

    /* ---------- aleatoriedad ---------- */
    shuffle: function (arr) { // Fisher–Yates (el sort aleatorio anterior estaba sesgado)
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Util.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },

    /* ---------- formato ---------- */
    esc: function (s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
    clamp: function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); },
    num: function (v, def) { v = Number(v); return isFinite(v) ? v : (def || 0); },
    int: function (v, def) { v = Math.floor(Number(v)); return isFinite(v) ? v : (def || 0); },
    pct: function (a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; },
    grade: function (correct, total, scale) { // nota sobre 20 (0 si no hay preguntas)
      scale = scale || 20;
      return total > 0 ? (correct / total) * scale : 0;
    },
    fmtGrade: function (n) { return (Math.round(Util.num(n) * 100) / 100).toFixed(2); },
    fmtDuration: function (sec) {
      sec = Math.max(0, Math.round(Util.num(sec)));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      if (h > 0) return h + " h " + pad2(m) + " min";
      if (m > 0) return m + " min " + pad2(s) + " s";
      return s + " s";
    },
    fmtClock: function (sec) { // mm:ss para el temporizador
      sec = Math.max(0, Math.ceil(Util.num(sec)));
      var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      return (h > 0 ? h + ":" + pad2(m) : m) + ":" + pad2(s);
    },
    fmtDate: function (key) {
      if (!Util.isDateKey(key)) return "—";
      try {
        return Util.parseKey(key).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
      } catch (e) { return key; }
    },
    fmtDateTime: function (iso) {
      var d = iso ? new Date(iso) : null;
      if (!d || isNaN(d.getTime())) return "—";
      try {
        return d.toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
      } catch (e) { return iso; }
    },
    uid: function (prefix) {
      return (prefix || "id") + "-" + Date.now().toString(36) + "-" + Math.floor(Util.random() * 1679616).toString(36);
    },
    plural: function (n, one, many) { return n === 1 ? one : many; }
  };

  P.Util = Util;
  if (typeof module !== "undefined" && module.exports) module.exports = Util;
})(typeof window !== "undefined" ? window : globalThis);
