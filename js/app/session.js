/*
  Identidad: SOLO "Continuar con Google" (Firebase Authentication). No hay registro con correo/contraseña ni acceso anónimo.
  - Sin sesión = visitante: solo puede leer preguntas y respuestas.
  - Al iniciar sesión por PRIMERA vez se crea el perfil y se inicia AUTOMÁTICAMENTE la prueba de 48 horas
    (trials/{uid}, con la hora del servidor; las reglas impiden reiniciarla, editarla o borrarla).
  - La hora "de verdad" se obtiene del servidor (marca lastLoginAt) para no depender del reloj del dispositivo.
*/
import { auth, db, A, F } from "./fb.js";

const LS_JUST = "permar_just_signed_in";
const SRV_KEY = "permar_srv_clock";
const SRV_TTL = 5 * 60 * 1000;

export function friendlyAuthError(e) {
  const c = (e && e.code) || "";
  const map = {
    "auth/popup-closed-by-user": "Cancelaste el inicio de sesión. Puedes intentarlo de nuevo cuando quieras.",
    "auth/cancelled-popup-request": "Ya hay una ventana de inicio de sesión abierta.",
    "auth/popup-blocked": "Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio e inténtalo otra vez.",
    "auth/network-request-failed": "No hay conexión con el servidor. Revisa tu internet e inténtalo otra vez.",
    "auth/unauthorized-domain": "Este dominio no está autorizado en Firebase (Authentication → Configuración → Dominios autorizados).",
    "auth/operation-not-allowed": "El inicio de sesión con Google no está habilitado en Firebase Authentication.",
    "auth/web-storage-unsupported": "Tu navegador bloquea el almacenamiento necesario (¿modo privado o cookies bloqueadas?). Usa Chrome o Safari normal.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos."
  };
  return map[c] || "No se pudo iniciar sesión (" + (c || "error desconocido") + ").";
}

export async function ready() { await auth.authStateReady(); return auth.currentUser; }

/* Devuelve el usuario de Google o null (visitante). Cualquier sesión anónima heredada de la versión anterior se cierra. */
export async function currentGoogleUser() {
  const u = await ready();
  if (u && u.isAnonymous) { try { await A.signOut(auth); } catch (e) { /* nada */ } return null; }
  return u || null;
}

/* Google bloquea el inicio de sesión dentro de navegadores integrados (WhatsApp, Facebook, Instagram, TikTok…). */
export function inAppBrowser() {
  const ua = (navigator.userAgent || "");
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|TikTok|musical_ly|Snapchat|Twitter|; wv\)/i.test(ua);
}

export async function signInWithGoogle() {
  if (inAppBrowser()) {
    throw Object.assign(new Error("Google no permite iniciar sesión dentro de WhatsApp/Facebook/Instagram/TikTok. Abre este enlace en Chrome o Safari (menú ⋮ → «Abrir en el navegador») e inténtalo de nuevo."), { code: "app/in-app-browser" });
  }
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  let result;
  try { result = await A.signInWithPopup(auth, provider); }
  catch (e) { throw Object.assign(new Error(friendlyAuthError(e)), { code: e && e.code }); }
  await ensureProfile(result.user);
  try { sessionStorage.setItem(LS_JUST, "1"); } catch (e) { /* nada */ }
  return result.user;
}
export function consumeJustSignedIn() {
  try { const v = sessionStorage.getItem(LS_JUST); sessionStorage.removeItem(LS_JUST); return v === "1"; } catch (e) { return false; }
}

/* Perfil mínimo: nombre, correo, foto. NO contiene rol ni suscripción (eso lo controlan las reglas). */
export async function ensureProfile(user) {
  if (!user || user.isAnonymous) return;
  const ref = F.doc(db, "users", user.uid);
  const snap = await F.getDoc(ref);
  const base = { displayName: user.displayName || "", email: user.email || "", photoURL: user.photoURL || "", lastLoginAt: F.serverTimestamp() };
  if (snap.exists()) await F.updateDoc(ref, base);
  else await F.setDoc(ref, Object.assign({ createdAt: F.serverTimestamp() }, base));
}

/* Inicia la prueba gratuita UNA sola vez. Las reglas solo permiten CREAR el documento (con hora del servidor):
   si ya existe, el intento se rechaza y la fecha original se conserva. Devuelve startedAt en ms (o null si no se pudo leer). */
let trialErr = null;
export function getTrialError() { return trialErr; }
export async function ensureTrial(user) {
  trialErr = null;
  if (!user || user.isAnonymous) return null;
  const ref = F.doc(db, "trials", user.uid);
  let snap = null;
  try { snap = await F.getDoc(ref); } catch (e) { snap = null; trialErr = (e && e.code) || "lectura-fallida"; console.warn("No se pudo leer la prueba:", e); }
  if (snap && snap.exists()) { trialErr = null; return tsMs(snap.data().startedAt); }
  try { await F.setDoc(ref, { startedAt: F.serverTimestamp(), email: user.email || "" }); trialErr = null; }
  catch (e) { trialErr = (e && e.code) || "creacion-fallida"; console.warn("No se pudo iniciar la prueba:", e); }
  try {
    snap = await F.getDoc(ref);
    if (snap.exists()) { const ms = tsMs(snap.data().startedAt); if (ms) trialErr = null; return ms; }
    return null;
  } catch (e) { if (!trialErr) trialErr = (e && e.code) || "lectura-fallida"; return null; }
}

const tsMs = (t) => (t && typeof t.toMillis === "function") ? t.toMillis() : null;

/* Hora del SERVIDOR en ms. Se obtiene escribiendo lastLoginAt (serverTimestamp) y leyéndolo; se guarda 5 minutos.
   Devuelve { nowMs, offset }. Si falla, usa el reloj local (las reglas siguen siendo la barrera real). */
export async function serverNow(user) {
  try {
    const c = JSON.parse(sessionStorage.getItem(SRV_KEY + (user ? user.uid : "")) || "null");
    if (c && Date.now() - c.local < SRV_TTL) return { nowMs: Date.now() + c.offset, offset: c.offset, fromServer: true };
  } catch (e) { /* nada */ }
  if (!user || user.isAnonymous) return { nowMs: Date.now(), offset: 0, fromServer: false };
  try {
    const ref = F.doc(db, "users", user.uid);
    const t0 = Date.now();
    await F.updateDoc(ref, { displayName: user.displayName || "", email: user.email || "", photoURL: user.photoURL || "", lastLoginAt: F.serverTimestamp() });
    const s = await F.getDoc(ref);
    const srv = tsMs(s.data().lastLoginAt);
    if (srv) {
      const offset = srv - Math.round((t0 + Date.now()) / 2);
      try { sessionStorage.setItem(SRV_KEY + user.uid, JSON.stringify({ local: Date.now(), offset })); } catch (e) { /* nada */ }
      return { nowMs: Date.now() + offset, offset, fromServer: true };
    }
  } catch (e) { console.warn("No se pudo leer la hora del servidor:", e && e.code); }
  return { nowMs: Date.now(), offset: 0, fromServer: false };
}

export async function signOutNow() {
  try { sessionStorage.removeItem(SRV_KEY + (auth.currentUser ? auth.currentUser.uid : "")); } catch (e) { /* nada */ }
  await A.signOut(auth);
}
