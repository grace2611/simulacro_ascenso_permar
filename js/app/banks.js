/*
  Carga de bancos de preguntas.
  Los 10 bancos COMPLETOS (100 preguntas cada uno) viajan con el sitio en js/data/banco/<clave>.js y se cargan para TODAS
  las personas, con o sin sesión, sin depender de Firestore. Así «Leer preguntas y respuestas» muestra siempre el banco completo de la especialidad elegida (+ Cultura y Deberes).
  Orden de carga de cada banco: (1) archivo local completo → (2) Firestore bank/{categoría} → (3) la muestra de js/data/sample.js.
  Que se pueda LEER no da acceso a nada interactivo: practicar, simulacros, XP, progreso e historial siguen según el acceso.
*/
import { db, F } from "./fb.js";

const P = window.PERMAR;
const TTL = 20 * 60 * 1000;
const key = (cat) => "permar_bank_pub_" + cat;

/* Bancos que necesita cada página: «leer» muestra todas las categorías; el resto usa las suyas. */
export function neededBanks(page) {
  const esp = P.ESP ? P.ESP.activa : "oficinista";
  if (page === "leer") {
    const cats = P.CONFIG && P.CONFIG.categories ? P.CONFIG.categories.map((c) => (c.especialidad ? esp : c.key)) : ["cultura", "deberes", esp];
    return Array.from(new Set(cats));
  }
  return ["cultura", "deberes", esp];
}

/* Banco completo incluido en el sitio (js/data/banco/<clave>.js → P.BANCO[clave]). */
function loadLocal(cat) {
  if (P.BANCO && Array.isArray(P.BANCO[cat])) return Promise.resolve(P.BANCO[cat]);
  return new Promise((res) => {
    const s = document.createElement("script");
    s.src = "js/data/banco/" + cat + ".js";
    s.onload = () => res(P.BANCO && Array.isArray(P.BANCO[cat]) ? P.BANCO[cat] : null);
    s.onerror = () => res(null);
    document.head.appendChild(s);
  });
}

async function fetchBank(cat) {
  try {
    const c = JSON.parse(sessionStorage.getItem(key(cat)) || "null");
    if (c && Date.now() - c.t < TTL && Array.isArray(c.items)) return c.items;
  } catch (e) { /* nada */ }
  const snap = await F.getDoc(F.doc(db, "bank", cat));
  if (!snap.exists()) return null;
  const items = snap.data().items;
  if (!Array.isArray(items)) return null;
  try { sessionStorage.setItem(key(cat), JSON.stringify({ t: Date.now(), items })); } catch (e) { /* nada */ }
  return items;
}

export function clearBankCache() {
  try { Object.keys(sessionStorage).filter((k) => k.indexOf("permar_bank_") === 0).forEach((k) => sessionStorage.removeItem(k)); } catch (e) { /* nada */ }
}

/* Devuelve { missing: [cat...] } con los bancos que no se pudieron cargar (se usa la muestra en su lugar). */
export async function loadBanks(page) {
  P.DATA = {};
  const missing = [];
  const wanted = neededBanks(page);
  await Promise.all(wanted.map(async (cat) => {
    let items = null;
    try { items = await loadLocal(cat); } catch (e) { /* se prueba la nube */ }
    if (!items) { try { items = await fetchBank(cat); } catch (e) { console.warn("Banco " + cat + ":", e && e.code); } }
    if (!items) missing.push(cat);
    P.DATA[cat] = (items || (P.SAMPLE && P.SAMPLE[cat]) || []).slice();
  }));
  return { missing };
}
