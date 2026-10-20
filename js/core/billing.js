/*
  Lógica pura de suscripciones (sin Firebase ni navegador → se prueba en Node).
  · computeExpiry: renovar con Premium activo SUMA los días al vencimiento vigente; si ya venció (o no hay), cuenta desde ahora.
  · historyId: id determinista del historial de una solicitud → una solicitud solo puede resolverse UNA vez (idempotencia).
  · requestIsOpen: una solicitud solo se puede resolver si sigue pendiente.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var DAY = 86400000;

  /* sub: { status, expiresAt(ms) } | null. Devuelve { startMs (inicio del periodo contratado), expiresMs, renewal } */
  function computeExpiry(sub, days, nowMs) {
    var cur = sub && sub.status === "active" && sub.expiresAt ? sub.expiresAt : null;
    var renewal = !!(cur && cur > nowMs);
    var base = renewal ? cur : nowMs;
    return { startMs: base, expiresMs: base + days * DAY, renewal: renewal };
  }
  function historyId(uid, createdMs) { return uid + "_" + (createdMs || 0); }
  function requestIsOpen(r) { return !!r && (r.status === "pending" || r.status === "pending_verification"); }

  /* ---- validación del formulario de pago (el comprobante es OBLIGATORIO) ---- */
  function validateOperationCode(v) {
    v = String(v || "").trim();
    if (v.length < 4 || v.length > 20) return "Escribe el código de operación (entre 4 y 20 caracteres).";
    if (!/^[A-Za-z0-9-]+$/.test(v)) return "El código solo puede tener letras, números y guiones.";
    return null;
  }
  function validatePayerName(v) {
    v = String(v || "").trim();
    if (v.length < 3) return "Escribe el nombre completo de la persona que realizó el pago (mínimo 3 letras).";
    if (v.length > 80) return "El nombre es demasiado largo (máximo 80 caracteres).";
    return null;
  }
  function validateForm(o) {
    if (o.method !== "yape" && o.method !== "plin") return "Elige si pagaste por Yape o Plin.";
    if (!o.receipt) return "Adjunta la captura o imagen del comprobante: es obligatoria.";
    var a = validateOperationCode(o.operationCode); if (a) return a;
    var b = validatePayerName(o.payerName); if (b) return b;
    if (!o.confirmed) return "Marca la casilla para confirmar que los datos corresponden a tu operación.";
    return null;
  }

  var B = { validateOperationCode: validateOperationCode, validatePayerName: validatePayerName, validateForm: validateForm, DAY: DAY, computeExpiry: computeExpiry, historyId: historyId, requestIsOpen: requestIsOpen };
  P.Billing = B;
  if (typeof module !== "undefined" && module.exports) module.exports = B;
})(typeof window !== "undefined" ? window : globalThis);
