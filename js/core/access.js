/*
  Nivel de acceso del usuario (parte "clásica", sin Firebase). Lo inicializa js/app/boot.js después de consultar Firebase.
  Aquí vive TODA la lógica de qué se permite en pantalla (la seguridad real está en firestore.rules):

    visitor → sin sesión. SOLO puede leer preguntas y respuestas (leer.html). Nada interactivo.
    trial   → entró con Google y su prueba de 48 horas sigue vigente. Acceso interactivo completo.
    premium → suscripción de 90 días activa y vigente. Acceso interactivo completo.
    locked  → entró con Google pero no tiene prueba ni Premium vigente. Solo lectura + cuenta + pagos + soporte.

  Si boot.js no la inicializa (pruebas en Node) el nivel es "premium" para no alterar el comportamiento clásico.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var doc = root.document;

  // Estados que ve la persona (pantalla Mi cuenta / avisos). Una sola definición.
  var STATES = {
    visitor: "Sin sesión",
    trial_active: "Prueba gratuita activa",
    trial_expired: "Prueba gratuita vencida",
    pending: "Pago en revisión",
    premium_active: "Premium activo",
    premium_expired: "Premium vencido",
    rejected: "Solicitud rechazada",
    suspended: "Acceso suspendido"
  };

  /* Calcula nivel y estado a partir de datos del servidor. Función pura (se prueba en Node).
     o: { signedIn, sub:{status,expiresAt(ms)}, trialStartedAt(ms|null), hasPending, nowMs, trialHours } */
  function compute(o) {
    var now = o.nowMs, hours = o.trialHours || 48;
    if (!o.signedIn) return { level: "visitor", status: "visitor", trialEndsAt: null, premiumEndsAt: null };
    var sub = o.sub || null, st = sub && sub.status, exp = sub && sub.expiresAt ? sub.expiresAt : null;
    var trialEnds = o.trialStartedAt ? o.trialStartedAt + hours * 3600000 : null;
    var out = { trialEndsAt: trialEnds, premiumEndsAt: exp };
    if (st === "suspended") { out.level = "locked"; out.status = "suspended"; return out; }
    if (st === "active" && exp && exp > now) { out.level = "premium"; out.status = "premium_active"; return out; }
    if (trialEnds && trialEnds > now) { out.level = "trial"; out.status = "trial_active"; return out; }
    out.level = "locked";
    if (o.hasPending) out.status = "pending";
    else if (st === "rejected") out.status = "rejected";
    else if (st === "active" || st === "expired") out.status = "premium_expired";
    else out.status = "trial_expired";
    return out;
  }

  var A = {
    STATES: STATES, compute: compute,
    level: "premium", status: "premium_active", user: null, isAdmin: false, trialEndsAt: null, premiumEndsAt: null,
    hooks: { signIn: null },
    _wallOpen: false,

    init: function (o) {
      o = o || {};
      A.level = o.level || "visitor";
      A.status = o.status || "visitor";
      A.user = o.user || null;
      A.isAdmin = !!o.isAdmin;
      A.trialEndsAt = o.trialEndsAt || null;
      A.premiumEndsAt = o.premiumEndsAt || null;
      A.trialError = o.trialError || null;
      A._wallOpen = false;
      if (o.hooks) A.hooks.signIn = o.hooks.signIn || null;
      if (doc && doc.documentElement) doc.documentElement.setAttribute("data-plan", A.hasAccess() ? "premium" : "free");
    },

    /* ¿Puede usar las funciones interactivas? (prueba vigente o Premium vigente) */
    hasAccess: function () { return A.level === "premium" || A.level === "trial"; },
    /* Compatibilidad con las pantallas de estudio existentes: "premium" = con acceso interactivo. */
    isPremium: function () { return A.hasAccess(); },
    isVisitor: function () { return A.level === "visitor"; },
    isLocked: function () { return A.level === "locked"; },

    /* Ya no hay cupos por uso: o hay acceso o no lo hay. Se conservan estas funciones para el código existente. */
    consume: function () { if (A.hasAccess()) return true; A.showWall("interactive"); return false; },
    guard: function () { if (A.hasAccess()) return true; A.showWall("interactive"); return false; },
    exhausted: function () { return !A.hasAccess(); },

    wallCopy: function () {
      if (A.level === "visitor") {
        return { t: "Inicia sesión para practicar", p: "Puedes leer todo el banco de preguntas con las respuestas correctas sin registrarte. Para practicar, hacer simulacros y guardar tu progreso, continúa con Google.", cta: "signin" };
      }
      var st = A.status;
      if (st === "pending") return { t: "Tu pago está en revisión", p: "Cuando se verifique, se activará tu Premium. Mientras tanto puedes leer todo el banco y consultar el estado de tu solicitud.", cta: "account", ctaLabel: "Ver el estado de mi solicitud" };
      if (st === "premium_expired") return { t: "Tu Premium venció", p: "Renueva por S/ 5.00 (90 días) para volver a usar las funciones interactivas. Tu cuenta, historial y progreso se conservan.", cta: "plans", ctaLabel: "Renovar mi Premium" };
      if (st === "suspended") return { t: "Tu acceso está suspendido", p: "Comunícate con soporte para revisar tu caso.", cta: "account", ctaLabel: "Ver mi cuenta" };
      if (st === "rejected") return { t: "Tu solicitud de pago no fue aprobada", p: "Revisa el motivo en tu cuenta y envía una nueva solicitud con los datos correctos.", cta: "plans", ctaLabel: "Enviar otra solicitud" };
      if (!A.trialEndsAt && A.trialError) {
        return { t: "No se pudo iniciar tu prueba gratuita", p: A.trialProblemText(), cta: "account", ctaLabel: "Ver detalles en mi cuenta" };
      }
      return { t: "Tu prueba gratuita terminó", p: "Sigues pudiendo leer todo el banco con las respuestas. Para volver a practicar, activa PERMAR Premium por S/ 5.00 (90 días). Tu progreso se conserva.", cta: "plans", ctaLabel: "Ver el plan Premium" };
    },

    /* Explica con palabras simples por qué la prueba NO empezó (error real de Firebase). */
    trialProblemText: function () {
      var c = A.trialError || "";
      if (c === "permission-denied") return "Firebase rechazó crear tu prueba (permission-denied). Casi siempre significa que las reglas de seguridad de Firestore de este proyecto no están publicadas o no son las de esta versión. Código: " + c + ".";
      if (c === "unavailable" || c === "failed-precondition") return "No hubo conexión con Firestore al crear tu prueba. Recarga la página; si sigue igual, revisa que la base de datos Firestore esté creada. Código: " + c + ".";
      return "No se pudo crear o leer tu prueba gratuita. Recarga la página; si sigue igual, avisa a soporte con este código: " + (c || "desconocido") + ".";
    },

    showWall: function () {
      if (!doc || A._wallOpen) return;
      A._wallOpen = true;
      var c = A.wallCopy();
      var esc = P.Util ? P.Util.esc : function (x) { return x; };
      var box = doc.createElement("div");
      box.className = "wall"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "wallT");
      var primary = c.cta === "signin"
        ? '<button type="button" class="btn btn-primary big" data-wall="signin">Continuar con Google</button>'
        : '<a class="btn btn-primary big" href="' + (c.cta === "account" ? "cuenta.html" : "planes.html") + '">' + esc(c.ctaLabel || "Ver el plan Premium") + "</a>";
      box.innerHTML = '<div class="wall-in glass"><h2 id="wallT">' + esc(c.t) + "</h2><p>" + esc(c.p) + "</p>" +
        '<div class="btnrow">' + primary + '<a class="btn btn-secondary" href="leer.html">📖 Leer preguntas y respuestas</a><a class="btn btn-secondary" href="index.html">Volver al inicio</a></div></div>';
      doc.body.appendChild(box);
      var btn = box.querySelector("[data-wall=signin]");
      if (btn) btn.addEventListener("click", function () { if (A.hooks.signIn) A.hooks.signIn(); });
      var f = box.querySelector(".btn-primary"); if (f) f.focus();
    },

    /* Texto corto del estado para la barra de cuenta. */
    statusLabel: function () { return STATES[A.status] || A.status; }
  };

  P.Access = A;
  if (typeof module !== "undefined" && module.exports) module.exports = A;
})(typeof window !== "undefined" ? window : globalThis);
