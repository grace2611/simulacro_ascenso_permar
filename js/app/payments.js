/*
  Solicitudes de pago manual (Yape / Plin) desde el lado del estudiante.
  - paymentRequests/{uid}: UNA solicitud abierta por usuario (el id es el uid → no hay duplicados ni se puede suplantar a otro).
  - receipts/{uid}: comprobante OBLIGATORIO (imagen JPG reducida en el navegador, guardada en un documento privado de Firestore;
    solo la ven el dueño y la administradora). ~300 KB máx., muy por debajo del límite de 1 MB por documento.
  - Enviar una solicitud NO activa nada: solo la administradora puede activar (subscriptions/{uid}).
  - Plan, precio y duración los validan las reglas (premium90 · S/ 5 · 90 días): el navegador no puede inventarlos.
*/
import { db, F } from "./fb.js";

export const MAX_FILE = 8 * 1024 * 1024;
export const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_DATAURL = 300000;     // ~300 KB tras reducir (las reglas aceptan hasta 350 000 caracteres)
const MIN_SIDE = 300;           // una captura más pequeña no se puede leer

const B = window.PERMAR.Billing;
export const validateOperationCode = B.validateOperationCode;
export const validatePayerName = B.validatePayerName;
export const validateForm = B.validateForm;

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (OK_TYPES.indexOf(file.type) < 0) return reject(new Error("El comprobante debe ser una imagen JPG, PNG o WEBP."));
    if (file.size > MAX_FILE) return reject(new Error("La imagen pesa más de 8 MB. Usa una captura más pequeña."));
    if (file.size < 2000) return reject(new Error("La imagen parece vacía o dañada. Elige otra captura."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        if (Math.max(img.width, img.height) < MIN_SIDE) { URL.revokeObjectURL(url); return reject(new Error("La imagen es demasiado pequeña para leerse. Usa la captura completa.")); }
        let side = 1100, q = 0.72, out = "";
        for (let i = 0; i < 8; i++) {
          const k = Math.min(1, side / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL("image/jpeg", q);
          if (out.length <= MAX_DATAURL) break;
          side = Math.round(side * 0.8); q = Math.max(0.4, q - 0.08);
        }
        URL.revokeObjectURL(url);
        if (out.length > MAX_DATAURL + 40000) return reject(new Error("No se pudo reducir la imagen lo suficiente. Prueba con otra captura."));
        resolve(out);
      } catch (e) { reject(new Error("No se pudo leer la imagen.")); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("El archivo no es una imagen válida.")); };
    img.src = url;
  });
}

/* Crea la solicitud y el comprobante en un solo lote atómico. */
export async function submitRequest(user, cfg, o) {
  const plan = cfg.plan;
  const err = validateForm(o);
  if (err) throw new Error(err);
  const batch = F.writeBatch(db);
  batch.set(F.doc(db, "paymentRequests", user.uid), {
    uid: user.uid, email: user.email || "", displayName: user.displayName || "",
    planId: plan.id, planName: plan.name, days: plan.days, amount: plan.price, currency: plan.currency || "PEN",
    method: o.method, operationCode: String(o.operationCode).trim(), payerName: String(o.payerName).trim().slice(0, 80),
    note: String(o.note || "").trim().slice(0, 300), hasReceipt: true, confirmed: true,
    status: "pending", createdAt: F.serverTimestamp()
  });
  batch.set(F.doc(db, "receipts", user.uid), { image: o.receipt, mime: "image/jpeg", size: o.receipt.length, createdAt: F.serverTimestamp() });
  try { await batch.commit(); }
  catch (e) {
    if (e && e.code === "permission-denied") throw new Error("No se pudo enviar: ya tienes una solicitud en revisión o algún dato no es válido. Recarga la página e inténtalo de nuevo.");
    throw e;
  }
}

export async function cancelRequest(uid) {
  const batch = F.writeBatch(db);
  batch.delete(F.doc(db, "paymentRequests", uid));
  batch.delete(F.doc(db, "receipts", uid));
  await batch.commit();
}

export async function myHistory(uid) {
  const snap = await F.getDocs(F.query(F.collection(db, "paymentHistory"), F.where("uid", "==", uid)));
  const out = []; snap.forEach((d) => out.push(Object.assign({ id: d.id }, d.data())));
  return out.sort((a, b) => ((b.reviewedAt && b.reviewedAt.toMillis()) || 0) - ((a.reviewedAt && a.reviewedAt.toMillis()) || 0));
}
