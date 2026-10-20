/*
  Sincronización del progreso PREMIUM entre dispositivos.

  - El progreso vive localmente en "permar_v2_u_<uid>" (una clave por usuario; nunca se mezclan cuentas) y se copia a Firestore
    dividido en documentos pequeños:  users/{uid}/progress/{core | daily | attempts | sessions | exams | q_<categoría> | meta}.
  - Solo se suben las partes que cambiaron (ahorra escrituras) y con un pequeño retraso (varias respuestas = una escritura).
  - "meta" guarda la revisión; al abrir cada página se hace UNA lectura (meta). Solo si cambió se descargan las partes.
  - Si hubo cambios sin conexión, se COMBINAN con los de la nube (merge.js): nunca se pierde una pregunta ni un historial.
*/
import { db, F } from "./fb.js";

const P = window.PERMAR;
const Store = P.Store, M = P.Merge;
const DEBOUNCE = 2500, RETRY = 20000;

let ctx = null;

export const userKey = (uid) => "permar_v2_u_" + uid;
const metaKey = (uid) => "permar_sync_" + uid;

function getDeviceId() {
  try {
    let d = localStorage.getItem("permar_device_id");
    if (!d) { d = "d" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); localStorage.setItem("permar_device_id", d); }
    return d;
  } catch (e) { return "d-temp-" + Math.random().toString(36).slice(2, 8); }
}
export { getDeviceId };

function readMeta(uid) { try { return JSON.parse(localStorage.getItem(metaKey(uid)) || "null") || { rev: 0, by: "", dirty: false }; } catch (e) { return { rev: 0, by: "", dirty: false }; } }
function writeMeta(uid, m) { try { localStorage.setItem(metaKey(uid), JSON.stringify(m)); } catch (e) { /* nada */ } }
const progCol = (uid) => F.collection(db, "users", uid, "progress");
const metaRef = (uid) => F.doc(db, "users", uid, "progress", "meta");

function notify(msg, kind) { if (P.UI && P.UI.toast) P.UI.toast(msg, kind || "warn"); else console.warn(msg); }

function jsonParts(state) {
  const parts = M.split(state), out = {};
  Object.keys(parts).forEach((k) => { out[k] = JSON.stringify(parts[k]); });
  return out;
}

async function fetchRemote(uid) {
  const snap = await F.getDocs(progCol(uid));
  const parts = {}, raw = {};
  snap.forEach((d) => {
    if (d.id === "meta") return;
    const j = d.data().json;
    if (typeof j !== "string") return;
    try { parts[d.id] = JSON.parse(j); raw[d.id] = j; } catch (e) { /* parte dañada: se ignora */ }
  });
  return { state: Store.sanitize(M.join(parts)), raw };
}

export async function start(uid) {
  const deviceId = getDeviceId();
  Store.useKey(userKey(uid), null);
  let localHas = false;
  try { localHas = localStorage.getItem(userKey(uid)) !== null; } catch (e) { /* nada */ }
  const local = Store.get();
  const meta = readMeta(uid);
  ctx = { uid, deviceId, meta, synced: {}, version: 0, timer: null, flushing: false, again: false, stopped: false, offline: false, warned: false };

  let remoteMeta = null;
  try {
    const s = await F.getDoc(metaRef(uid));
    remoteMeta = s.exists() ? s.data() : null;
  } catch (e) {
    ctx.offline = true;
    notify("📡 Sin conexión con la nube: sigues estudiando y se sincronizará después.", "warn");
  }

  if (!ctx.offline) {
    if (!remoteMeta) {
      ctx.synced = {};                                  // nube vacía: se subirá todo lo local al primer guardado
      if (localHas && Object.keys(local.q).length + local.attempts.length + local.exams.length + local.sessions.length > 0) { ctx.meta.dirty = true; }
    } else if (meta.rev !== remoteMeta.rev || meta.by !== remoteMeta.by) {
      const remote = await fetchRemote(uid);
      ctx.synced = remote.raw;
      if (meta.dirty && localHas) Store.replaceState(M.merge(remote.state, local), { silent: true });
      else Store.replaceState(remote.state, { silent: true });
      ctx.meta = { rev: remoteMeta.rev || 0, by: remoteMeta.by || "", dirty: !!(meta.dirty && localHas) };
    } else {
      ctx.synced = jsonParts(local);                    // local y nube coinciden
      if (meta.dirty) ctx.meta.dirty = true;
    }
    writeMeta(uid, ctx.meta);
  }

  Store.onSave = onSave;
  if (ctx.meta.dirty) schedule(500);
  window.addEventListener("pagehide", () => { if (ctx && ctx.meta.dirty) flush(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && ctx && ctx.meta.dirty) flush(); });
  return { offline: ctx.offline, cloudEmpty: !ctx.offline && !remoteMeta, localHas };
}

function onSave() {
  if (!ctx || ctx.stopped) return;
  ctx.version++;
  ctx.meta.dirty = true;
  writeMeta(ctx.uid, ctx.meta);
  schedule(DEBOUNCE);
}
function schedule(ms) {
  if (!ctx || ctx.stopped) return;
  if (ctx.timer) clearTimeout(ctx.timer);
  ctx.timer = setTimeout(() => { flush(); }, ms);
}

export async function flush() {
  if (!ctx || ctx.stopped) return true;
  if (ctx.timer) { clearTimeout(ctx.timer); ctx.timer = null; }
  if (ctx.flushing) { ctx.again = true; return false; }
  ctx.flushing = true;
  const v = ctx.version;
  try {
    const cur = jsonParts(Store.get());
    const changed = Object.keys(cur).filter((p) => cur[p] !== ctx.synced[p]);
    const removed = Object.keys(ctx.synced).filter((p) => p.indexOf("q_") === 0 && !(p in cur));
    if (changed.length || removed.length) {
      const rev = (ctx.meta.rev || 0) + 1;
      const batch = F.writeBatch(db);
      changed.forEach((p) => batch.set(F.doc(db, "users", ctx.uid, "progress", p), { json: cur[p], rev, updatedAt: F.serverTimestamp() }));
      removed.forEach((p) => batch.delete(F.doc(db, "users", ctx.uid, "progress", p)));
      batch.set(metaRef(ctx.uid), { rev, by: ctx.deviceId, updatedAt: F.serverTimestamp() });
      await batch.commit();
      changed.forEach((p) => { ctx.synced[p] = cur[p]; });
      removed.forEach((p) => { delete ctx.synced[p]; });
      ctx.meta.rev = rev; ctx.meta.by = ctx.deviceId;
    }
    ctx.meta.dirty = ctx.version !== v;
    writeMeta(ctx.uid, ctx.meta);
    ctx.warned = false; ctx.offline = false;
    ctx.flushing = false;
    if (ctx.again || ctx.meta.dirty) { ctx.again = false; schedule(DEBOUNCE); }
    return true;
  } catch (e) {
    ctx.flushing = false;
    if (e && e.code === "permission-denied") {
      ctx.stopped = true;
      notify("⚠️ Tu suscripción ya no permite guardar en la nube. Renueva tu acceso para seguir sincronizando.", "warn");
      return false;
    }
    if (!ctx.warned) { ctx.warned = true; notify("⚠️ No se pudo sincronizar con la nube. Tus datos están a salvo en este dispositivo y se reintentará.", "warn"); }
    schedule(RETRY);
    return false;
  }
}

/* Antes de cerrar sesión: sube lo pendiente y borra la copia local (dispositivo compartido = datos privados). */
export async function endSession() {
  if (!ctx) return { ok: true };
  const uid = ctx.uid;
  const ok = await flush();
  ctx.stopped = true; Store.onSave = null;
  if (!ok && ctx.meta.dirty) return { ok: false };
  try {
    Object.keys(localStorage).filter((k) => k === metaKey(uid) || k.indexOf(userKey(uid)) === 0).forEach((k) => localStorage.removeItem(k));
  } catch (e) { /* nada */ }
  return { ok: true };
}

/* ---------- importación MANUAL del progreso antiguo de este navegador ---------- */
export function legacyAvailable() {
  try {
    const a = localStorage.getItem("permar_v2"), b = localStorage.getItem("historial");
    if (a) { const s = Store.sanitize(JSON.parse(a)); if (Object.keys(s.q).length || s.attempts.length || s.exams.length || s.sessions.length) return true; }
    if (b) { const l = JSON.parse(b); if (Array.isArray(l) && l.length) return true; }
  } catch (e) { /* nada */ }
  return false;
}
export const legacyDecisionKey = (uid) => "permar_legacy_decision_" + uid;

export function importLegacy(uid) {
  // Lee el progreso antiguo SIN borrarlo y lo copia a la cuenta actual (que quedó en la clave por-usuario).
  Store.useKey("permar_v2", "historial");
  const old = JSON.parse(JSON.stringify(Store.get()));
  Store.useKey(userKey(uid), null);
  Store.replaceState(old);                // dispara onSave → se sube a la nube
  return old;
}
