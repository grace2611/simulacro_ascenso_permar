/*
  Cloud Functions de Simulacro Ascenso PERMAR (correos transaccionales). Requiere plan Blaze de Firebase.
  La web funciona SIN estas funciones (pagos, aprobación, acceso); lo único que dependen de ellas son los correos.

  · onPaymentRequest  → al crearse paymentRequests/{uid}   → correo «solicitud recibida».
  · onPaymentResolved → al crearse paymentHistory/{id}     → correo «aprobación» (solo si la suscripción YA está activa) o «rechazo».
  · retryMail         → callable; verifica EN EL SERVIDOR que quien llama sea administradora (documento admins/{uid}) y reintenta un correo con error.

  Credenciales: el remitente es webpagepermar@gmail.com con una «contraseña de aplicación» de Google guardada como SECRETO
  (firebase functions:secrets:set GMAIL_APP_PASSWORD). Nunca va en el código ni en GitHub.
*/
"use strict";
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const { sendOnce } = require("./lib/mail");

admin.initializeApp();
const db = admin.firestore();

const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");
const MAIL_FROM = defineString("MAIL_FROM", { default: "webpagepermar@gmail.com" });
const SUPPORT_EMAIL = defineString("SUPPORT_EMAIL", { default: "webpagepermar@gmail.com" });
const SITE_URL = defineString("SITE_URL", { default: "" });
const VERIFY_HOURS = defineString("VERIFY_HOURS", { default: "24" });

const REGION = "us-central1";
const ms = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : null);
const serverTs = () => admin.firestore.FieldValue.serverTimestamp();

function transport() {
  return nodemailer.createTransport({ service: "gmail", auth: { user: MAIL_FROM.value(), pass: GMAIL_APP_PASSWORD.value() } });
}
function opts() {
  return { from: MAIL_FROM.value(), serverTs, ctx: { supportEmail: SUPPORT_EMAIL.value(), siteUrl: SITE_URL.value(), verifyHours: +VERIFY_HOURS.value() || 24 } };
}

exports.onPaymentRequest = onDocumentCreated({ document: "paymentRequests/{uid}", region: REGION, secrets: [GMAIL_APP_PASSWORD] }, async (event) => {
  const d = event.data && event.data.data();
  if (!d) return;
  const createdMs = ms(d.createdAt) || Date.now();
  await sendOnce(db, transport(), {
    key: "received_" + event.params.uid + "_" + createdMs, type: "received", to: d.email, uid: d.uid, sourceId: event.params.uid + "_" + createdMs,
    payload: { displayName: d.displayName || "", planName: d.planName, amount: d.amount, method: d.method, operationCode: d.operationCode, createdMs }
  }, opts());
});

exports.onPaymentResolved = onDocumentCreated({ document: "paymentHistory/{id}", region: REGION, secrets: [GMAIL_APP_PASSWORD] }, async (event) => {
  const d = event.data && event.data.data();
  if (!d || (d.status !== "approved" && d.status !== "rejected")) return;     // las activaciones manuales no envían correo
  const id = event.params.id;
  let payload;
  if (d.status === "approved") {
    // El correo de aprobación SOLO sale si la suscripción ya quedó activa con este pago.
    const sub = await db.collection("subscriptions").doc(d.uid).get();
    const s = sub.exists ? sub.data() : null;
    if (!s || s.status !== "active" || s.lastPaymentId !== id) {
      await db.collection("mailLog").doc("approved_" + id).set({ type: "approved", to: d.email, uid: d.uid, sourceId: id, status: "error", attempts: 0, createdAt: serverTs(), lastError: "La suscripción aún no figura activa con este pago; reintenta desde el panel." }, { merge: true });
      return;
    }
    payload = { displayName: d.displayName || "", planName: d.planName, days: d.days, startMs: ms(d.periodStartsAt), expiresMs: ms(d.expiresAt), renewal: !!d.renewal };
  } else {
    payload = { displayName: d.displayName || "", operationCode: d.operationCode, reason: d.reason };
  }
  await sendOnce(db, transport(), { key: d.status + "_" + id, type: d.status, to: d.email, uid: d.uid, sourceId: id, payload }, opts());
});

exports.retryMail = onCall({ region: REGION, secrets: [GMAIL_APP_PASSWORD] }, async (req) => {
  const a = req.auth;
  if (!a) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const isGoogle = a.token && a.token.firebase && a.token.firebase.sign_in_provider === "google.com";
  const adm = await db.collection("admins").doc(a.uid).get();
  if (!isGoogle || a.token.email_verified !== true || !adm.exists) throw new HttpsError("permission-denied", "Solo la administración puede reintentar correos.");
  const logId = req.data && req.data.logId;
  if (typeof logId !== "string" || !/^[A-Za-z0-9_-]{3,200}$/.test(logId)) throw new HttpsError("invalid-argument", "Identificador no válido.");
  const snap = await db.collection("mailLog").doc(logId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Ese correo no existe.");
  const m = snap.data();
  if (m.status !== "error") return { status: m.status, skipped: true };
  if (m.type === "approved") {
    const sub = await db.collection("subscriptions").doc(m.uid).get();
    if (!sub.exists || sub.data().status !== "active" || sub.data().lastPaymentId !== m.sourceId) throw new HttpsError("failed-precondition", "La suscripción de este pago no está activa; no se envía la aprobación.");
    if (!m.payload) { // el disparador original falló antes de armar el contenido: se reconstruye desde el historial
      const h = (await db.collection("paymentHistory").doc(m.sourceId).get()).data();
      m.payload = { displayName: h.displayName || "", planName: h.planName, days: h.days, startMs: ms(h.periodStartsAt), expiresMs: ms(h.expiresAt), renewal: !!h.renewal };
    }
  }
  const r = await sendOnce(db, transport(), { key: logId, type: m.type, to: m.to, uid: m.uid, sourceId: m.sourceId, payload: m.payload }, opts());
  await db.collection("adminLog").add({ action: "retry_mail", targetUid: m.uid || "", targetEmail: m.to || "", details: { mailId: logId, result: r.status }, by: a.uid, at: serverTs() });
  return { status: r.status };
});
