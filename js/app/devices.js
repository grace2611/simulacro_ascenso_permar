/*
  Control de dispositivos simultáneos (premium). Disuasivo contra el uso compartido de una cuenta de Google:
  - Cada dispositivo se registra en users/{uid}/devices/{deviceId}. Máximo configurable (por defecto 2).
  - Al iniciar sesión en un dispositivo nuevo con el cupo lleno, se cierra el más antiguo (aviso en ese dispositivo).
  - No usa huellas del dispositivo: solo un identificador aleatorio guardado en este navegador y el nombre genérico del navegador.
  Limitación honesta: es un control del lado del cliente; frena el uso casual compartido, no a alguien decidido a evadirlo.
*/
import { db, F } from "./fb.js";
import { getDeviceId } from "./sync.js";

const CHECK_EVERY = 10 * 60 * 1000;
const label = () => {
  const ua = navigator.userAgent || "";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return (br + (os ? " · " + os : "")).slice(0, 40);
};

/* interactive=true cuando la persona acaba de iniciar sesión: este dispositivo desplaza al más antiguo si hace falta.
   Devuelve { ok:true } o { ok:false, reason:"displaced" } si esta sesión fue cerrada desde otro dispositivo. */
export async function checkDevice(uid, max, interactive) {
  const id = getDeviceId();
  const lastKey = "permar_dev_check_" + uid;
  try {
    if (!interactive && Date.now() - (+localStorage.getItem(lastKey) || 0) < CHECK_EVERY) return { ok: true, skipped: true };
  } catch (e) { /* nada */ }
  try {
    const col = F.collection(db, "users", uid, "devices");
    const snap = await F.getDocs(col);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, seen: d.data().lastSeen ? d.data().lastSeen.toMillis() : 0, label: d.data().label }));
    const mine = list.find((d) => d.id === id);
    const ref = F.doc(db, "users", uid, "devices", id);
    if (mine) {
      await F.updateDoc(ref, { lastSeen: F.serverTimestamp() });
    } else {
      if (list.length >= max) {
        if (!interactive) return { ok: false, reason: "displaced" };      // otro dispositivo ocupó mi lugar
        list.sort((a, b) => a.seen - b.seen);
        const toRemove = list.slice(0, list.length - max + 1);
        await Promise.all(toRemove.map((d) => F.deleteDoc(F.doc(db, "users", uid, "devices", d.id))));
        await F.setDoc(ref, { label: label(), createdAt: F.serverTimestamp(), lastSeen: F.serverTimestamp() });
        try { localStorage.setItem(lastKey, String(Date.now())); } catch (e) { /* nada */ }
        return { ok: true, displaced: toRemove.map((d) => d.label || "otro dispositivo") };
      }
      await F.setDoc(ref, { label: label(), createdAt: F.serverTimestamp(), lastSeen: F.serverTimestamp() });
    }
    try { localStorage.setItem(lastKey, String(Date.now())); } catch (e) { /* nada */ }
    return { ok: true };
  } catch (e) {
    console.warn("Control de dispositivos no disponible:", e && e.code);
    return { ok: true, error: true };            // un fallo de red no debe expulsar a un usuario legítimo
  }
}

export async function listDevices(uid) {
  const snap = await F.getDocs(F.collection(db, "users", uid, "devices"));
  const mine = getDeviceId(), out = [];
  snap.forEach((d) => out.push({ id: d.id, label: d.data().label || "Dispositivo", seen: d.data().lastSeen ? d.data().lastSeen.toMillis() : 0, mine: d.id === mine }));
  return out.sort((a, b) => b.seen - a.seen);
}
export async function removeDevice(uid, id) { await F.deleteDoc(F.doc(db, "users", uid, "devices", id)); }
