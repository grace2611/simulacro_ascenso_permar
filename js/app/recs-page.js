/*
  Recomendaciones para PERMAR. Solo con prueba gratuita vigente o Premium vigente (boot.js + reglas de Firestore).
  Cada usuario ve únicamente las suyas; las notas privadas de la administradora viven en otra colección que el estudiante no puede leer.
  Enviar una recomendación no otorga XP ni modifica el progreso.
*/
import { db, F } from "./fb.js";
const P = window.PERMAR;

export const CATEGORIES = {
  preguntas_nuevas: "Nuevas preguntas", correccion: "Corrección de preguntas o respuestas", simulacros: "Nuevos simulacros", tarjetas: "Tarjetas de estudio",
  ux: "Experiencia de usuario", tecnico: "Problemas técnicos", funciones: "Nuevas funciones", otro: "Otro"
};
export const STATUS = { received: "Recibida", review: "En revisión", accepted: "Aceptada", implemented: "Implementada", discarded: "Descartada" };

export function validate(o) {
  const t = String(o.title || "").trim(), d = String(o.description || "").trim();
  if (!CATEGORIES[o.category]) return "Elige una categoría.";
  if (t.length < 4 || t.length > 120) return "El título debe tener entre 4 y 120 caracteres.";
  if (d.length < 10 || d.length > 2000) return "La descripción debe tener entre 10 y 2000 caracteres.";
  if (String(o.area || "").length > 80) return "El área relacionada es demasiado larga (máx. 80).";
  return null;
}

export async function init(ctx) {
  const U = P.Util, UI = P.UI, esc = U.esc;
  const root = document.getElementById("app");
  const fdt = (t) => (t && t.toMillis ? new Date(t.toMillis()).toLocaleString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
  let list = [];

  async function load() {
    const snap = await F.getDocs(F.query(F.collection(db, "recommendations"), F.where("uid", "==", ctx.user.uid)));
    list = []; snap.forEach((d) => list.push(Object.assign({ id: d.id }, d.data())));
    list.sort((a, b) => ((b.createdAt && b.createdAt.toMillis()) || 0) - ((a.createdAt && a.createdAt.toMillis()) || 0));
  }
  function render() {
    root.innerHTML = '<section class="glass pay"><h2>Enviar una recomendación</h2><p class="hint">Cuéntanos cómo mejorar PERMAR. Enviarla no da XP ni cambia tu progreso. Solo tú y la administración la ven.</p>' +
      '<form id="recForm" class="pay-form" novalidate>' +
      '<div class="field"><label for="rcat">Categoría *</label><select id="rcat">' + Object.keys(CATEGORIES).map((k) => '<option value="' + k + '">' + esc(CATEGORIES[k]) + "</option>").join("") + "</select></div>" +
      '<div class="field"><label for="rtit">Título * <small>(4–120)</small></label><input id="rtit" maxlength="120" autocomplete="off"></div>' +
      '<div class="field"><label for="rdes">Descripción * <small>(10–2000)</small></label><textarea id="rdes" rows="5" maxlength="2000"></textarea></div>' +
      '<div class="field"><label for="rarea">Área relacionada (opcional)</label><input id="rarea" maxlength="80" placeholder="Ej.: Cultura General, Simulacro, Tarjetas…"></div>' +
      '<p class="hint err" id="recErr" role="alert"></p><button type="submit" class="btn btn-primary big" id="recSend">Enviar recomendación</button></form></section>' +
      '<section class="glass plan-hist"><h3>Mis recomendaciones</h3>' + (list.length ? '<ul class="plain rec-list">' + list.map((r) =>
        "<li><strong>" + esc(r.title) + "</strong> <span class=\"chip\">" + esc(STATUS[r.status] || r.status) + "</span><br><small>" + esc(CATEGORIES[r.category] || r.category) + (r.area ? " · " + esc(r.area) : "") + " · enviada " + fdt(r.createdAt) + "</small></li>").join("") + "</ul>" : '<p class="hint">Aún no has enviado ninguna.</p>') + "</section>";
    root.querySelector("#recForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const err = root.querySelector("#recErr"), btn = root.querySelector("#recSend"); err.textContent = "";
      const o = { category: root.querySelector("#rcat").value, title: root.querySelector("#rtit").value, description: root.querySelector("#rdes").value, area: root.querySelector("#rarea").value };
      const bad = validate(o); if (bad) { err.textContent = bad; return; }
      btn.disabled = true; btn.textContent = "Enviando…";
      try {
        await F.addDoc(F.collection(db, "recommendations"), { uid: ctx.user.uid, email: ctx.user.email || "", category: o.category, title: o.title.trim(), description: o.description.trim(), area: o.area.trim(), status: "received", createdAt: F.serverTimestamp() });
        UI.toast("✅ ¡Gracias! Recibimos tu recomendación.", "ok");
        await load(); render();
      } catch (e) { err.textContent = e && e.code === "permission-denied" ? "No se pudo enviar: tu acceso ya no está vigente." : "No se pudo enviar. Inténtalo de nuevo."; btn.disabled = false; btn.textContent = "Enviar recomendación"; }
    });
  }
  try { await load(); } catch (e) { list = []; }
  render();
}
