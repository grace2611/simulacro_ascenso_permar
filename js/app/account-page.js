/*
  Mi cuenta: estado de acceso (prueba, Premium, solicitud, vencimientos), historial de pagos, soporte y sesión.
  Nada de lo que se muestra aquí se puede editar: las fechas y estados los fija el servidor.
*/
const P = window.PERMAR;

export async function init(ctx) {
  const U = P.Util, UI = P.UI, esc = U.esc;
  const root = document.getElementById("app");
  const pay = ctx.cfg.payment, plan = ctx.cfg.plan, acct = ctx.acct;
  const fmt = (ms) => (ms ? new Date(ms).toLocaleString("es-PE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  const fmtD = (ms) => (ms ? new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) : "—");
  const rem = (ms) => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h >= 48 ? Math.ceil(h / 24) + " días" : h + " h " + m + " min"; };
  const card = (cls, t, body) => '<section class="plan-status ' + cls + ' glass"><h2>' + t + "</h2>" + body + "</section>";

  if (!ctx.user) {
    root.innerHTML = card("free", "Inicia sesión para ver tu cuenta", "<p>Con tu cuenta de Google verás el estado de tu prueba gratuita de 48 horas, tu Premium y tus solicitudes de pago.</p>" +
      '<div class="btnrow"><button type="button" class="btn btn-primary big" id="si">Continuar con Google</button><a class="btn btn-secondary" href="leer.html">📖 Leer preguntas y respuestas</a></div>');
    root.querySelector("#si").addEventListener("click", ctx.signIn);
    return;
  }

  const st = acct.status, req = acct.request, sub = acct.sub;
  let main = "";
  if (st === "premium_active") {
    main = card("ok", "⭐ Premium activo", "<p>Inicio: <strong>" + fmtD(sub && sub.startsAt && sub.startsAt.toMillis && sub.startsAt.toMillis()) + "</strong><br>Vence: <strong>" + fmt(acct.premiumEndsAt) + "</strong> (" + esc(rem(acct.premiumEndsAt - acct.nowMs)) + ' restantes)</p><p class="hint">Si renuevas antes de que venza, los 90 días nuevos se suman a los que te quedan.</p>' +
      '<div class="btnrow"><a class="btn btn-secondary" href="planes.html">Renovar Premium</a></div>');
  } else if (st === "trial_active") {
    main = card("free", "🎁 Prueba gratuita activa", "<p>Empezó el <strong>" + fmt(acct.trialStartedAt) + "</strong>.<br>Termina el <strong>" + fmt(acct.trialEndsAt) + "</strong> (" + esc(rem(acct.trialEndsAt - acct.nowMs)) + " restantes).</p>" +
      "<p class=\"hint\">La prueba se inicia una sola vez por cuenta y no se reinicia. Cuando termine conservarás tu cuenta y tu progreso.</p>" +
      (req ? "" : '<div class="btnrow"><a class="btn btn-primary" href="planes.html">Ver ' + esc(plan.name) + " · S/ " + plan.price.toFixed(2) + "</a></div>"));
  } else if (st === "pending") {
    main = card("wait", "⏳ Solicitud de pago en revisión", "<p>Plan: <strong>" + esc(req.planName) + "</strong> · S/ " + Number(req.amount).toFixed(2) + " · " + (req.method === "plin" ? "Plin" : "Yape") + " · operación <strong>" + esc(req.operationCode) + "</strong>.</p><p>La revisamos en hasta " + pay.verifyHours + " horas y te avisamos por correo. Tu Premium se activa solo si el pago es verificado y aprobado.</p>");
  } else if (st === "premium_expired") {
    main = card("warn", "⌛ Premium vencido", "<p>Venció el <strong>" + fmtD(acct.premiumEndsAt) + "</strong>. Conservas tu cuenta, historial, estadísticas y progreso; volverás a usarlos al renovar.</p>" +
      '<div class="btnrow"><a class="btn btn-primary" href="planes.html">Renovar por S/ ' + plan.price.toFixed(2) + " (" + plan.days + " días)</a></div>");
  } else if (st === "rejected") {
    main = card("bad", "❌ Solicitud no aprobada", "<p><strong>Motivo:</strong> " + esc((sub && sub.reason) || "No se pudo verificar el pago.") + '</p><div class="btnrow"><a class="btn btn-primary" href="planes.html">Enviar otra solicitud</a></div>');
  } else if (st === "suspended") {
    main = card("bad", "⛔ Acceso suspendido", "<p>" + esc((sub && sub.reason) || "Tu acceso fue suspendido.") + "</p><p class=\"hint\">Escribe a soporte: " + esc(pay.contact) + "</p>");
  } else if (!acct.trialStartedAt && acct.trialError) {
    main = card("bad", "⚠️ Tu prueba no pudo iniciarse", "<p>" + esc(P.Access.trialProblemText()) + "</p>" +
      '<p class="hint">No es que tu prueba haya vencido: nunca llegó a crearse. Cuando se corrija, entra de nuevo y empezará sola.</p>' +
      '<div class="btnrow"><button type="button" class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>');
  } else {
    main = card("warn", "⌛ Prueba gratuita vencida", "<p>Terminó el <strong>" + fmt(acct.trialEndsAt) + "</strong>. Puedes seguir leyendo todo el banco con las respuestas, ver tu cuenta y renovar.</p>" +
      '<div class="btnrow"><a class="btn btn-primary" href="planes.html">Ver ' + esc(plan.name) + " · S/ " + plan.price.toFixed(2) + '</a><a class="btn btn-secondary" href="leer.html">📖 Leer preguntas y respuestas</a></div>');
  }

  let hist = [];
  try { hist = await ctx.Payments.myHistory(ctx.user.uid); } catch (e) { hist = []; }
  const histHtml = hist.length ? '<section class="glass plan-hist"><h3>Mis pagos</h3><ul class="plain">' + hist.map((h) =>
    "<li>" + (h.reviewedAt ? new Date(h.reviewedAt.toMillis()).toLocaleDateString("es-PE") : "") + " · " + esc(h.planName || "") + " · " +
    (h.status === "approved" ? "✅ Aprobada" : h.status === "rejected" ? "❌ Rechazada" : "🛠 Activación manual") + (h.reason ? " — " + esc(h.reason) : "") + "</li>").join("") + "</ul></section>" : "";

  const links = '<section class="glass plan-hist"><h3>Accesos</h3><div class="btnrow">' +
    (ctx.access ? '<a class="btn btn-secondary" href="recomendaciones.html">💡 Recomendaciones para PERMAR</a>' : "") +
    '<button type="button" class="btn btn-secondary" id="devBtn">Dispositivos e identificador</button><button type="button" class="btn btn-secondary" id="outBtn">Cerrar sesión</button></div>' +
    '<p class="hint">Soporte: <a href="mailto:' + esc(pay.contact) + '">' + esc(pay.contact) + "</a></p></section>";

  root.innerHTML = '<section class="glass plan-hist"><p><strong>' + esc(ctx.user.displayName || "") + "</strong><br>" + esc(ctx.user.email || "") + "</p></section>" + main + histHtml + links;
  root.querySelector("#outBtn").addEventListener("click", ctx.signOut);
  root.querySelector("#devBtn").addEventListener("click", async () => { const m = await import("./account-ui.js"); m.openAccount(ctx); });
}
