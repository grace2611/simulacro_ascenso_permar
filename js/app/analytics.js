/*
  Analítica ANÓNIMA y mínima para el panel de administración (sin IP, sin huellas, sin datos personales).
  Escribe contadores diarios en analytics/{AAAA-MM-DD}. Las reglas solo permiten SUMAR +1 por escritura.

  · visits       → sesiones estimadas: 1 por pestaña/sesión del navegador (sessionStorage), no por cada página.
  · uniques      → visitantes únicos ESTIMADOS: 1 por navegador cada 30 días (marca aleatoria en localStorage). Si la persona
                   borra sus datos o cambia de navegador/dispositivo se cuenta otra vez; por eso es una estimación.
  · reads        → entradas a la sección pública «Leer preguntas y respuestas» (1 por sesión).
  · authSessions → sesiones de cuentas con acceso vigente (prueba o Premium).
  La marca de localStorage (permar_uv) es aleatoria, no identifica a nadie y caduca a los 30 días.
  Las métricas NUNCA otorgan permisos ni cambian las condiciones de acceso.
*/
import { db, F } from "./fb.js";

const day = () => { const d = new Date(); return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); };
const ss = { get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* nada */ } } };

function bump(field) {
  return F.setDoc(F.doc(db, "analytics", day()), { [field]: F.increment(1), updatedAt: F.serverTimestamp() }, { merge: true }).catch(() => { /* la analítica nunca rompe la página */ });
}

export function track(page, hasAccess) {
  try {
    if (!ss.get("permar_s_visit")) {
      ss.set("permar_s_visit", "1");
      bump("visits");
      let seen = null;
      try { seen = JSON.parse(localStorage.getItem("permar_uv") || "null"); } catch (e) { seen = null; }
      if (!seen || Date.now() - seen.t > 30 * 86400000) {
        try { localStorage.setItem("permar_uv", JSON.stringify({ t: Date.now() })); } catch (e) { /* nada */ }
        setTimeout(() => bump("uniques"), 400);
      }
    }
    if (page === "leer" && !ss.get("permar_s_read")) { ss.set("permar_s_read", "1"); setTimeout(() => bump("reads"), 800); }
    if (hasAccess && !ss.get("permar_s_auth")) { ss.set("permar_s_auth", "1"); setTimeout(() => bump("authSessions"), 1200); }
  } catch (e) { /* nada */ }
}
