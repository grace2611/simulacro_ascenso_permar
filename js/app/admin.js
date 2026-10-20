/*
  Operaciones de la administradora. La autorización REAL está en firestore.rules (isAdmin → documento admins/{uid}); este código
  solo llama a Firestore con la sesión de la administradora, así que un estudiante que lo ejecute en su consola recibe "permission-denied".

  Aprobar / rechazar se hacen en UNA transacción de Firestore:
    · se vuelve a leer la solicitud (debe seguir pendiente) → si ya se resolvió, se aborta (no se duplican días);
    · el id del historial es determinista (uid + fecha de la solicitud) → una solicitud solo puede resolverse una vez;
    · las reglas exigen que la solicitud exista antes y se consuma en el mismo lote.
  El correo NO forma parte de la transacción: lo envía Cloud Functions después. Si falla, la suscripción aprobada NO se revierte.
*/
import { db, auth, app, F } from "./fb.js";
import { tsMs, clearConfigCache } from "./state.js";

const B = window.PERMAR.Billing;
const col = (n) => F.collection(db, n);
const rows = (snap) => { const o = []; snap.forEach((d) => o.push(Object.assign({ id: d.id }, d.data()))); return o; };
const me = () => auth.currentUser.uid;
let OFFSET = 0;                                   // diferencia reloj local ↔ servidor (se fija desde boot)
export function setClockOffset(ms) { OFFSET = ms || 0; }
const now = () => Date.now() + OFFSET;

function addLog(tx, action, target, details) {
  tx.set(F.doc(col("adminLog")), { action, targetUid: target.uid || "", targetEmail: target.email || "", details: details || {}, by: me(), at: F.serverTimestamp() });
}

/* ---------- resumen ---------- */
async function count(q) { try { return (await F.getCountFromServer(q)).data().count; } catch (e) { return null; } }

export async function stats() {
  const t = now();
  const [users, trialsTotal, trialsActive, pending, approved, rejected, recs, recsNew, mailSent, mailErr, mailPend, subs] = await Promise.all([
    count(col("users")), count(col("trials")),
    count(F.query(col("trials"), F.where("startedAt", ">", F.Timestamp.fromMillis(t - 48 * 3600000)))),
    count(col("paymentRequests")),
    count(F.query(col("paymentHistory"), F.where("status", "==", "approved"))),
    count(F.query(col("paymentHistory"), F.where("status", "==", "rejected"))),
    count(col("recommendations")), count(F.query(col("recommendations"), F.where("status", "==", "received"))),
    count(F.query(col("mailLog"), F.where("status", "==", "sent"))),
    count(F.query(col("mailLog"), F.where("status", "==", "error"))),
    count(F.query(col("mailLog"), F.where("status", "==", "sending"))),
    F.getDocs(F.query(col("subscriptions"), F.where("status", "==", "active"))).then(rows).catch(() => [])
  ]);
  const premActive = subs.filter((s) => tsMs(s.expiresAt) > t).length;
  let income = null;
  try {
    const r = await F.getAggregateFromServer(F.query(col("paymentHistory"), F.where("status", "==", "approved")), { total: F.sum("amount") });
    income = r.data().total;
  } catch (e) {
    try { income = rows(await F.getDocs(F.query(col("paymentHistory"), F.where("status", "==", "approved")))).reduce((a, h) => a + (+h.amount || 0), 0); } catch (e2) { income = null; }
  }
  let visits = { visits: 0, uniques: 0, reads: 0, authSessions: 0, days: 0 };
  try {
    const d = rows(await F.getDocs(F.query(col("analytics"), F.orderBy(F.documentId(), "desc"), F.limit(30))));
    d.forEach((x) => { visits.visits += x.visits || 0; visits.uniques += x.uniques || 0; visits.reads += x.reads || 0; visits.authSessions += x.authSessions || 0; });
    visits.days = d.length;
  } catch (e) { visits = null; }
  return {
    users, trialsTotal, trialsActive, trialsExpired: trialsTotal == null || trialsActive == null ? null : Math.max(0, trialsTotal - trialsActive),
    premActive, premExpired: subs.length - premActive, pending, approved, rejected, income, recs, recsNew, mail: { sent: mailSent, error: mailErr, sending: mailPend }, visits
  };
}

/* Contadores ligeros para las pestañas del panel (pagos por revisar, correos con error, recomendaciones nuevas). */
export async function badges() {
  const [pend, mailErr, recsNew] = await Promise.all([
    count(col("paymentRequests")),
    count(F.query(col("mailLog"), F.where("status", "==", "error"))),
    count(F.query(col("recommendations"), F.where("status", "==", "received")))
  ]);
  return { pend, mailErr, recsNew };
}

/* ---------- actividad: quién ingresa (solo lectura; usa users/*, subscriptions/*, trials/* y analytics/*, todo ya restringido a la administradora) ---------- */
export async function activity(limit) {
  const t = now(), DAY = 86400000, H48 = 48 * 3600000;
  const sod = new Date(t); sod.setHours(0, 0, 0, 0);
  const ts = (ms) => F.Timestamp.fromMillis(ms);
  const since = (field, ms) => count(F.query(col("users"), F.where(field, ">=", ts(ms))));
  const [total, inToday, in7, in30, newToday, new7, new30, recent, subs, trials, days] = await Promise.all([
    count(col("users")),
    since("lastLoginAt", sod.getTime()), since("lastLoginAt", t - 7 * DAY), since("lastLoginAt", t - 30 * DAY),
    since("createdAt", sod.getTime()), since("createdAt", t - 7 * DAY), since("createdAt", t - 30 * DAY),
    F.getDocs(F.query(col("users"), F.orderBy("lastLoginAt", "desc"), F.limit(limit || 50))).then(rows),
    F.getDocs(col("subscriptions")).then(rows).catch(() => []),
    F.getDocs(F.query(col("trials"), F.where("startedAt", ">", ts(t - H48)))).then(rows).catch(() => []),
    F.getDocs(F.query(col("analytics"), F.orderBy(F.documentId(), "desc"), F.limit(14))).then(rows).catch(() => [])
  ]);
  const subMap = {}; subs.forEach((x) => { subMap[x.id] = x; });
  const trialSet = {}; trials.forEach((x) => { trialSet[x.id] = true; });
  const users = recent.map((u) => {
    const sb = subMap[u.id];
    let status = "locked";
    if (sb && sb.status === "suspended") status = "suspended";
    else if (sb && sb.status === "active" && tsMs(sb.expiresAt) > t) status = "premium";
    else if (trialSet[u.id]) status = "trial";
    return Object.assign({}, u, { _status: status });
  });
  return { total, login: { today: inToday, d7: in7, d30: in30 }, signup: { today: newToday, d7: new7, d30: new30 }, users, days: days.reverse() };
}

/* ---------- pagos ---------- */
export async function pendingRequests() {
  return rows(await F.getDocs(col("paymentRequests"))).sort((a, b) => (tsMs(a.createdAt) || 0) - (tsMs(b.createdAt) || 0));
}
export async function resolvedRequests() {
  return rows(await F.getDocs(F.query(col("paymentHistory"), F.orderBy("reviewedAt", "desc"), F.limit(300))));
}
export async function getReceipt(uid) { const s = await F.getDoc(F.doc(db, "receipts", uid)); return s.exists() ? s.data() : null; }
export async function getArchivedReceipt(id) { const s = await F.getDoc(F.doc(db, "receiptsArchive", id)); return s.exists() ? s.data() : null; }
export async function getSubscription(uid) { const s = await F.getDoc(F.doc(db, "subscriptions", uid)); return s.exists() ? s.data() : null; }

/* Revisión previa: duplicados e inconsistencias. */
export async function checkRequest(req, allPending) {
  const warn = [];
  const sub = await getSubscription(req.uid);
  if (sub && sub.status === "active" && tsMs(sub.expiresAt) > now()) warn.push("Este usuario ya tiene Premium ACTIVO (vence el " + new Date(tsMs(sub.expiresAt)).toLocaleDateString("es-PE") + "). Aprobar sumará 90 días a ese vencimiento (renovación).");
  if (req.amount !== 5 || req.days !== 90) warn.push("La solicitud no es del plan vigente (S/ 5.00 · 90 días): revisa antes de aprobar.");
  (allPending || []).filter((r) => r.id !== req.id && r.operationCode && r.operationCode.toLowerCase() === String(req.operationCode).toLowerCase())
    .forEach((r) => warn.push("El mismo código de operación aparece en otra solicitud pendiente de " + (r.email || r.uid) + "."));
  try {
    const h = rows(await F.getDocs(F.query(col("paymentHistory"), F.where("operationCode", "==", req.operationCode))));
    h.forEach((x) => warn.push("El código de operación ya se usó antes (" + (x.status === "approved" ? "aprobado" : x.status) + ", " + (x.email || x.uid) + ")."));
  } catch (e) { /* nada */ }
  return warn;
}

export const computeExpiry = (sub, days) => B.computeExpiry(sub ? { status: sub.status, expiresAt: tsMs(sub.expiresAt) } : null, days, now());

function histBase(req, extra) {
  return Object.assign({
    uid: req.uid, email: req.email || "", displayName: req.displayName || "", planId: req.planId, planName: req.planName, days: req.days, amount: req.amount, currency: req.currency,
    method: req.method, operationCode: req.operationCode, payerName: req.payerName || "", note: req.note || "", createdAt: req.createdAt || null,
    reviewedAt: F.serverTimestamp(), reviewedBy: me()
  }, extra);
}

/* APROBAR: transacción idempotente. Devuelve { startMs, expiresMs, renewal }. */
export async function approve(req) {
  const rRef = F.doc(db, "paymentRequests", req.uid), sRef = F.doc(db, "subscriptions", req.uid), rcRef = F.doc(db, "receipts", req.uid);
  const hid = B.historyId(req.uid, tsMs(req.createdAt));
  const hRef = F.doc(db, "paymentHistory", hid);
  return F.runTransaction(db, async (tx) => {
    const cur = await tx.get(rRef);
    if (!cur.exists()) throw new Error("Esta solicitud ya fue resuelta o cancelada. Actualiza la lista.");
    const r = cur.data();
    if (!B.requestIsOpen(r)) throw new Error("La solicitud ya no está pendiente.");
    if (r.operationCode !== req.operationCode || tsMs(r.createdAt) !== tsMs(req.createdAt)) throw new Error("La solicitud cambió mientras la revisabas. Actualiza y vuelve a revisarla.");
    if ((await tx.get(hRef)).exists()) throw new Error("Esta solicitud ya fue aprobada o rechazada antes (no se duplican días).");
    const sSnap = await tx.get(sRef);
    const sub = sSnap.exists() ? sSnap.data() : null;
    const rcSnap = r.hasReceipt ? await tx.get(rcRef) : null;
    const ex = B.computeExpiry(sub ? { status: sub.status, expiresAt: tsMs(sub.expiresAt) } : null, r.days, now());
    const keepStart = sub && sub.status === "active" && sub.startsAt && ex.renewal;
    tx.set(sRef, {
      status: "active", planId: r.planId, expiresAt: F.Timestamp.fromMillis(ex.expiresMs),
      startsAt: keepStart ? sub.startsAt : F.serverTimestamp(), updatedAt: F.serverTimestamp(), updatedBy: me(), lastPaymentId: hid
    });
    tx.set(hRef, histBase(r, { status: "approved", reason: "", periodStartsAt: F.Timestamp.fromMillis(ex.startMs), expiresAt: F.Timestamp.fromMillis(ex.expiresMs), renewal: ex.renewal, hasReceipt: !!(rcSnap && rcSnap.exists()) }));
    if (rcSnap && rcSnap.exists()) tx.set(F.doc(db, "receiptsArchive", hid), Object.assign({ uid: r.uid, archivedAt: F.serverTimestamp() }, rcSnap.data()));
    tx.delete(rRef);
    if (rcSnap && rcSnap.exists()) tx.delete(rcRef);
    addLog(tx, "approve", r, { requestId: hid, planId: r.planId, days: r.days, amount: r.amount, operationCode: r.operationCode, previousStatus: sub ? sub.status : "none", newStatus: "active", expiresAt: ex.expiresMs, renewal: ex.renewal, result: "ok" });
    return Object.assign({ hid }, ex);
  });
}

/* RECHAZAR: el motivo es obligatorio y lo escribe la administradora (no se inventa). */
export async function reject(req, reason) {
  reason = String(reason || "").trim().slice(0, 300);
  if (!reason) throw new Error("Escribe el motivo del rechazo.");
  const rRef = F.doc(db, "paymentRequests", req.uid), sRef = F.doc(db, "subscriptions", req.uid), rcRef = F.doc(db, "receipts", req.uid);
  const hid = B.historyId(req.uid, tsMs(req.createdAt));
  const hRef = F.doc(db, "paymentHistory", hid);
  return F.runTransaction(db, async (tx) => {
    const cur = await tx.get(rRef);
    if (!cur.exists()) throw new Error("Esta solicitud ya fue resuelta o cancelada. Actualiza la lista.");
    const r = cur.data();
    if (!B.requestIsOpen(r)) throw new Error("La solicitud ya no está pendiente.");
    if ((await tx.get(hRef)).exists()) throw new Error("Esta solicitud ya fue resuelta antes.");
    const sSnap = await tx.get(sRef);
    const sub = sSnap.exists() ? sSnap.data() : null;
    const rcSnap = r.hasReceipt ? await tx.get(rcRef) : null;
    tx.set(hRef, histBase(r, { status: "rejected", reason, hasReceipt: !!(rcSnap && rcSnap.exists()) }));
    if (rcSnap && rcSnap.exists()) tx.set(F.doc(db, "receiptsArchive", hid), Object.assign({ uid: r.uid, archivedAt: F.serverTimestamp() }, rcSnap.data()));
    tx.delete(rRef);
    if (rcSnap && rcSnap.exists()) tx.delete(rcRef);
    if (!sub || sub.status !== "active") tx.set(sRef, { status: "rejected", reason, updatedAt: F.serverTimestamp(), updatedBy: me() }, { merge: true });
    addLog(tx, "reject", r, { requestId: hid, reason, operationCode: r.operationCode, previousStatus: sub ? sub.status : "none", newStatus: sub && sub.status === "active" ? "active" : "rejected", result: "ok" });
    return { hid };
  });
}

/* Activación manual sin solicitud (p. ej. pago confirmado por otro medio). Queda en el historial y en la auditoría. */
export async function manualGrant(user, days) {
  days = Math.floor(+days);
  if (!(days >= 1 && days <= 400)) throw new Error("La duración debe estar entre 1 y 400 días.");
  const sRef = F.doc(db, "subscriptions", user.uid), hid = "manual_" + user.uid + "_" + now();
  return F.runTransaction(db, async (tx) => {
    const sSnap = await tx.get(sRef); const sub = sSnap.exists() ? sSnap.data() : null;
    const ex = B.computeExpiry(sub ? { status: sub.status, expiresAt: tsMs(sub.expiresAt) } : null, days, now());
    tx.set(sRef, { status: "active", planId: "manual", expiresAt: F.Timestamp.fromMillis(ex.expiresMs), startsAt: (sub && sub.status === "active" && sub.startsAt && ex.renewal) ? sub.startsAt : F.serverTimestamp(), updatedAt: F.serverTimestamp(), updatedBy: me(), lastPaymentId: hid });
    tx.set(F.doc(db, "paymentHistory", hid), { uid: user.uid, email: user.email || "", planId: "manual", planName: "Activación manual", days, amount: 0, currency: "PEN", method: "manual", operationCode: "", status: "manual", reason: "", createdAt: null, reviewedAt: F.serverTimestamp(), reviewedBy: me() });
    addLog(tx, "manual_grant", user, { days, previousStatus: sub ? sub.status : "none", newStatus: "active", expiresAt: ex.expiresMs, result: "ok" });
    return ex.expiresMs;
  });
}
export async function suspend(user, reason) {
  const batch = F.writeBatch(db);
  batch.set(F.doc(db, "subscriptions", user.uid), { status: "suspended", reason: String(reason || "").slice(0, 300), updatedAt: F.serverTimestamp(), updatedBy: me() }, { merge: true });
  batch.set(F.doc(col("adminLog")), { action: "suspend", targetUid: user.uid, targetEmail: user.email || "", details: { reason: String(reason || ""), newStatus: "suspended", result: "ok" }, by: me(), at: F.serverTimestamp() });
  await batch.commit();
}
export async function reactivate(user) {
  const sub = await getSubscription(user.uid);
  const exp = sub ? tsMs(sub.expiresAt) : null;
  if (!exp || exp <= now()) throw new Error("El periodo ya venció: usa «Activar / renovar» para darle nuevos días.");
  const batch = F.writeBatch(db);
  batch.set(F.doc(db, "subscriptions", user.uid), { status: "active", reason: "", updatedAt: F.serverTimestamp(), updatedBy: me() }, { merge: true });
  batch.set(F.doc(col("adminLog")), { action: "reactivate", targetUid: user.uid, targetEmail: user.email || "", details: { previousStatus: "suspended", newStatus: "active", expiresAt: exp, result: "ok" }, by: me(), at: F.serverTimestamp() });
  await batch.commit();
}

/* ---------- usuarios ---------- */
export async function searchUsers(term) {
  term = String(term || "").trim();
  let q;
  if (!term) q = F.query(col("users"), F.orderBy("lastLoginAt", "desc"), F.limit(30));
  else if (term.length >= 20 && term.indexOf("@") < 0) { const s = await F.getDoc(F.doc(db, "users", term)); return s.exists() ? [Object.assign({ id: s.id }, s.data())] : []; }
  else { const t = term.toLowerCase(); q = F.query(col("users"), F.orderBy("email"), F.startAt(t), F.endAt(t + "\uf8ff"), F.limit(30)); }
  return rows(await F.getDocs(q));
}
export async function activeSubscriptions() { return rows(await F.getDocs(F.query(col("subscriptions"), F.where("status", "==", "active")))); }
export async function userDetail(uid) {
  const [sub, trial, req, hist, mails, recs] = await Promise.all([
    getSubscription(uid),
    F.getDoc(F.doc(db, "trials", uid)).then((s) => (s.exists() ? s.data() : null)).catch(() => null),
    F.getDoc(F.doc(db, "paymentRequests", uid)).then((s) => (s.exists() ? s.data() : null)).catch(() => null),
    F.getDocs(F.query(col("paymentHistory"), F.where("uid", "==", uid))).then(rows).catch(() => []),
    F.getDocs(F.query(col("mailLog"), F.where("uid", "==", uid))).then(rows).catch(() => []),
    F.getDocs(F.query(col("recommendations"), F.where("uid", "==", uid))).then(rows).catch(() => [])
  ]);
  hist.sort((a, b) => (tsMs(b.reviewedAt) || 0) - (tsMs(a.reviewedAt) || 0));
  return { sub, trial, req, hist, mails, recs };
}
export async function recentLog() { return rows(await F.getDocs(F.query(col("adminLog"), F.orderBy("at", "desc"), F.limit(100)))); }

/* ---------- correos ---------- */
export async function mailLog(status) {
  const q = status ? F.query(col("mailLog"), F.where("status", "==", status), F.limit(100)) : F.query(col("mailLog"), F.orderBy("createdAt", "desc"), F.limit(100));
  return rows(await F.getDocs(q)).sort((a, b) => (tsMs(b.createdAt) || 0) - (tsMs(a.createdAt) || 0));
}
/* Estado del correo AUTOMÁTICO de una solicitud resuelta ("approved_<id>" / "rejected_<id>"): "sent" | "sending" | "error" | null (aún no existe). */
export async function mailStatus(key) {
  try { const s = await F.getDoc(F.doc(db, "mailLog", key)); return s.exists() ? s.data().status || null : null; } catch (e) { return null; }
}
/* Reintento seguro: lo ejecuta la Cloud Function (verifica en el servidor que quien llama sea administradora y que el envío esté en error). */
export async function retryMail(logId) {
  const base = "https://www.gstatic.com/firebasejs/" + window.PERMAR_SITE.sdkVersion + "/";
  const fm = await import(base + "firebase-functions.js");
  const call = fm.httpsCallable(fm.getFunctions(app, "us-central1"), "retryMail");
  return (await call({ logId })).data;
}

/* ---------- recomendaciones ---------- */
export async function recommendations() {
  const [list, notes] = await Promise.all([F.getDocs(col("recommendations")).then(rows), F.getDocs(col("recommendationNotes")).then(rows)]);
  const nm = {}; notes.forEach((n) => { nm[n.id] = n; });
  return list.map((r) => Object.assign(r, { _notes: nm[r.id] || { notes: "", history: [] } })).sort((a, b) => (tsMs(b.createdAt) || 0) - (tsMs(a.createdAt) || 0));
}
export async function updateRecommendation(rec, status, notes) {
  const batch = F.writeBatch(db);
  const prev = rec._notes || { notes: "", history: [] };
  const history = (prev.history || []).slice();
  if (status !== rec.status) history.push({ at: now(), by: me(), from: rec.status, to: status });
  if (status !== rec.status) batch.update(F.doc(db, "recommendations", rec.id), { status, updatedAt: F.serverTimestamp(), updatedBy: me() });
  batch.set(F.doc(db, "recommendationNotes", rec.id), { notes: String(notes || "").slice(0, 2000), history: history.slice(-50) });
  batch.set(F.doc(col("adminLog")), { action: "recommendation", targetUid: rec.uid, targetEmail: rec.email || "", details: { id: rec.id, previousStatus: rec.status, newStatus: status, result: "ok" }, by: me(), at: F.serverTimestamp() });
  await batch.commit();
}

/* ---------- configuración (solo titular, contacto y horas de revisión; el plan y los números vienen del código) ---------- */
export async function saveConfig(cfg) {
  await F.setDoc(F.doc(db, "config", "public"), { payment: { holder: cfg.payment.holder, contact: cfg.payment.contact, verifyHours: cfg.payment.verifyHours }, devices: cfg.devices, updatedAt: F.serverTimestamp(), updatedBy: me() });
  clearConfigCache();
}

/* ---------- importar bancos (archivo bancos.json) ---------- */
export async function importBanks(json, onProgress) {
  if (!json || typeof json !== "object" || !json.bancos) throw new Error("El archivo no es un bancos.json válido.");
  const keys = Object.keys(json.bancos);
  let n = 0;
  for (const k of keys) {
    const items = json.bancos[k];
    if (!/^[a-z]+$/.test(k) || !Array.isArray(items) || !items.length) throw new Error("Banco inválido: " + k);
    items.forEach((q) => { if (!q.id || !Array.isArray(q.opciones) || q.opciones.length !== 4 || !(q.correcta >= 0 && q.correcta < 4)) throw new Error("Pregunta inválida en " + k + ": " + (q.id || "?")); });
    await F.setDoc(F.doc(db, "bank", k), { items, count: items.length, updatedAt: F.serverTimestamp() });
    n++; if (onProgress) onProgress(k, items.length, n, keys.length);
  }
  const batch = F.writeBatch(db);
  batch.set(F.doc(col("adminLog")), { action: "import_banks", targetUid: "", targetEmail: "", details: { banks: keys, result: "ok" }, by: me(), at: F.serverTimestamp() });
  await batch.commit();
  return keys;
}
