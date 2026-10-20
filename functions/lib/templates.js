/* Plantillas de los tres correos. Funciones puras (se prueban sin Firebase). Todo dato del usuario se escapa. */
"use strict";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (n) => "S/ " + Number(n).toFixed(2);
const METHOD = { yape: "Yape", plin: "Plin" };
const fmtDate = (ms) => new Date(ms).toLocaleString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDay = (ms) => new Date(ms).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "long", year: "numeric" });

function layout(title, body, ctx) {
  const base = ctx.siteUrl ? String(ctx.siteUrl).replace(/\/$/, "") : "";
  const logo = base ? `<img src="${esc(base)}/assets/img/logo.png" width="56" height="56" alt="Simulacro PERMAR" style="display:block;margin:0 0 12px">` : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:12px;padding:24px">
${logo}<h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${body}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
<p style="font-size:12px;color:#6b7280;margin:0">Simulacro Ascenso PERMAR · Soporte: ${esc(ctx.supportEmail)}${ctx.siteUrl ? ` · <a href="${esc(ctx.siteUrl)}">${esc(ctx.siteUrl)}</a>` : ""}</p>
</div></div></body></html>`;
}
const row = (k, v) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`;

/* d = datos de la solicitud/historial. ctx = { supportEmail, siteUrl, verifyHours } */
function received(d, ctx) {
  const subject = "Recibimos tu solicitud de pago · PERMAR Premium";
  const rows = row("Plan", d.planName || "PERMAR Premium — 90 días") + row("Precio", money(d.amount)) + row("Método declarado", METHOD[d.method] || d.method) +
    row("Código de operación", d.operationCode) + row("Fecha de envío", fmtDate(d.createdMs)) + row("Estado", "Pendiente de revisión");
  const html = layout("Recibimos tu solicitud", `<p>Hola ${esc(d.displayName || "")},</p><p>Tu solicitud de pago y tu comprobante se guardaron correctamente.</p><table style="font-size:14px">${rows}</table>
<p>Revisaremos el comprobante y los datos de la operación en un plazo de <strong>hasta ${esc(ctx.verifyHours || 24)} horas</strong>. Te enviaremos otro correo cuando la solicitud haya sido revisada.</p>
<p><strong>Todavía no tienes Premium activado:</strong> se activará únicamente si el pago es verificado y aprobado.</p>`, ctx);
  const text = `Hola ${d.displayName || ""},\n\nRecibimos tu solicitud de pago.\nPlan: ${d.planName}\nPrecio: ${money(d.amount)}\nMétodo declarado: ${METHOD[d.method] || d.method}\nCódigo de operación: ${d.operationCode}\nFecha de envío: ${fmtDate(d.createdMs)}\nEstado: pendiente de revisión\n\nLa revisaremos en hasta ${ctx.verifyHours || 24} horas y te avisaremos por correo. Todavía no tienes Premium activado: se activará únicamente si el pago es verificado y aprobado.\nSoporte: ${ctx.supportEmail}`;
  return { subject, html, text };
}

function approved(d, ctx) {
  const subject = "Pago verificado: tu PERMAR Premium está activo";
  const rows = row("Plan", d.planName || "PERMAR Premium — 90 días") + row("Duración", (d.days || 90) + " días") + row("Inicio del periodo", fmtDay(d.startMs)) + row("Vence el", fmtDate(d.expiresMs));
  const html = layout("¡Tu Premium está activo!", `<p>Hola ${esc(d.displayName || "")},</p><p>Verificamos tu pago y <strong>activamos tu PERMAR Premium</strong>.</p><table style="font-size:14px">${rows}</table>
${d.renewal ? "<p>Como renovaste antes de que venciera, los días nuevos se sumaron a los que te quedaban.</p>" : ""}
${ctx.siteUrl ? `<p><a href="${esc(ctx.siteUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Entrar a la plataforma</a></p>` : ""}`, ctx);
  const text = `Hola ${d.displayName || ""},\n\nVerificamos tu pago y activamos tu PERMAR Premium.\nDuración: ${d.days || 90} días\nInicio del periodo: ${fmtDay(d.startMs)}\nVence el: ${fmtDate(d.expiresMs)}\n${ctx.siteUrl ? "Acceso: " + ctx.siteUrl + "\n" : ""}Soporte: ${ctx.supportEmail}`;
  return { subject, html, text };
}

function rejected(d, ctx) {
  const subject = "Tu solicitud de pago no fue aprobada · PERMAR";
  const pay = ctx.siteUrl ? ctx.siteUrl.replace(/\/$/, "") + "/planes.html" : "";
  const html = layout("Tu solicitud no fue aprobada", `<p>Hola ${esc(d.displayName || "")},</p><p>Revisamos tu solicitud (operación <strong>${esc(d.operationCode)}</strong>) y <strong>no pudo ser aprobada</strong>.</p>
<div style="margin:14px 0;padding:12px 14px;background:#fee2e2;border-left:4px solid #dc2626;border-radius:8px"><strong>Motivo:</strong> ${esc(d.reason)}</div><p>Puedes corregir los datos y enviar una nueva solicitud con el comprobante correcto${pay ? `: <a href="${esc(pay)}">${esc(pay)}</a>` : ""}. Si crees que es un error, escribe a ${esc(ctx.supportEmail)} con tu código de operación.</p>`, ctx);
  const text = `Hola ${d.displayName || ""},\n\nTu solicitud (operación ${d.operationCode}) no pudo ser aprobada.\nMotivo: ${d.reason}\n\nPuedes corregir los datos y enviar una nueva solicitud${pay ? ": " + pay : ""}.\nSoporte: ${ctx.supportEmail}`;
  return { subject, html, text };
}

const BUILD = { received, approved, rejected };
module.exports = { BUILD, esc, money };
