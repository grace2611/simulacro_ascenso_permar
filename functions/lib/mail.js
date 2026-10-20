/*
  Envío idempotente y con estado. Sin dependencias de Firebase: recibe `db` (Firestore Admin) y `transport` (nodemailer) inyectados.
  · mailLog/{key}: una fila por correo lógico (tipo + solicitud). Estados: sending → sent | error.
  · Si ya está "sent", NO se vuelve a enviar (los reintentos y los reenvíos del trigger no duplican correos).
  · Si está "sending" desde hace menos de 2 minutos, otro proceso lo está enviando: se omite.
  · Un error de correo NUNCA toca la suscripción: este módulo no escribe nada fuera de mailLog.
  · Los mensajes de error se recortan y no incluyen credenciales.
*/
"use strict";
const { BUILD } = require("./templates");
const STALE_MS = 2 * 60 * 1000;

function safeError(e) {
  let m = String((e && (e.message || e.code)) || "error desconocido");
  m = m.replace(/pass(word)?=\S+/gi, "pass=***").replace(/[A-Za-z0-9._-]{30,}/g, "***");
  return m.slice(0, 300);
}

/* job = { key, type, to, uid, sourceId, payload }.  opts = { from, ctx, nowMs, serverTs } */
async function sendOnce(db, transport, job, opts) {
  const ref = db.collection("mailLog").doc(job.key);
  const now = opts.nowMs ? opts.nowMs() : Date.now();
  const claim = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const cur = s.exists ? s.data() : null;
    if (cur && cur.status === "sent") return { go: false, status: "sent" };
    if (cur && cur.status === "sending" && now - (cur.lockedAt || 0) < STALE_MS) return { go: false, status: "sending" };
    const base = { type: job.type, to: job.to, uid: job.uid || "", sourceId: job.sourceId || "", payload: job.payload, status: "sending", lockedAt: now, attempts: ((cur && cur.attempts) || 0) + 1, lastError: "" };
    if (!cur) base.createdAt = opts.serverTs ? opts.serverTs() : now;
    tx.set(ref, base, { merge: true });
    return { go: true };
  });
  if (!claim.go) return { status: claim.status, skipped: true };
  try {
    if (!job.to) throw new Error("La solicitud no tiene correo del destinatario.");
    const tpl = BUILD[job.type](job.payload, opts.ctx);
    await transport.sendMail({ from: `"Simulacro PERMAR" <${opts.from}>`, to: job.to, subject: tpl.subject, html: tpl.html, text: tpl.text });
    await ref.set({ status: "sent", sentAt: opts.serverTs ? opts.serverTs() : now, lastError: "" }, { merge: true });
    return { status: "sent" };
  } catch (e) {
    await ref.set({ status: "error", lastError: safeError(e), failedAt: opts.serverTs ? opts.serverTs() : now }, { merge: true });
    return { status: "error", error: safeError(e) };
  }
}

module.exports = { sendOnce, safeError };
