/*
  Texto de los correos al estudiante (aprobación / rechazo) para enviarlos A MANO desde el panel (Gmail o la app de correo).
  Sirve cuando las Cloud Functions no están activas (plan Blaze) o para reenviar un aviso. Lógica pura (se prueba en Node).
  El texto replica el de functions/lib/templates.js para que el estudiante reciba lo mismo por cualquiera de las dos vías.
  El motivo del rechazo lo escribe la administradora: aquí nunca se inventa.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});

  var TZ = "America/Lima";
  function day(ms) { return new Date(ms).toLocaleDateString("es-PE", { timeZone: TZ, day: "2-digit", month: "long", year: "numeric" }); }
  function dateTime(ms) { return new Date(ms).toLocaleString("es-PE", { timeZone: TZ, day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  function name(d) { return String(d.displayName || "").trim(); }
  function hello(d) { return "Hola" + (name(d) ? " " + name(d) : "") + ","; }
  function tail(ctx) { return "Soporte: " + (ctx.supportEmail || "") + (ctx.siteUrl ? "\n" + ctx.siteUrl : ""); }

  /* d = { email, displayName, planName, days, startMs, expiresMs, renewal } */
  function approved(d, ctx) {
    ctx = ctx || {};
    var lines = [
      hello(d), "",
      "Verificamos tu pago y activamos tu PERMAR Premium.", "",
      "Plan: " + (d.planName || "PERMAR Premium — 90 días"),
      "Duración: " + (d.days || 90) + " días"
    ];
    if (d.startMs) lines.push("Inicio del periodo: " + day(d.startMs));
    if (d.expiresMs) lines.push("Vence el: " + dateTime(d.expiresMs));
    if (d.renewal) lines.push("", "Como renovaste antes de que venciera, los días nuevos se sumaron a los que te quedaban.");
    if (ctx.siteUrl) lines.push("", "Entra a la plataforma: " + ctx.siteUrl);
    lines.push("", "¡Éxitos en tu preparación!", tail(ctx));
    return { to: d.email || "", subject: "Pago verificado: tu PERMAR Premium está activo", body: lines.join("\n") };
  }

  /* d = { email, displayName, operationCode, reason } */
  function rejected(d, ctx) {
    ctx = ctx || {};
    var reason = String(d.reason || "").trim();
    var pay = ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, "") + "/planes.html" : "";
    var lines = [
      hello(d), "",
      "Revisamos tu solicitud de pago" + (d.operationCode ? " (operación " + d.operationCode + ")" : "") + " y no pudo ser aprobada.", "",
      "Motivo: " + (reason || "(sin motivo escrito)"), "",
      "Puedes corregir los datos y enviar una nueva solicitud con el comprobante correcto" + (pay ? ": " + pay : "") + ".",
      "Si crees que es un error, responde este correo" + (d.operationCode ? " indicando tu código de operación" : "") + ".",
      "", tail(ctx)
    ];
    return { to: d.email || "", subject: "Tu solicitud de pago no fue aprobada · PERMAR", body: lines.join("\n") };
  }

  /* Enlace para abrir el mensaje ya redactado en Gmail (navegador, sin instalar nada). */
  var SENDER = "webpagepermar@gmail.com";   // cuenta desde la que se envía (Gmail abre con esta cuenta si ya está iniciada en el navegador)
  function gmailUrl(m) {
    return "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(m.to) + "&su=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body) + "&authuser=" + encodeURIComponent(SENDER);
  }
  function mailtoUrl(m) {
    return "mailto:" + encodeURIComponent(m.to) + "?subject=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body);
  }

  /* Motivos de rechazo más comunes (la administradora los elige o los escribe con sus palabras). */
  var REJECT_REASONS = [
    "No encontré el pago con ese código de operación en mi Yape/Plin.",
    "El monto recibido no coincide con S/ 5.00.",
    "El comprobante no se lee bien o está incompleto.",
    "El código de operación ya fue usado en otra solicitud.",
    "El nombre de quien pagó no coincide con el del comprobante.",
    "El pago se hizo a otro número o titular, no al indicado en la plataforma."
  ];

  var API = { approved: approved, rejected: rejected, gmailUrl: gmailUrl, mailtoUrl: mailtoUrl, REJECT_REASONS: REJECT_REASONS };
  P.MailText = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
