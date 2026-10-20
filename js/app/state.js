/*
  Estado de acceso: configuración pública, prueba gratuita, suscripción, solicitud de pago pendiente y rol de administrador.
  Todo se lee de Firestore con la identidad del propio usuario; las reglas de seguridad deciden qué puede leer cada quien.
*/
import { db, F } from "./fb.js";
import * as Session from "./session.js";

const S = window.PERMAR_SITE;
const CFG_KEY = "permar_cfg_cache";
const CFG_TTL = 5 * 60 * 1000;
const tsMs = (t) => (t && typeof t.toMillis === "function") ? t.toMillis() : (t instanceof Date ? t.getTime() : null);
export { tsMs };

/* Configuración efectiva. Plan, precio, números de Yape/Plin y QR salen SIEMPRE de site-config.js (código).
   Desde Firestore (config/public) solo se aceptan: titular, contacto y horas de verificación. */
export function defaultConfig() {
  return JSON.parse(JSON.stringify({ plan: S.plan, payment: S.payment, trial: S.trial, devices: S.devices }));
}
export function mergeRemote(def, remote) {
  const cfg = JSON.parse(JSON.stringify(def));
  const p = remote && remote.payment;
  if (p) {
    if (typeof p.holder === "string" && p.holder.trim()) cfg.payment.holder = p.holder.trim().slice(0, 100);
    if (typeof p.contact === "string" && p.contact.trim()) cfg.payment.contact = p.contact.trim().slice(0, 120);
    if (Number.isFinite(+p.verifyHours) && +p.verifyHours >= 1 && +p.verifyHours <= 168) cfg.payment.verifyHours = Math.floor(+p.verifyHours);
  }
  if (remote && remote.devices && Number.isFinite(+remote.devices.max)) cfg.devices.max = Math.max(1, Math.min(5, Math.floor(+remote.devices.max)));
  return cfg;
}

export async function loadConfig(force) {
  const def = defaultConfig();
  if (!force) {
    try {
      const c = JSON.parse(sessionStorage.getItem(CFG_KEY) || "null");
      if (c && Date.now() - c.t < CFG_TTL) return { cfg: mergeRemote(def, c.v), remote: !!c.remote };
    } catch (e) { /* nada */ }
  }
  let remote = null;
  try {
    const snap = await F.getDoc(F.doc(db, "config", "public"));
    if (snap.exists()) remote = snap.data();
  } catch (e) { console.warn("No se pudo leer config/public:", e && e.code); }
  try { sessionStorage.setItem(CFG_KEY, JSON.stringify({ t: Date.now(), v: remote || {}, remote: !!remote })); } catch (e) { /* nada */ }
  return { cfg: mergeRemote(def, remote || {}), remote: !!remote };
}
export function clearConfigCache() { try { sessionStorage.removeItem(CFG_KEY); } catch (e) { /* nada */ } }

/* Carga la cuenta y calcula el nivel de acceso con la hora del SERVIDOR. */
export async function loadAccount(user, cfg) {
  const A = window.PERMAR.Access;
  const base = { level: "visitor", status: "visitor", sub: null, request: null, isAdmin: false, trialStartedAt: null, trialEndsAt: null, premiumEndsAt: null, nowMs: Date.now(), clockFromServer: false };
  if (!user) return base;

  const clk = await Session.serverNow(user);
  const trialStartedAt = await Session.ensureTrial(user);
  const [subSnap, admSnap, reqSnap] = await Promise.all([
    F.getDoc(F.doc(db, "subscriptions", user.uid)).catch(() => null),
    F.getDoc(F.doc(db, "admins", user.uid)).catch(() => null),
    F.getDoc(F.doc(db, "paymentRequests", user.uid)).catch(() => null)
  ]);
  const sub = subSnap && subSnap.exists() ? subSnap.data() : null;
  const request = reqSnap && reqSnap.exists() ? Object.assign({ id: reqSnap.id }, reqSnap.data()) : null;
  const c = A.compute({
    signedIn: true,
    sub: sub ? { status: sub.status, expiresAt: tsMs(sub.expiresAt) } : null,
    trialStartedAt, hasPending: !!request, nowMs: clk.nowMs, trialHours: (cfg && cfg.trial && cfg.trial.hours) || 48
  });
  return Object.assign(base, c, { sub, request, isAdmin: !!(admSnap && admSnap.exists()), trialStartedAt, nowMs: clk.nowMs, clockFromServer: clk.fromServer, trialError: trialStartedAt ? null : Session.getTrialError() });
}
