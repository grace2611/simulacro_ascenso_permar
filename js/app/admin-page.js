/*
  Panel de administración. Solo se muestra a quien tenga el documento admins/{uid} (lo valida boot.js Y, sobre todo, firestore.rules).

  Seis secciones (antes eran nueve pestañas sueltas):
    🏠 Inicio ........ qué necesita atención hoy + números clave + guía rápida
    💳 Pagos ......... pendientes por revisar (aprobar / rechazar con motivo) e historial
    👥 Usuarios ...... quién ingresó · buscar y gestionar a una persona
    ✉️ Correos ....... estado de los avisos automáticos y reintento
    💡 Recomendaciones sugerencias de los estudiantes
    ⚙️ Ajustes ....... datos del sitio · bancos de preguntas · registro de cambios

  Al aprobar o rechazar un pago se abre «Avisar al estudiante»: si las Cloud Functions están activas, el correo sale solo (se
  comprueba en mailLog); si no, el mensaje queda redactado (con el motivo del rechazo) y se envía con un clic desde Gmail.
*/
const P = window.PERMAR;

export async function init(ctx) {
  const Admin = await import("./admin.js");
  const Recs = await import("./recs-page.js");
  Admin.setClockOffset(ctx.acct.nowMs - Date.now());
  const U = P.Util, UI = P.UI, esc = U.esc, MT = P.MailText;
  const root = document.getElementById("app");
  const tsMs = ctx.State.tsMs;
  const fdt = (t) => { const ms = typeof t === "number" ? t : tsMs(t); return ms ? new Date(ms).toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; };
  const fd = (ms) => (ms ? new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—");
  const money = (n) => (typeof n === "number" ? "S/ " + n.toFixed(2) : "—");
  const nv = (x) => (x == null ? "—" : x);
  const ago = (ms) => {
    if (!ms) return "—";
    const m = Math.max(0, Math.round((ctx.acct.nowMs - ms) / 60000));
    if (m < 1) return "ahora mismo"; if (m < 60) return "hace " + m + " min";
    const h = Math.round(m / 60); if (h < 24) return "hace " + h + " h";
    const d = Math.round(h / 24); return "hace " + d + (d === 1 ? " día" : " días");
  };
  const MSTATE = { sent: "✅ Enviado", error: "⚠️ Con error", sending: "⏳ Enviando" };
  const MTYPE = { received: "Solicitud recibida", approved: "Pago aprobado", rejected: "Pago rechazado" };
  const MICON = { received: "📥", approved: "✅", rejected: "❌" };
  const siteUrl = () => location.origin + location.pathname.replace(/\/[^/]*$/, "");
  const fail = (e) => UI.toast("⚠️ " + esc((e && e.message) || "Operación rechazada") + (e && e.code === "permission-denied" ? " (permiso denegado por las reglas)" : ""), "warn");
  const stat = (k, v, sub, cls) => '<div class="stat' + (cls ? " " + cls : "") + '"><span class="k">' + k + '</span><span class="v">' + v + "</span>" + (sub ? '<span class="s">' + sub + "</span>" : "") + "</div>";
  const seg = (items, cur, attr) => '<div class="adm-seg" role="tablist">' + items.map((i) => '<button type="button" class="adm-segbtn" role="tab" ' + attr + '="' + i[0] + '" aria-selected="' + (i[0] === cur) + '">' + i[1] + "</button>").join("") + "</div>";

  /* ---------------- estructura: pestañas + introducción ---------------- */
  const TABS = [
    ["resumen", "🏠", "Inicio", "Lo que necesita tu atención hoy y los números clave."],
    ["pagos", "💳", "Pagos", "Revisa los pagos de los estudiantes: apruébalos para activar su Premium o recházalos escribiendo el motivo."],
    ["usuarios", "👥", "Usuarios", "Mira quién ingresó a la plataforma y gestiona el acceso de una persona."],
    ["correos", "✉️", "Correos", "Avisos que reciben los estudiantes al aprobar o rechazar su pago."],
    ["recs", "💡", "Ideas", "Recomendaciones, sugerencias y correcciones que envían los estudiantes."],
    ["ajustes", "⚙️", "Ajustes", "Datos del sitio, bancos de preguntas y registro de todo lo que se hizo desde este panel."]
  ];
  let tab = "resumen", cfg = JSON.parse(JSON.stringify(ctx.cfg));
  let uSub = "act", aSub = "datos", badges = { pend: null, mailErr: null, recsNew: null };

  root.innerHTML = '<nav class="adm-tabs" role="tablist" aria-label="Secciones del panel">' +
    TABS.map((t) => '<button type="button" class="adm-tab" role="tab" data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '"><span class="ico" aria-hidden="true">' + t[1] + '</span><span class="lbl">' + t[2] + '</span><span class="adm-badge" data-b="' + t[0] + '" hidden></span></button>').join("") +
    '</nav><p class="adm-intro" id="intro"></p><div id="view"></div>';
  const view = root.querySelector("#view"), intro = root.querySelector("#intro");

  function paintBadges() {
    const set = (k, n, warn) => { const b = root.querySelector('[data-b="' + k + '"]'); if (!b) return; b.hidden = !(n > 0); b.textContent = n > 99 ? "99+" : String(n || ""); b.classList.toggle("warn", !!warn); };
    set("pagos", badges.pend); set("correos", badges.mailErr, true); set("recs", badges.recsNew);
  }
  async function refreshBadges() {
    try { badges = await Admin.badges(); } catch (e) { /* los avisos son un extra: si fallan no pasa nada */ }
    paintBadges();
  }
  function go(t) {
    tab = t;
    root.querySelectorAll(".adm-tabs [data-t]").forEach((x) => x.setAttribute("aria-selected", String(x.getAttribute("data-t") === t)));
    show();
    const tb = root.querySelector('.adm-tabs [data-t="' + t + '"]'); if (tb && tb.scrollIntoView) tb.scrollIntoView({ block: "nearest", inline: "center" });
  }
  root.querySelector(".adm-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) go(b.getAttribute("data-t")); });
  function show() {
    const t = TABS.filter((x) => x[0] === tab)[0];
    intro.innerHTML = "<strong>" + t[1] + " " + t[2] + "</strong> · " + esc(t[3]);
    ({ resumen: viewSummary, pagos: viewPayments, usuarios: viewUsers, correos: viewMail, recs: viewRecs, ajustes: viewSettings })[tab]();
  }

  /* ================= 🏠 INICIO ================= */
  async function viewSummary() {
    view.innerHTML = '<p class="hint">Cargando…</p>';
    let s; try { s = await Admin.stats(); } catch (e) { view.innerHTML = ""; return fail(e); }
    badges = { pend: s.pending, mailErr: s.mail.error, recsNew: s.recsNew }; paintBadges();
    const todo = [];
    if (s.pending > 0) todo.push(["pagos", "💳", s.pending + (s.pending === 1 ? " pago por revisar" : " pagos por revisar"), "Los estudiantes esperan tu respuesta.", "Revisar ahora"]);
    if (s.mail.error > 0) todo.push(["correos", "✉️", s.mail.error + (s.mail.error === 1 ? " correo con error" : " correos con error"), "No llegó el aviso a un estudiante.", "Ver correos"]);
    if (s.recsNew > 0) todo.push(["recs", "💡", s.recsNew + (s.recsNew === 1 ? " recomendación nueva" : " recomendaciones nuevas"), "Aún no las has revisado.", "Abrir"]);
    const v = s.visits;
    view.innerHTML =
      '<section class="adm-sec"><h2 class="adm-h">Necesita tu atención</h2>' +
      (todo.length ? '<div class="adm-attn">' + todo.map((t) => '<button type="button" class="adm-attn-card" data-go="' + t[0] + '"><span class="ai" aria-hidden="true">' + t[1] + '</span><span class="at"><strong>' + t[2] + "</strong><small>" + t[3] + '</small></span><span class="ag">' + t[4] + " →</span></button>").join("") + "</div>"
        : '<div class="adm-ok">✅ <strong>Todo al día.</strong> No hay pagos por revisar ni correos con error.</div>') + "</section>" +
      '<section class="adm-sec"><h2 class="adm-h">Personas</h2><div class="adm-stats">' +
        stat("Usuarios registrados", nv(s.users)) + stat("Pruebas gratuitas activas", nv(s.trialsActive)) + stat("Pruebas gratuitas vencidas", nv(s.trialsExpired)) +
        stat("Premium activos", nv(s.premActive), "con acceso vigente") + stat("Premium vencidos", nv(s.premExpired)) + "</div></section>" +
      '<section class="adm-sec"><h2 class="adm-h">Pagos y dinero</h2><div class="adm-stats">' +
        stat("Pagos pendientes", nv(s.pending), "esperando tu revisión", s.pending > 0 ? "hot" : "") + stat("Pagos aprobados", nv(s.approved)) + stat("Solicitudes rechazadas", nv(s.rejected)) +
        stat("Ingresos (pagos aprobados)", s.income == null ? "—" : money(s.income), "Suma real de solicitudes aprobadas") + "</div></section>" +
      '<section class="adm-sec"><h2 class="adm-h">Correos y comunidad</h2><div class="adm-stats">' +
        stat("Correos enviados", nv(s.mail.sent), "automáticos, desde el sistema") + stat("Correos con error", nv(s.mail.error), s.mail.sending ? s.mail.sending + " en curso" : "", s.mail.error > 0 ? "hot" : "") +
        stat("Recomendaciones", nv(s.recs), nv(s.recsNew) + " nuevas sin revisar") + "</div></section>" +
      '<section class="adm-sec panel glass"><h2 class="adm-h">Visitas (últimos 30 días con datos)</h2>' + (v ? '<div class="adm-stats">' +
        stat("Sesiones estimadas", v.visits) + stat("Visitantes únicos (estimación)", v.uniques) + stat("Entradas a «Leer preguntas»", v.reads) + stat("Sesiones con acceso activo", v.authSessions) + "</div>" : '<p class="hint">Sin datos todavía.</p>') +
      '<p class="hint">Son <strong>estimaciones anónimas</strong>: una sesión por pestaña, y un «único» por navegador cada 30 días (si alguien borra datos o cambia de dispositivo se cuenta otra vez). No se guardan IP ni datos personales.</p></section>' +
      '<details class="adm-guide panel glass"><summary>📖 Guía rápida: ¿qué hago cada día?</summary><ol>' +
        "<li>Entra a <strong>💳 Pagos</strong>. Los pendientes aparecen primero.</li>" +
        "<li>Abre tu app de <strong>Yape/Plin</strong> y comprueba que el dinero llegó (monto, código de operación y nombre). Una captura no es prueba.</li>" +
        "<li>Pulsa <strong>Revisar</strong>: si el pago es correcto, <strong>aprueba</strong>; si no, elige o escribe el <strong>motivo</strong> y rechaza.</li>" +
        "<li>Al terminar se abre <strong>«Avisar al estudiante»</strong>: el mensaje ya está redactado, solo pulsa <strong>Abrir en Gmail</strong> y envíalo.</li>" +
        "<li>De vez en cuando mira <strong>💡 Recomendaciones</strong> y <strong>✉️ Correos</strong> (por si alguno falló).</li></ol></details>";
    view.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.getAttribute("data-go"))));
  }

  /* ================= 💳 PAGOS ================= */
  let pFilter = { status: "pending", method: "", from: "", to: "", q: "" };
  const PST = { pending: "⏳ Pendiente", approved: "✅ Aprobado", rejected: "❌ Rechazado" };
  async function viewPayments() {
    const SEGS = [["pending", "⏳ Pendientes" + (badges.pend > 0 ? " (" + badges.pend + ")" : "")], ["approved", "✅ Aprobados"], ["rejected", "❌ Rechazados"], ["all", "Todos"]];
    view.innerHTML = '<div id="pseg"></div>' +
      '<details class="adm-more"' + (pFilter.method || pFilter.from || pFilter.to || pFilter.q ? " open" : "") + "><summary>🔎 Filtrar por método, fecha o persona</summary><div class=\"adm-search\">" +
      '<select id="fMe" aria-label="Método"><option value="">Yape y Plin</option><option value="yape">Yape</option><option value="plin">Plin</option></select>' +
      '<label class="adm-date">Desde <input id="fFr" type="date"></label><label class="adm-date">Hasta <input id="fTo" type="date"></label>' +
      '<input id="fQ" type="search" placeholder="Correo o nombre…" aria-label="Buscar"><button type="button" class="btn btn-primary" id="fGo">Filtrar</button></div></details><div id="plist"><p class="hint">Cargando…</p></div>';
    const g = (id) => view.querySelector(id);
    const drawSeg = () => {
      g("#pseg").innerHTML = seg(SEGS, pFilter.status, "data-st");
      g("#pseg").querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => { pFilter.status = b.getAttribute("data-st"); drawSeg(); run(); }));
    };
    g("#fMe").value = pFilter.method; g("#fFr").value = pFilter.from; g("#fTo").value = pFilter.to; g("#fQ").value = pFilter.q;
    const run = async () => {
      pFilter = { status: pFilter.status, method: g("#fMe").value, from: g("#fFr").value, to: g("#fTo").value, q: g("#fQ").value.trim().toLowerCase() };
      const box = g("#plist"); box.innerHTML = '<p class="hint">Cargando…</p>';
      let pend = [], done = [];
      try {
        if (pFilter.status === "pending" || pFilter.status === "all") pend = (await Admin.pendingRequests()).map((r) => Object.assign(r, { _st: "pending" }));
        if (pFilter.status !== "pending") done = (await Admin.resolvedRequests()).filter((h) => h.status === "approved" || h.status === "rejected").map((h) => Object.assign(h, { _st: h.status }));
      } catch (e) { box.innerHTML = ""; return fail(e); }
      if (pFilter.status === "pending" || pFilter.status === "all") { badges.pend = pend.length; paintBadges(); }
      const fromMs = pFilter.from ? new Date(pFilter.from + "T00:00:00").getTime() : 0, toMs = pFilter.to ? new Date(pFilter.to + "T23:59:59").getTime() : Infinity;
      const list = pend.concat(done.filter((h) => pFilter.status === "all" || h.status === pFilter.status)).filter((r) => {
        if (pFilter.method && r.method !== pFilter.method) return false;
        const ms = tsMs(r.createdAt) || tsMs(r.reviewedAt) || 0; if (ms < fromMs || ms > toMs) return false;
        if (pFilter.q && (String(r.email || "") + " " + String(r.displayName || "") + " " + String(r.payerName || "")).toLowerCase().indexOf(pFilter.q) < 0) return false;
        return true;
      });
      if (!list.length) { box.innerHTML = '<div class="panel glass leer-empty">' + (pFilter.status === "pending" ? "🎉 No hay pagos pendientes. ¡Todo revisado!" : "No hay solicitudes con ese filtro.") + "</div>"; return; }
      const slow = (ctx.cfg.payment.verifyHours || 24) * 3600000;
      box.innerHTML = list.map((r, i) => {
        const created = tsMs(r.createdAt), waiting = r._st === "pending" && created && ctx.acct.nowMs - created > slow;
        const when = r._st === "pending" ? fdt(r.createdAt) + (created ? " · " + ago(created) : "") : "resuelta " + fdt(r.reviewedAt);
        return '<article class="panel glass adm-card adm-pay st-' + r._st + '"><div class="adm-row"><div class="adm-who2"><strong>' + esc(r.displayName || r.email) + '</strong> <span class="adm-pill ' + r._st + '">' + PST[r._st] + "</span><br><small>" + esc(r.email) + "</small></div>" +
          '<div class="adm-amt">' + money(r.amount) + "<small>" + esc(r.planName) + " · " + r.days + " d</small></div></div>" +
          '<dl class="adm-kv"><div><dt>Método</dt><dd>' + (r.method === "plin" ? "Plin" : r.method === "manual" ? "Manual" : "Yape") + "</dd></div><div><dt>Código de operación</dt><dd>" + esc(r.operationCode) + "</dd></div><div><dt>Pagó</dt><dd>" + esc(r.payerName || "—") + "</dd></div><div><dt>" + (r._st === "pending" ? "Enviada" : "Resultado") + "</dt><dd>" + when + (r.hasReceipt ? " · 📎" : "") + "</dd></div></dl>" +
          (waiting ? '<p class="adm-late">⏰ Lleva más de ' + (ctx.cfg.payment.verifyHours || 24) + " h esperando respuesta.</p>" : "") +
          (r.reason ? '<p class="adm-reason"><strong>Motivo:</strong> ' + esc(r.reason) + "</p>" : "") +
          '<div class="btnrow"><button type="button" class="btn ' + (r._st === "pending" ? "btn-primary" : "btn-secondary") + '" data-i="' + i + '">' + (r._st === "pending" ? "Revisar…" : "Ver detalle") + "</button>" +
          (r._st !== "pending" ? '<button type="button" class="btn btn-secondary" data-m="' + i + '">✉️ Avisar por correo</button>' : "") + "</div></article>";
      }).join("");
      box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => { const r = list[+b.getAttribute("data-i")]; r._st === "pending" ? review(r, pend) : detail(r); }));
      box.querySelectorAll("[data-m]").forEach((b) => b.addEventListener("click", () => notifyResolved(list[+b.getAttribute("data-m")])));
    };
    g("#fGo").addEventListener("click", run); g("#fMe").addEventListener("change", run);
    g("#fQ").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
    drawSeg(); run();
  }

  /* datos del correo de un pago YA resuelto (historial) */
  function mailDataFor(h) {
    return h.status === "approved"
      ? { email: h.email, displayName: h.displayName, planName: h.planName, days: h.days, startMs: tsMs(h.periodStartsAt), expiresMs: tsMs(h.expiresAt), renewal: !!h.renewal }
      : { email: h.email, displayName: h.displayName, operationCode: h.operationCode, reason: h.reason };
  }
  const notifyResolved = (h) => notifyStudent(h.status === "approved" ? "approved" : "rejected", mailDataFor(h), h.status + "_" + h.id);

  async function detail(h) {
    const [rc, mails] = await Promise.all([h.hasReceipt ? Admin.getArchivedReceipt(h.id).catch(() => null) : null, Admin.userDetail(h.uid).then((d) => d.mails.filter((m) => String(m.id).indexOf(h.id) >= 0 || m.sourceId === h.id)).catch(() => [])]);
    const v = await UI.dialog({
      title: "Detalle de la solicitud", dismissValue: "x", actions: [{ label: "Cerrar", value: "x", cls: "btn-secondary" }, { label: "✉️ Avisar por correo", value: "mail", cls: "btn-primary" }],
      html: "<p><strong>" + esc(h.displayName || "") + "</strong> · " + esc(h.email) + "</p><p>" + esc(h.planName) + " · " + money(h.amount) + " · " + (h.method === "plin" ? "Plin" : "Yape") + " · operación <strong>" + esc(h.operationCode) + "</strong><br>Pagó: " + esc(h.payerName || "—") + "</p>" +
        "<p>Resultado: <strong>" + (h.status === "approved" ? "Aprobada" : "Rechazada") + "</strong> el " + fdt(h.reviewedAt) + " por " + esc(h.reviewedBy || "") + (h.reason ? "<br>Motivo: " + esc(h.reason) : "") +
        (h.status === "approved" ? "<br>Periodo: " + fd(tsMs(h.periodStartsAt)) + " → <strong>" + fd(tsMs(h.expiresAt)) + "</strong>" + (h.renewal ? " (renovación: se sumó al vencimiento vigente)" : "") : "") + "</p>" +
        (mails.length ? "<p>Correo automático: " + mails.map((m) => esc(MTYPE[m.type] || m.type) + " " + (MSTATE[m.status] || m.status)).join(" · ") + "</p>" : '<p class="hint">Aún no hay correo automático registrado para este pago.</p>') +
        (rc && rc.image ? '<p><img class="adm-rcpt" alt="Comprobante" src="' + rc.image.replace(/"/g, "") + '"></p>' : "")
    });
    if (v === "mail") notifyResolved(h);
  }

  /* ---- revisar un pago pendiente ---- */
  let rjDraft = "";
  async function review(req, all) {
    const [warns, rc] = await Promise.all([Admin.checkRequest(req, all).catch(() => []), Admin.getReceipt(req.uid).catch(() => null)]);
    const html = '<div class="adm-rv"><p><strong>' + esc(req.displayName || "") + "</strong> · " + esc(req.email) + "</p>" +
      '<dl class="adm-kv"><div><dt>Plan</dt><dd>' + esc(req.planName) + " · " + req.days + " días</dd></div><div><dt>Monto</dt><dd>" + money(req.amount) + "</dd></div><div><dt>Método</dt><dd>" + (req.method === "plin" ? "Plin" : "Yape") + "</dd></div>" +
      "<div><dt>Código de operación</dt><dd>" + esc(req.operationCode) + "</dd></div><div><dt>Nombre de quien pagó</dt><dd>" + esc(req.payerName || "—") + "</dd></div><div><dt>Enviada</dt><dd>" + fdt(req.createdAt) + "</dd></div></dl>" +
      (req.note ? '<p class="hint">«' + esc(req.note) + "»</p>" : "") +
      (warns.length ? '<div class="plan-note"><strong>⚠️ Revisa antes de aprobar:</strong><ul class="plain">' + warns.map((w) => "<li>" + esc(w) + "</li>").join("") + "</ul></div>" : '<p class="hint">✔ Sin duplicados ni inconsistencias detectadas.</p>') +
      (rc && rc.image ? '<p><img class="adm-rcpt" alt="Comprobante" src="' + rc.image.replace(/"/g, "") + '"></p>' : '<p class="hint">⚠️ No se pudo cargar el comprobante.</p>') +
      '<p class="hint"><strong>Verifica el dinero en TU app de Yape/Plin</strong> (monto, código de operación y nombre) antes de aprobar. Una captura no es prueba de pago.</p>' +
      '<div class="adm-decide"><h4>Si vas a rechazar, dile por qué</h4>' +
      '<div class="field"><label for="rjPreset">Motivos frecuentes</label><select id="rjPreset"><option value="">Elige uno (o escribe el tuyo abajo)…</option>' + MT.REJECT_REASONS.map((r, i) => '<option value="' + i + '">' + esc(r) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="rjReason">Motivo del rechazo (obligatorio solo si rechazas)</label><input id="rjReason" maxlength="300" placeholder="Ej.: no encontré el pago con ese código de operación" value="' + esc(rjDraft) + '"></div>' +
      '<p class="hint">El estudiante recibirá este texto en el correo.</p></div></div>';
    let getReason = () => "";
    const v = await UI.dialog({
      title: "Revisar pago", html, dismissValue: "x",
      actions: [{ label: "Cancelar", value: "x", cls: "btn-secondary" }, { label: "Rechazar solicitud", value: "no", cls: "btn-danger" }, { label: "Aprobar pago y activar Premium", value: "ok", cls: "btn-primary" }],
      onOpen: (d) => {
        const inp = d.querySelector("#rjReason"), pre = d.querySelector("#rjPreset");
        getReason = () => inp.value;
        pre.addEventListener("change", () => { if (pre.value !== "") { inp.value = MT.REJECT_REASONS[+pre.value]; inp.focus(); } });
      }
    });
    if (v === "ok") {
      rjDraft = "";
      const ex = Admin.computeExpiry(await Admin.getSubscription(req.uid), req.days);
      const ok = await UI.confirm("Confirmar aprobación", "<p>Se activará Premium a <strong>" + esc(req.email) + "</strong> (" + req.days + " días).</p><p>" + (ex.renewal ? "Renovación: se suman al vencimiento actual. " : "") + "Nuevo vencimiento: <strong>" + fd(ex.expiresMs) + "</strong></p><p class=\"hint\">Después podrás avisarle por correo con un clic.</p>", "Sí, aprobar y activar", false);
      if (!ok) return;
      let r; try { r = await Admin.approve(req); } catch (e) { return fail(e); }
      UI.toast("✅ Premium activado hasta el " + fd(r.expiresMs), "ok");
      viewPayments(); refreshBadges();
      notifyStudent("approved", { email: req.email, displayName: req.displayName, planName: req.planName, days: req.days, startMs: r.startMs, expiresMs: r.expiresMs, renewal: r.renewal }, "approved_" + r.hid);
    } else if (v === "no") {
      const reason = getReason(); rjDraft = reason;
      if (!reason.trim()) { UI.toast("Escribe el motivo del rechazo.", "warn"); return review(req, all); }
      const ok = await UI.confirm("Confirmar rechazo", "<p>Se rechazará la solicitud de <strong>" + esc(req.email) + "</strong>.</p><p>Motivo (se enviará al estudiante): <strong>" + esc(reason) + "</strong></p>", "Sí, rechazar", true);
      if (!ok) return;
      let r; try { r = await Admin.reject(req, reason); } catch (e) { return fail(e); }
      rjDraft = "";
      UI.toast("Solicitud rechazada.", "ok");
      viewPayments(); refreshBadges();
      notifyStudent("rejected", { email: req.email, displayName: req.displayName, operationCode: req.operationCode, reason: reason.trim() }, "rejected_" + r.hid);
    }
  }

  /* ---- avisar al estudiante: automático (Cloud Functions) o con un clic desde Gmail ---- */
  function notifyStudent(kind, data, mailKey) {
    const m0 = MT[kind](data, { supportEmail: cfg.payment.contact, siteUrl: siteUrl() });
    const ok = kind === "approved";
    const html = '<div class="adm-mail-state" id="mlState" role="status">⏳ Comprobando si el correo automático ya salió…</div>' +
      '<p class="adm-mail-to">Para: <strong>' + esc(m0.to || "(sin correo)") + "</strong></p>" +
      '<div class="field"><label for="mlSub">Asunto</label><input id="mlSub" value="' + esc(m0.subject) + '"></div>' +
      '<div class="field"><label for="mlBody">Mensaje (puedes editarlo antes de enviar)</label><textarea id="mlBody" rows="10">' + esc(m0.body) + "</textarea></div>" +
      '<div class="adm-mail-actions"><a class="btn btn-primary" id="mlGmail" target="_blank" rel="noopener" href="#">✉️ Abrir en Gmail</a><button type="button" class="btn btn-secondary" id="mlCopy">📋 Copiar</button></div>' +
      '<p class="hint">Gmail se abre con el mensaje ya escrito: solo pulsa <strong>Enviar</strong>. Si el sistema automático ya lo envió, no hace falta.</p>';
    return UI.dialog({
      title: ok ? "✅ Pago aprobado · avisa al estudiante" : "❌ Solicitud rechazada · avisa al estudiante", html, dismissValue: "x",
      actions: [{ label: "Listo, cerrar", value: "x", cls: "btn-secondary" }],
      onOpen: (d) => {
        const $ = (s) => d.querySelector(s);
        const cur = () => ({ to: m0.to, subject: $("#mlSub").value, body: $("#mlBody").value });
        const sync = () => { $("#mlGmail").href = MT.gmailUrl(cur()); };
        sync(); $("#mlSub").addEventListener("input", sync); $("#mlBody").addEventListener("input", sync);
        $("#mlCopy").addEventListener("click", async () => {
          const m = cur();
          try { await navigator.clipboard.writeText("Para: " + m.to + "\nAsunto: " + m.subject + "\n\n" + m.body); UI.toast("📋 Mensaje copiado", "ok"); } catch (e) { UI.toast("No se pudo copiar: selecciona el texto a mano.", "warn"); }
        });
        const state = (cls, txt) => { const el = $("#mlState"); if (el) { el.className = "adm-mail-state " + cls; el.innerHTML = txt; } };
        let tries = 0;
        const poll = async () => {
          if (!d.isConnected) return;
          const st = await Admin.mailStatus(mailKey);
          if (!d.isConnected) return;
          if (st === "sent") return state("ok", "✅ <strong>El sistema ya envió el correo automático.</strong> No necesitas hacer nada más.");
          if (st === "error") return state("bad", "⚠️ El envío automático falló (puedes reintentarlo en ✉️ Correos). <strong>Avisa tú ahora con Gmail.</strong>");
          if (++tries >= 6) return state("info", "ℹ️ El envío automático no respondió (puede estar desactivado). <strong>Envía el aviso tú con Gmail.</strong>");
          state("wait", "⏳ Comprobando si el correo automático ya salió… <small>(si no sale solo, usa Gmail)</small>");
          setTimeout(poll, 2500);
        };
        poll();
      }
    });
  }

  /* ================= 👥 USUARIOS ================= */
  let host = null;
  function viewUsers() {
    view.innerHTML = '<div id="usub"></div><div id="uhost"></div>';
    const drawSeg = () => {
      view.querySelector("#usub").innerHTML = seg([["act", "👁 Quién ingresó"], ["buscar", "🔎 Buscar y gestionar"]], uSub, "data-u");
      view.querySelectorAll("[data-u]").forEach((b) => b.addEventListener("click", () => { uSub = b.getAttribute("data-u"); drawSeg(); draw(); }));
    };
    const draw = () => { host = view.querySelector("#uhost"); uSub === "act" ? viewActivity() : viewUserSearch(); };
    drawSeg(); draw();
  }

  let actLimit = 50;
  async function viewActivity() {
    const h = host;
    h.innerHTML = '<div class="adm-search"><input id="acQ" type="search" placeholder="Filtrar por nombre o correo…" aria-label="Filtrar"><select id="acN" aria-label="Cuántos mostrar">' +
      [50, 100, 200].map((n) => '<option value="' + n + '"' + (n === actLimit ? " selected" : "") + ">Últimos " + n + "</option>").join("") +
      '</select><button type="button" class="btn btn-secondary" id="acRe">🔄 Actualizar</button></div><div id="acBox"><p class="hint">Cargando actividad…</p></div>';
    const box = h.querySelector("#acBox");
    const load = async () => {
      box.innerHTML = '<p class="hint">Cargando actividad…</p>';
      let a; try { a = await Admin.activity(actLimit); } catch (e) { box.innerHTML = ""; return fail(e); }
      const ST = { premium: "💎 Premium", trial: "🎁 Prueba activa", locked: "🔒 Sin acceso", suspended: "⛔ Suspendido" };
      const maxV = Math.max(1, ...a.days.map((d) => d.visits || 0));
      const chart = a.days.length ? '<div class="adm-bars" role="img" aria-label="Visitas por día">' + a.days.map((d) => {
        const hh = Math.max(4, Math.round(((d.visits || 0) / maxV) * 100));
        return '<div class="adm-bar" title="' + esc(d.id) + ": " + (d.visits || 0) + ' sesiones"><span class="n">' + (d.visits || 0) + '</span><span class="b" style="height:' + hh + '%"></span><span class="l">' + esc(String(d.id).slice(5)) + "</span></div>";
      }).join("") + "</div>" : '<p class="hint">Todavía no hay datos de visitas.</p>';
      box.innerHTML = '<div class="adm-stats">' +
        stat("Ingresaron hoy", nv(a.login.today), "usuarios con Google") + stat("Últimos 7 días", nv(a.login.d7), "usuarios activos") + stat("Últimos 30 días", nv(a.login.d30), "usuarios activos") +
        stat("Registros nuevos hoy", nv(a.signup.today)) + stat("Registros en 7 días", nv(a.signup.d7)) + stat("Registros en 30 días", nv(a.signup.d30)) + stat("Total registrados", nv(a.total)) + "</div>" +
        '<section class="panel glass"><h3>Visitas por día (últimos 14 días con datos)</h3>' + chart + '<p class="hint">Cuenta sesiones anónimas, incluidos visitantes que no iniciaron sesión.</p></section>' +
        '<section class="panel glass"><h3>Quiénes ingresaron (más recientes primero)</h3><div id="acList"></div>' +
        '<p class="hint">«Último acceso» se actualiza cuando la persona inicia sesión o abre la plataforma con su cuenta de Google. Los visitantes sin sesión no se pueden identificar (no se guarda su IP ni ningún dato personal).</p></section>';
      const draw = () => {
        const q = h.querySelector("#acQ").value.trim().toLowerCase();
        const list = a.users.filter((u) => !q || (String(u.displayName || "") + " " + String(u.email || "")).toLowerCase().indexOf(q) >= 0);
        const el = box.querySelector("#acList");
        el.innerHTML = list.length ? list.map((u, i) => {
          const photo = /^https:\/\//.test(u.photoURL || "") ? '<img class="adm-ava" alt="" referrerpolicy="no-referrer" src="' + esc(u.photoURL) + '">' : '<span class="adm-ava adm-ava-0" aria-hidden="true">' + esc((u.displayName || u.email || "?").trim().charAt(0).toUpperCase()) + "</span>";
          return '<article class="adm-card adm-urow"><div class="adm-row"><div class="adm-who">' + photo + "<div><strong>" + esc(u.displayName || "(sin nombre)") + '</strong> <span class="chip">' + ST[u._status] + "</span><br><small>" + esc(u.email || "") +
            "</small></div></div><div class=\"adm-when\"><strong>" + ago(tsMs(u.lastLoginAt)) + "</strong><small>" + fdt(u.lastLoginAt) + "<br>registro: " + fd(tsMs(u.createdAt)) + '</small></div><button type="button" class="btn btn-secondary" data-i="' + i + '">Gestionar</button></div></article>';
        }).join("") : '<div class="leer-empty">Sin resultados.</div>';
        el.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => manage(list[+b.getAttribute("data-i")])));
      };
      h.querySelector("#acQ").oninput = draw;
      draw();
    };
    h.querySelector("#acN").addEventListener("change", (e) => { actLimit = +e.target.value; load(); });
    h.querySelector("#acRe").addEventListener("click", load);
    load();
  }

  function viewUserSearch() {
    const h = host;
    h.innerHTML = '<div class="adm-search"><input id="uq" type="search" placeholder="Buscar por correo (o pega un UID)…" aria-label="Buscar usuario"><button type="button" class="btn btn-primary" id="ugo">Buscar</button>' +
      '<select id="ufilter" aria-label="Filtrar"><option value="">Últimos ingresos</option><option value="active">Solo Premium activos</option></select></div><div id="ulist"></div>';
    const run = async () => {
      const box = h.querySelector("#ulist"), f = h.querySelector("#ufilter").value;
      box.innerHTML = '<p class="hint">Buscando…</p>';
      try {
        if (f === "active") {
          const subs = await Admin.activeSubscriptions();
          box.innerHTML = subs.length ? subs.map((s) => '<article class="panel glass adm-card"><div class="adm-row"><div><strong>' + esc(s.id) + "</strong><br><small>vence " + fd(tsMs(s.expiresAt)) + '</small></div><button type="button" class="btn btn-secondary" data-uid="' + esc(s.id) + '">Gestionar</button></div></article>').join("") : '<div class="panel glass leer-empty">Sin Premium activos.</div>';
          box.querySelectorAll("[data-uid]").forEach((b) => b.addEventListener("click", async () => { const r = await Admin.searchUsers(b.getAttribute("data-uid")); manage(r[0] || { id: b.getAttribute("data-uid") }); }));
          return;
        }
        const users = await Admin.searchUsers(h.querySelector("#uq").value);
        box.innerHTML = users.length ? users.map((u, i) => '<article class="panel glass adm-card"><div class="adm-row"><div><strong>' + esc(u.displayName || "(sin nombre)") + "</strong><br><small>" + esc(u.email) + " · último acceso " + fdt(u.lastLoginAt) + '</small></div><button type="button" class="btn btn-secondary" data-i="' + i + '">Gestionar</button></div></article>').join("") : '<div class="panel glass leer-empty">Sin resultados.</div>';
        box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => manage(users[+b.getAttribute("data-i")])));
      } catch (e) { box.innerHTML = ""; fail(e); }
    };
    h.querySelector("#ugo").addEventListener("click", run);
    h.querySelector("#uq").addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });
    h.querySelector("#ufilter").addEventListener("change", run);
    run();
  }

  async function manage(u) {
    const uid = u.id, target = { uid, email: u.email || "" };
    const d = await Admin.userDetail(uid).catch((e) => { fail(e); return { sub: null, trial: null, req: null, hist: [], mails: [], recs: [] }; });
    const sub = d.sub, exp = sub ? tsMs(sub.expiresAt) : null, nowMs = ctx.acct.nowMs;
    const trialStart = d.trial ? tsMs(d.trial.startedAt) : null, trialEnd = trialStart ? trialStart + 48 * 3600000 : null;
    const acc = P.Access.compute({ signedIn: true, sub: sub ? { status: sub.status, expiresAt: exp } : null, trialStartedAt: trialStart, hasPending: !!d.req, nowMs, trialHours: 48 });
    const stt = P.Access.STATES[acc.status] || "";
    const errMails = d.mails.filter((m) => m.status === "error");
    const html = "<p><strong>" + esc(u.displayName || "") + "</strong><br>" + esc(u.email || "") + '<br><small>' + esc(uid) + "</small></p>" +
      "<p>Estado de acceso: <strong>" + esc(stt) + "</strong><br>Prueba: " + (trialStart ? fdt(trialStart) + " → " + fdt(trialEnd) : "no iniciada") +
      "<br>Premium: " + (exp ? "vence " + fd(exp) + (sub.status === "suspended" ? " (SUSPENDIDO)" : "") : "—") + (sub && sub.reason ? "<br><small>Motivo: " + esc(sub.reason) + "</small>" : "") + "</p>" +
      (d.req ? "<p>⏳ Solicitud pendiente: " + esc(d.req.operationCode) + " · " + fdt(d.req.createdAt) + "</p>" : "") +
      (errMails.length ? '<p class="plan-note">⚠️ Correos con error: ' + errMails.map((m) => esc(MTYPE[m.type] || m.type)).join(", ") + " (reintenta en la sección Correos)</p>" : "") +
      '<div class="field"><label for="mgDays">Activar / renovar manualmente (días)</label><input id="mgDays" type="number" min="1" max="400" value="90"></div>' +
      '<div class="field"><label for="mgReason">Motivo (para suspender)</label><input id="mgReason" maxlength="300"></div>' +
      (d.hist.length ? '<h3 class="acc-h">Historial de pagos</h3><ul class="plain">' + d.hist.slice(0, 8).map((h) => "<li>" + fdt(h.reviewedAt) + " · " + esc(h.planName || "") + " · " + esc(h.status) + (h.operationCode ? " · " + esc(h.operationCode) : "") + "</li>").join("") + "</ul>" : "");
    let getF = () => ({});
    const v = await UI.dialog({
      title: "Gestionar usuario", html, dismissValue: "x",
      actions: [{ label: "Cerrar", value: "x", cls: "btn-secondary" }, { label: sub && sub.status === "suspended" ? "Reactivar" : "Suspender", value: "sus", cls: "btn-danger" }, { label: "Activar / renovar", value: "grant", cls: "btn-primary" }],
      onOpen: (dlg) => { getF = () => ({ days: dlg.querySelector("#mgDays").value, reason: dlg.querySelector("#mgReason").value }); }
    });
    const f = getF();
    try {
      if (v === "grant") {
        const ex = Admin.computeExpiry(sub, +f.days);
        if (!(await UI.confirm("Confirmar activación", "<p>Se darán <strong>" + (+f.days) + " días</strong> a <strong>" + esc(u.email || uid) + "</strong>.</p><p>Nuevo vencimiento: <strong>" + fd(ex.expiresMs) + "</strong></p>", "Sí, activar", false))) return;
        await Admin.manualGrant(target, +f.days); UI.toast("✅ Activada hasta " + fd(ex.expiresMs), "ok");
      } else if (v === "sus") {
        if (sub && sub.status === "suspended") { await Admin.reactivate(target); UI.toast("✅ Acceso reactivado", "ok"); }
        else {
          if (!(await UI.confirm("Confirmar suspensión", "<p>Se suspenderá el acceso de <strong>" + esc(u.email || uid) + "</strong> de inmediato.</p>", "Sí, suspender", true))) return;
          await Admin.suspend(target, f.reason); UI.toast("Acceso suspendido", "ok");
        }
      } else return;
    } catch (e) { return fail(e); }
    viewUsers();
  }

  /* ================= ✉️ CORREOS ================= */
  let mFilter = "all";
  async function viewMail() {
    view.innerHTML = '<p class="hint">Cargando…</p>';
    let list; try { list = await Admin.mailLog(); } catch (e) { view.innerHTML = ""; return fail(e); }
    badges.mailErr = list.filter((m) => m.status === "error").length; paintBadges();
    const draw = () => {
      const shown = list.filter((m) => mFilter === "all" || m.status === mFilter);
      const n = (s) => list.filter((m) => m.status === s).length;
      view.innerHTML = '<section class="panel glass adm-how"><h2>¿Cómo se avisa al estudiante?</h2><ul class="plain">' +
        "<li><strong>Automático:</strong> si las Cloud Functions están activas, el sistema envía el correo solo desde <strong>" + esc(ctx.cfg.payment.mailFrom) + "</strong> y aquí aparece su estado.</li>" +
        "<li><strong>Con un clic:</strong> al aprobar o rechazar un pago se abre «Avisar al estudiante» con el mensaje listo (incluye el motivo del rechazo). También puedes hacerlo después desde <em>Pagos → Aprobados / Rechazados → ✉️ Avisar por correo</em>.</li></ul></section>" +
        seg([["all", "Todos (" + list.length + ")"], ["error", "⚠️ Con error (" + n("error") + ")"], ["sent", "✅ Enviados (" + n("sent") + ")"]], mFilter, "data-mf") +
        (shown.length ? '<div class="adm-mails">' + shown.map((m, i) => '<article class="panel glass adm-card adm-mail st-' + esc(m.status) + '"><div class="adm-row"><div><strong>' + (MICON[m.type] || "✉️") + " " + esc(MTYPE[m.type] || m.type) + "</strong> <span class=\"adm-pill " + esc(m.status) + '">' + (MSTATE[m.status] || esc(m.status)) + "</span><br><small>Para: " + esc(m.to) + "</small></div>" +
          '<div class="adm-when"><strong>' + fdt(m.createdAt) + "</strong><small>" + (m.sentAt ? "enviado " + fdt(m.sentAt) + " · " : "") + "intentos " + (m.attempts || 0) + "</small></div></div>" +
          (m.lastError ? '<p class="adm-reason"><small>' + esc(m.lastError) + "</small></p>" : "") +
          (m.status === "error" ? '<div class="btnrow"><button type="button" class="btn btn-secondary" data-r="' + i + '">🔁 Reintentar envío</button></div>' : "") + "</article>").join("") + "</div>"
          : '<div class="panel glass leer-empty">' + (list.length ? "No hay correos con ese estado." : "Aún no hay correos automáticos registrados. Si todavía no desplegaste las Cloud Functions es normal: usa «Avisar por correo» desde Pagos.") + "</div>");
      view.querySelectorAll("[data-mf]").forEach((b) => b.addEventListener("click", () => { mFilter = b.getAttribute("data-mf"); draw(); }));
      view.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", async () => {
        b.disabled = true;
        try { const r = await Admin.retryMail(shown[+b.getAttribute("data-r")].id); UI.toast(r && r.status === "sent" ? "✅ Correo enviado" : "ℹ️ Resultado: " + esc((r && r.status) || "sin cambios"), "ok"); }
        catch (e) { UI.toast("⚠️ No se pudo reintentar: " + esc((e && e.message) || "error"), "warn"); }
        viewMail();
      }));
    };
    draw();
  }

  /* ================= 💡 RECOMENDACIONES ================= */
  async function viewRecs() {
    view.innerHTML = '<div class="adm-search"><select id="rcS" aria-label="Estado"><option value="">Todos los estados</option>' + Object.keys(Recs.STATUS).map((k) => '<option value="' + k + '">' + Recs.STATUS[k] + "</option>").join("") + "</select>" +
      '<select id="rcC" aria-label="Categoría"><option value="">Todas las categorías</option>' + Object.keys(Recs.CATEGORIES).map((k) => '<option value="' + k + '">' + esc(Recs.CATEGORIES[k]) + "</option>").join("") + '</select>' +
      '<input id="rcFr" type="date" aria-label="Desde"><input id="rcQ" type="search" placeholder="Buscar…" aria-label="Buscar"></div><div id="rlist"><p class="hint">Cargando…</p></div>';
    let all; try { all = await Admin.recommendations(); } catch (e) { view.querySelector("#rlist").innerHTML = ""; return fail(e); }
    badges.recsNew = all.filter((r) => r.status === "received").length; paintBadges();
    const draw = () => {
      const s = view.querySelector("#rcS").value, c = view.querySelector("#rcC").value, fr = view.querySelector("#rcFr").value ? new Date(view.querySelector("#rcFr").value + "T00:00:00").getTime() : 0, q = view.querySelector("#rcQ").value.trim().toLowerCase();
      const list = all.filter((r) => (!s || r.status === s) && (!c || r.category === c) && (tsMs(r.createdAt) || 0) >= fr && (!q || (r.title + " " + r.description + " " + r.email).toLowerCase().indexOf(q) >= 0));
      const box = view.querySelector("#rlist");
      box.innerHTML = list.length ? list.map((r, i) => '<article class="panel glass adm-card"><div class="adm-row"><div><strong>' + esc(r.title) + '</strong> <span class="chip">' + esc(Recs.STATUS[r.status] || r.status) + "</span><br><small>" + esc(Recs.CATEGORIES[r.category] || r.category) + " · " + esc(r.email) + " · " + fdt(r.createdAt) + '</small></div><button type="button" class="btn btn-secondary" data-i="' + i + '">Abrir</button></div></article>').join("") : '<div class="panel glass leer-empty">Sin recomendaciones.</div>';
      box.querySelectorAll("[data-i]").forEach((b) => b.addEventListener("click", () => openRec(list[+b.getAttribute("data-i")])));
    };
    ["#rcS", "#rcC", "#rcFr"].forEach((id) => view.querySelector(id).addEventListener("change", draw)); view.querySelector("#rcQ").addEventListener("input", draw);
    draw();
  }
  async function openRec(r) {
    const hist = (r._notes.history || []).map((h) => "<li>" + fdt(h.at) + " · " + esc(Recs.STATUS[h.from] || h.from) + " → <strong>" + esc(Recs.STATUS[h.to] || h.to) + "</strong></li>").join("");
    let getF = () => ({});
    const v = await UI.dialog({
      title: "Recomendación", dismissValue: "x", actions: [{ label: "Cerrar", value: "x", cls: "btn-secondary" }, { label: "Guardar", value: "ok", cls: "btn-primary" }],
      html: "<p><strong>" + esc(r.title) + "</strong><br><small>" + esc(Recs.CATEGORIES[r.category] || r.category) + (r.area ? " · " + esc(r.area) : "") + " · " + esc(r.email) + " · " + fdt(r.createdAt) + "</small></p><p style=\"white-space:pre-wrap\">" + esc(r.description) + "</p>" +
        '<div class="field"><label for="rcSt">Estado (lo ve el estudiante)</label><select id="rcSt">' + Object.keys(Recs.STATUS).map((k) => '<option value="' + k + '"' + (k === r.status ? " selected" : "") + ">" + Recs.STATUS[k] + "</option>").join("") + "</select></div>" +
        '<div class="field"><label for="rcN">Notas privadas (el estudiante NUNCA las ve)</label><textarea id="rcN" rows="3" maxlength="2000">' + esc(r._notes.notes || "") + "</textarea></div>" + (hist ? '<h3 class="acc-h">Historial de cambios</h3><ul class="plain">' + hist + "</ul>" : ""),
      onOpen: (d) => { getF = () => ({ st: d.querySelector("#rcSt").value, n: d.querySelector("#rcN").value }); }
    });
    if (v !== "ok") return;
    const f = getF();
    try { await Admin.updateRecommendation(r, f.st, f.n); UI.toast("✅ Guardado", "ok"); viewRecs(); refreshBadges(); } catch (e) { fail(e); }
  }

  /* ================= ⚙️ AJUSTES ================= */
  function viewSettings() {
    view.innerHTML = '<div id="asub"></div><div id="ahost"></div>';
    const drawSeg = () => {
      view.querySelector("#asub").innerHTML = seg([["datos", "🏷 Datos del sitio"], ["bancos", "📦 Bancos de preguntas"], ["log", "🧾 Registro de cambios"]], aSub, "data-a");
      view.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", () => { aSub = b.getAttribute("data-a"); drawSeg(); draw(); }));
    };
    const draw = () => { host = view.querySelector("#ahost"); ({ datos: viewConfig, bancos: viewBanks, log: viewLog })[aSub](); };
    drawSeg(); draw();
  }

  function viewConfig() {
    const h = host, p = cfg.payment, pl = cfg.plan;
    const f = (id, label, val, extra) => '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val == null ? "" : val) + '" ' + (extra || "") + "></div>";
    h.innerHTML = '<section class="panel glass"><h2>Lo que puedes cambiar aquí</h2>' +
      f("cfHolder", "Titular de las cuentas", p.holder) + f("cfContact", "Correo de soporte visible (también aparece en los correos)", p.contact) + f("cfHours", "Horas de revisión que se muestran al estudiante", p.verifyHours, 'type="number" min="1" max="168"') +
      f("cfDev", "Dispositivos simultáneos por cuenta con acceso", (cfg.devices || {}).max || 2, 'type="number" min="1" max="5"') +
      '<div class="btnrow"><button type="button" class="btn btn-primary" id="cfSave">💾 Guardar cambios</button></div></section>' +
      '<section class="panel glass adm-ro"><h2>Solo lectura <small>(se cambia en el código para que nadie pueda alterarlo)</small></h2>' +
      "<h3>Plan único</h3><p><strong>" + esc(pl.name) + "</strong> · S/ " + pl.price.toFixed(2) + " · " + pl.days + ' días · renovación manual.<br><small>Precio y duración: <code>firestore.rules</code> y <code>site-config.js</code>.</small></p>' +
      "<h3>Cobro</h3><p>Yape: <strong>" + esc(p.yape.number) + "</strong> · Plin: <strong>" + esc(p.plin.number) + "</strong><br><small>QR: <code>" + esc(p.yape.qrImage) + "</code> y <code>" + esc(p.plin.qrImage) + "</code>. Se cambian en <code>site-config.js</code> / <code>assets/img</code>.</small></p>" +
      "<h3>Remitente de los correos</h3><p><strong>" + esc(p.mailFrom) + "</strong><br><small>Se configura en <code>functions/.env</code> (ver guía).</small></p></section>";
    h.querySelector("#cfSave").addEventListener("click", async () => {
      const g = (id) => h.querySelector("#" + id).value;
      const next = JSON.parse(JSON.stringify(cfg));
      next.payment.holder = g("cfHolder").trim(); next.payment.contact = g("cfContact").trim();
      next.payment.verifyHours = Math.max(1, Math.min(168, Math.floor(+g("cfHours") || 24)));
      next.devices = { max: Math.max(1, Math.min(5, Math.floor(+g("cfDev") || 2))) };
      try { await Admin.saveConfig(next); cfg = next; UI.toast("✅ Configuración guardada", "ok"); } catch (e) { fail(e); }
    });
  }

  function viewBanks() {
    const h = host;
    h.innerHTML = '<section class="panel glass"><h2>Importar bancos de preguntas</h2>' +
      "<p>Sube el archivo <code>bancos.json</code> (carpeta <code>banco_privado_NO_SUBIR</code>). Cada banco se guarda en Firestore (colección <code>bank</code>), que es de <strong>lectura pública</strong> para la sección «Leer preguntas y respuestas».</p>" +
      '<input type="file" id="bkFile" accept="application/json,.json"><div class="btnrow"><button type="button" class="btn btn-primary" id="bkGo" disabled>⬆️ Importar</button></div><ul class="plain" id="bkLog"></ul></section>';
    let json = null;
    const go = h.querySelector("#bkGo"), log = h.querySelector("#bkLog");
    h.querySelector("#bkFile").addEventListener("change", async (e) => {
      json = null; go.disabled = true; log.innerHTML = "";
      const f = e.target.files[0]; if (!f) return;
      try { json = JSON.parse(await f.text()); const keys = Object.keys(json.bancos || {}); log.innerHTML = "<li>" + keys.length + " bancos encontrados: " + esc(keys.join(", ")) + "</li>"; go.disabled = !keys.length; }
      catch (err) { log.innerHTML = "<li>Archivo no válido.</li>"; }
    });
    go.addEventListener("click", async () => {
      go.disabled = true;
      try { await Admin.importBanks(json, (k, n) => { log.insertAdjacentHTML("beforeend", "<li>✅ " + esc(k) + ": " + n + " preguntas</li>"); }); UI.toast("✅ Bancos importados", "ok"); }
      catch (err) { fail(err); go.disabled = false; }
    });
  }

  async function viewLog() {
    const h = host;
    h.innerHTML = '<p class="hint">Cargando…</p>';
    try {
      const list = await Admin.recentLog();
      const names = { approve: "✅ Aprobó un pago", reject: "❌ Rechazó un pago", manual_grant: "🎁 Activación manual", suspend: "⛔ Suspendió", reactivate: "♻️ Reactivó", import_banks: "📦 Importó bancos", recommendation: "💡 Recomendación", retry_mail: "🔁 Reintentó un correo" };
      h.innerHTML = list.length ? '<section class="panel glass"><p class="hint">Aquí queda anotado todo lo que se hizo desde este panel (no se puede borrar ni editar).</p><ul class="plain adm-log">' + list.map((l) => {
        const d = l.details || {}, extra = [d.reason ? "Motivo: " + d.reason : "", d.operationCode ? "Operación: " + d.operationCode : "", d.days ? d.days + " días" : ""].filter(Boolean).join(" · ");
        return "<li><strong>" + esc(names[l.action] || l.action) + "</strong> · " + esc(l.targetEmail || "") + "<br><small>" + fdt(l.at) + " · admin " + esc((l.by || "").slice(0, 8)) + "…" + (extra ? " · " + esc(extra) : "") + "</small>" +
          '<details class="adm-raw"><summary>detalle técnico</summary><small>' + esc(JSON.stringify(d)) + "</small></details></li>";
      }).join("") + "</ul></section>" : '<div class="panel glass leer-empty">Sin movimientos.</div>';
    } catch (e) { h.innerHTML = ""; fail(e); }
  }

  show();
  refreshBadges();
}
