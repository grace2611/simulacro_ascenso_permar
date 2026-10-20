/*
  Plan único «PERMAR Premium — 90 días · S/ 5.00» y pago manual por Yape o Plin.
  Recorrido: iniciar sesión con Google → ver QR y número → pagar → enviar el comprobante (obligatorio) con el código de operación,
  el nombre del pagador y la confirmación → «pendiente» → la administradora VERIFICA el dinero y aprueba → Premium por 90 días.
*/
const P = window.PERMAR;

export async function init(ctx) {
  const U = P.Util, UI = P.UI, esc = U.esc;
  const root = document.getElementById("app");
  const cfg = ctx.cfg, pay = cfg.payment, plan = cfg.plan;
  const $ = (s, c) => (c || root).querySelector(s);
  const money = (n) => "S/ " + Number(n).toFixed(2);
  const fmt = (ms) => (ms ? new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) : "—");
  const status = ctx.acct.status, level = ctx.acct.level;
  let method = "yape", receipt = null, history = [];
  const qrOk = { yape: true, plin: true };

  function statusCard() {
    const req = ctx.acct.request, sub = ctx.acct.sub;
    const box = (cls, t, p) => '<section class="plan-status ' + cls + ' glass"><h2>' + t + "</h2>" + p + "</section>";
    if (level === "visitor") return "";
    if (status === "premium_active") return box("ok", "✅ Premium activo", "<p>Tu Premium vence el <strong>" + fmt(ctx.acct.premiumEndsAt) + "</strong>. Si renuevas ahora, los 90 días nuevos <strong>se suman</strong> a los que te quedan.</p>");
    if (status === "pending" && req) {
      return box("wait", "⏳ Solicitud de pago recibida",
        "<p>Tu solicitud de <strong>" + esc(req.planName) + "</strong> (" + money(req.amount) + ", " + (req.method === "plin" ? "Plin" : "Yape") + ", operación <strong>" + esc(req.operationCode) + "</strong>) quedó <strong>pendiente de revisión</strong>.</p>" +
        "<p>Revisaremos el comprobante y los datos de la operación en un plazo de <strong>hasta " + pay.verifyHours + " horas</strong>. Te enviaremos un correo cuando la solicitud haya sido revisada. Tu acceso Premium se activará <strong>únicamente si el pago es verificado y aprobado</strong>.</p>" +
        '<div class="btnrow"><button type="button" class="btn btn-secondary" id="cancelReq">Cancelar mi solicitud</button><button type="button" class="btn btn-secondary" onclick="location.reload()">Actualizar estado</button></div>');
    }
    if (status === "trial_active") return box("free", "🎁 Estás en tu prueba gratuita", "<p>Te quedan aproximadamente <strong>" + esc(fmtRem(ctx.acct.trialEndsAt - ctx.acct.nowMs)) + "</strong>. Puedes adquirir Premium cuando quieras; no pierdes nada.</p>");
    if (status === "premium_expired") return box("warn", "⌛ Tu Premium venció", "<p>Venció el " + fmt(ctx.acct.premiumEndsAt) + ". Tu cuenta, historial y progreso se conservan y volverán a estar disponibles al renovar.</p>");
    if (status === "rejected") return box("bad", "❌ Solicitud no aprobada", "<p><strong>Motivo:</strong> " + esc((sub && sub.reason) || "No se pudo verificar el pago.") + "</p><p class=\"hint\">Corrige los datos y envía una nueva solicitud, o escribe a soporte: " + esc(pay.contact) + ".</p>");
    if (status === "suspended") return box("bad", "⛔ Acceso suspendido", "<p>" + esc((sub && sub.reason) || "Tu acceso fue suspendido por la administración.") + "</p><p class=\"hint\">Soporte: " + esc(pay.contact) + "</p>");
    return box("warn", "⌛ Tu prueba gratuita terminó", "<p>Sigues pudiendo leer todo el banco con las respuestas. Para volver a practicar, activa Premium.</p>");
  }
  function fmtRem(ms) { const h = Math.max(0, Math.floor(ms / 3600000)); return h >= 48 ? Math.ceil(h / 24) + " días" : h + " horas"; }

  function planHero() {
    return '<section class="plan-hero glass"><div class="plan-hero-top"><div><span class="plan-badge">PLAN ÚNICO</span><h2>' + esc(plan.name) + "</h2></div>" +
      '<div class="plan-hero-price"><strong>' + money(plan.price) + "</strong><span>" + plan.days + " días</span></div></div>" +
      '<ul class="plain tick"><li>Repaso interactivo, cuestionarios y simulacros con tiempo</li><li>Tarjetas de estudio con repaso espaciado</li>' +
      "<li>Desafíos, XP, rachas y medallas</li><li>Progreso, historial, errores y estadísticas sincronizados entre dispositivos</li>" +
      "<li>Recomendaciones para PERMAR (nuevas preguntas, correcciones, simulacros…)</li></ul>" +
      '<p class="hint"><strong>Renovación manual:</strong> no hay cobro automático. Pagas una vez por 90 días y, cuando quieras seguir, vuelves a pagar. ' +
      "El Premium se activa <strong>solo después de que verifiquemos tu pago</strong>.</p>" +
      '<p class="hint">¿Primera vez? Al iniciar sesión con Google tienes <strong>48 horas de prueba gratuita</strong>, sin pagar ni pulsar nada más. ' +
      'La lectura de preguntas y respuestas es siempre gratis: <a href="leer.html">leer el banco</a>.</p></section>';
  }

  function signinBlock() {
    return '<section class="glass plan-signin"><h2>Primero, inicia sesión</h2><p>Continúa con Google (gratis, sin contraseñas).</p>' +
      '<button type="button" class="btn btn-primary big" id="signinBtn">Continuar con Google</button></section>';
  }

  const copyBtn = (v) => ' <button type="button" class="linkbtn" data-copy="' + esc(v) + '">📋 Copiar número</button>';

  function payPanel() {
    const m = pay[method];
    const tabs = ["yape", "plin"].map((k) => '<button type="button" role="tab" class="pay-tab' + (k === method ? " on" : "") + '" data-method="' + k + '" aria-selected="' + (k === method) + '">' + esc(pay[k].label) + "</button>").join("");
    const qrBlock = qrOk[method]
      ? '<button type="button" class="pay-qr-btn" id="qrZoom" aria-label="Ampliar el código QR de ' + esc(m.label) + '"><img id="qrImg" alt="Código QR de ' + esc(m.label) + ' para pagar ' + money(plan.price) + '" src="' + esc(m.qrImage) + '"><span class="pay-zoom">🔍 Ampliar</span></button>'
      : '<div class="pay-qr-missing" role="status">El QR de ' + esc(m.label) + " está <strong>pendiente de configuración</strong>. Usa el otro método o escribe a soporte.</div>";
    return '<section class="pay glass" id="paySection"><h2>Pago con Yape o Plin</h2>' +
      '<div class="pay-amount"><span>Importe exacto a pagar</span><strong>' + money(plan.price) + "</strong><small>" + esc(plan.name) + "</small></div>" +
      '<div class="pay-tabs" role="tablist" aria-label="Método de pago">' + tabs + "</div>" +
      '<div class="pay-grid"><div class="pay-info">' +
      '<div class="pay-num"><span>Número de ' + esc(m.label) + '</span><strong id="payNum">' + esc(m.number) + "</strong>" + copyBtn(m.number) + "</div>" +
      (pay.holder ? '<p class="pay-holder">Titular: <strong>' + esc(pay.holder) + "</strong></p>" : "") +
      '<ol class="pay-steps"><li><strong>En el celular:</strong> abre ' + esc(m.label) + " y escanea el QR, o paga al número de arriba.</li>" +
      "<li><strong>En computadora:</strong> escanea el QR de esta pantalla con la cámara de Yape/Plin en tu celular.</li>" +
      "<li>Paga <strong>exactamente " + money(plan.price) + "</strong> y guarda la captura y el <strong>código de operación</strong>.</li>" +
      "<li>Completa el formulario de abajo con el comprobante y envíalo.</li>" +
      "<li>Revisaremos tu pago en <strong>hasta " + pay.verifyHours + " horas</strong> y te avisaremos por correo.</li></ol>" +
      '<p class="hint">Si Yape/Plin no se abre solos, escanear el QR o copiar el número siempre funciona.</p></div>' +
      '<div class="pay-qr">' + qrBlock + "</div></div>" +
      '<form id="payForm" class="pay-form" novalidate><h3>Enviar mi comprobante</h3>' +
      '<div class="field"><label>Método con el que pagaste *</label><div class="pills"><label class="pill"><input type="radio" name="method" value="yape"' + (method === "yape" ? " checked" : "") + '><span>Yape</span></label><label class="pill"><input type="radio" name="method" value="plin"' + (method === "plin" ? " checked" : "") + "><span>Plin</span></label></div></div>" +
      '<div class="field"><label for="rcpt">Captura o imagen del comprobante * <small>(JPG, PNG o WEBP · máx. 8 MB)</small></label><input id="rcpt" type="file" accept="image/jpeg,image/png,image/webp" required><p class="hint" id="rcptInfo">Obligatorio. Solo lo ve la administradora y <strong>no activa</strong> tu cuenta por sí solo.</p><img id="rcptPrev" class="rcpt-prev" alt="Vista previa del comprobante" hidden></div>' +
      '<div class="field"><label for="opCode">Código de operación *</label><input id="opCode" maxlength="20" autocomplete="off" inputmode="text" placeholder="Ej.: 12345678" required></div>' +
      '<div class="field"><label for="payer">Nombre de la persona que realizó el pago *</label><input id="payer" maxlength="80" autocomplete="name" placeholder="Nombres y apellidos" required></div>' +
      '<div class="field"><label for="note">Comentarios (opcional)</label><textarea id="note" maxlength="300" rows="2"></textarea></div>' +
      '<label class="check confirm"><input type="checkbox" id="confirmOp" required> <span>Confirmo que los datos y el comprobante enviados corresponden a mi operación.</span></label>' +
      '<p class="hint err" id="payErr" role="alert"></p>' +
      '<button type="submit" class="btn btn-primary big" id="paySend">✅ Enviar para verificación</button></form></section>';
  }

  function historyBlock() {
    if (!history.length) return "";
    return '<section class="glass plan-hist"><h3>Mis solicitudes anteriores</h3><ul class="plain">' + history.map((h) =>
      "<li>" + (h.reviewedAt ? new Date(h.reviewedAt.toMillis()).toLocaleDateString("es-PE") : "") + " · " + esc(h.planName || "") + " · " +
      (h.status === "approved" ? "✅ Aprobada" : h.status === "rejected" ? "❌ Rechazada" : "🛠 Activación manual") + (h.reason ? " — " + esc(h.reason) : "") + "</li>").join("") + "</ul></section>";
  }

  function render() {
    const canPay = level !== "visitor" && status !== "pending" && status !== "suspended";
    root.innerHTML = statusCard() + planHero() + (level === "visitor" ? signinBlock() : "") + (canPay ? payPanel() : "") + historyBlock() +
      '<p class="hint plan-foot">Soporte y dudas: <a href="mailto:' + esc(pay.contact) + '">' + esc(pay.contact) + '</a> · <a href="cuenta.html">Mi cuenta</a> · <a href="index.html">Volver al inicio</a></p>';
    restore();
    const si = $("#signinBtn"); if (si) si.addEventListener("click", ctx.signIn);
    root.querySelectorAll("[data-method]").forEach((b) => b.addEventListener("click", () => { method = b.getAttribute("data-method"); keep(); render(); }));
    root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => {
      const v = b.getAttribute("data-copy");
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => UI.toast("✅ Número copiado", "ok"), () => UI.toast("No se pudo copiar. Selecciónalo y cópialo manualmente.", "warn"));
    }));
    const qr = $("#qrImg");
    if (qr) qr.addEventListener("error", () => { qrOk[method] = false; render(); });
    const qz = $("#qrZoom");
    if (qz) qz.addEventListener("click", () => UI.dialog({ title: "QR de " + pay[method].label + " · " + money(plan.price), html: '<img class="qr-big" alt="Código QR de ' + esc(pay[method].label) + '" src="' + esc(pay[method].qrImage) + '">', dismissValue: "x", actions: [{ label: "Cerrar", value: "x", cls: "btn-primary" }] }));
    const cr = $("#cancelReq");
    if (cr) cr.addEventListener("click", async () => {
      const ok = await UI.confirm("¿Cancelar tu solicitud?", "<p>Se eliminará tu solicitud pendiente. Si ya pagaste, <strong>no</strong> canceles: espera la revisión.</p>", "Sí, cancelar", true);
      if (!ok) return;
      try { await ctx.Payments.cancelRequest(ctx.user.uid); location.reload(); } catch (e) { UI.toast("⚠️ No se pudo cancelar. Inténtalo de nuevo.", "warn"); }
    });
    const rc = $("#rcpt");
    if (rc) rc.addEventListener("change", async () => {
      receipt = null; $("#payErr").textContent = ""; $("#rcptPrev").hidden = true;
      if (!rc.files[0]) return;
      try {
        receipt = await ctx.Payments.fileToDataUrl(rc.files[0]);
        $("#rcptInfo").textContent = "✅ Imagen lista (" + Math.round(receipt.length / 1024) + " KB tras reducirla).";
        const pv = $("#rcptPrev"); pv.src = receipt; pv.hidden = false;
      } catch (e) { rc.value = ""; $("#payErr").textContent = e.message; }
    });
    const form = $("#payForm");
    if (form) form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const btn = $("#paySend"), err = $("#payErr"); err.textContent = "";
      const val = { method: form.querySelector("input[name=method]:checked").value, operationCode: $("#opCode").value, payerName: $("#payer").value, note: $("#note").value, receipt, confirmed: $("#confirmOp").checked };
      const bad = ctx.Payments.validateForm(val);
      if (bad) { err.textContent = bad; return; }
      btn.disabled = true; btn.textContent = "Enviando…";
      try {
        await ctx.Payments.submitRequest(ctx.user, cfg, val);
        btn.textContent = "✅ Enviado";
        await showSuccess(val);
        location.reload();
      } catch (e) { err.textContent = e.message || "No se pudo enviar. Inténtalo de nuevo."; btn.disabled = false; btn.textContent = "✅ Enviar para verificación"; }
    });
  }
  /* Pantalla de confirmación tras enviar: da tranquilidad de que el comprobante llegó y explica qué pasa ahora. */
  function showSuccess(val) {
    const now = new Date();
    const when = now.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) + ", " + now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
    const ref = String(ctx.user.uid || "").slice(0, 6).toUpperCase();
    const row = (k, v) => "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>";
    const html =
      '<div class="sent-ok">' +
      '<div class="sent-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 15-17"/></svg></div>' +
      '<p class="sent-lead">Recibimos tu comprobante de <strong>' + money(plan.price) + "</strong>. Tu solicitud ya está en nuestra bandeja para verificación.</p>" +
      '<dl class="sent-receipt">' +
      row("Importe pagado", money(plan.price)) + row("Plan", esc(plan.name) + " · " + plan.days + " días") +
      row("Método", val.method === "plin" ? "Plin" : "Yape") + row("Código de operación", esc(String(val.operationCode).trim())) +
      row("Pagado por", esc(String(val.payerName).trim())) + row("Enviado el", esc(when)) + (ref ? row("N.º de solicitud", esc(ref)) : "") +
      row("Estado", '<span class="sent-state">⏳ En revisión</span>') + "</dl>" +
      '<ol class="sent-next"><li><strong>Verificamos tu pago</strong> en hasta ' + pay.verifyHours + " horas.</li>" +
      "<li><strong>Te avisamos por correo</strong> a " + esc(ctx.user.email || "tu correo de Google") + ".</li>" +
      "<li><strong>Se activa tu Premium</strong> por " + plan.days + " días apenas se apruebe.</li></ol>" +
      '<p class="hint">No necesitas volver a enviar nada ni pagar de nuevo. Puedes cerrar esta ventana: tu solicitud queda guardada y visible en esta página. ' +
      "Dudas: <a href=\"mailto:" + esc(pay.contact) + '">' + esc(pay.contact) + "</a>.</p></div>";
    return UI.dialog({ title: "¡Enviado con éxito!", html, dismissValue: "x", actions: [{ label: "Entendido", value: "x", cls: "btn-primary" }] });
  }

  let draft = { op: "", payer: "", note: "", ok: false };
  function keep() { /* conserva lo escrito al cambiar de método */
    const g = (id) => { const e = $(id); return e ? e : null; };
    if (g("#opCode")) draft = { op: $("#opCode").value, payer: $("#payer").value, note: $("#note").value, ok: $("#confirmOp").checked };
  }
  function restore() {
    if (!$("#opCode")) return;
    $("#opCode").value = draft.op; $("#payer").value = draft.payer; $("#note").value = draft.note; $("#confirmOp").checked = draft.ok;
    if (receipt) { $("#rcptInfo").textContent = "✅ Imagen lista (" + Math.round(receipt.length / 1024) + " KB tras reducirla)."; const pv = $("#rcptPrev"); pv.src = receipt; pv.hidden = false; }
  }

  if (level !== "visitor") { try { history = await ctx.Payments.myHistory(ctx.user.uid); } catch (e) { history = []; } }
  render();
}
