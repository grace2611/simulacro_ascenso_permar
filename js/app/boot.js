/*
  ARRANQUE DE CADA PÁGINA.
  Orden: (1) scripts base → (2) Firebase: sesión de Google (o visitante), configuración, prueba y suscripción →
         (3) decide el nivel de acceso (visitante / prueba / premium / vencido) con la hora del SERVIDOR →
         (4) carga el banco público de Firestore y el almacenamiento (memoria o por-usuario) →
         (5) si la página es interactiva y NO hay acceso vigente, muestra el aviso y NO carga la lógica de estudio;
             si hay acceso, carga la lógica de estudio original y la pantalla de la página.
  Cada HTML solo incluye:  <script type="module" src="js/app/boot.js" data-page="quiz"></script>
*/
const P = (window.PERMAR = window.PERMAR || {});
const tag = document.querySelector("script[data-page]");
const page = tag ? tag.getAttribute("data-page") : "index";

const PAGES = {
  /* públicas: cualquiera */
  index: { page: "js/pages/hub.js" },
  leer: { page: "js/pages/leer.js" },
  planes: { module: "./plans-page.js" },
  cuenta: { module: "./account-page.js" },
  /* interactivas: exigen prueba gratuita vigente o Premium vigente */
  quiz: { page: "js/pages/quiz.js", needsAccess: true },
  estudio: { page: "js/pages/estudio.js", needsAccess: true },
  tarjetas: { page: "js/pages/tarjetas.js", needsAccess: true },
  simulacro: { page: "js/pages/simulacro.js", review: true, needsAccess: true },
  progreso: { page: "js/pages/progreso.js", review: true, needsAccess: true },
  desafios: { page: "js/pages/desafios.js", needsAccess: true },
  recomendaciones: { module: "./recs-page.js", needsAccess: true },
  /* administración */
  admin: { module: "./admin-page.js", adminOnly: true }
};
const DEF = PAGES[page] || PAGES.index;

const BASE = ["js/data/sample.js", "js/data/especialidades.js", "js/core/util.js", "js/core/config.js", "js/core/storage.js", "js/core/merge.js", "js/core/access.js", "js/core/billing.js", "js/core/mailtext.js"];
const STUDY = ["js/core/srs.js", "js/core/gamify.js", "js/core/stats.js", "js/core/engine.js", "js/core/ui.js"];

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.async = false;
    s.onload = res; s.onerror = () => rej(new Error("No se pudo cargar " + src));
    document.head.appendChild(s);
  });
}
async function loadScripts(list) { for (const s of list) await loadScript(s); }

/* ---------- pantalla de carga / error ---------- */
function overlay(html, id) {
  let o = document.getElementById(id || "bootLoading");
  if (!o) { o = document.createElement("div"); o.id = id || "bootLoading"; o.className = "boot-overlay"; document.body.appendChild(o); }
  o.innerHTML = html;
  return o;
}
function hideLoading() { const o = document.getElementById("bootLoading"); if (o) o.remove(); }
function fatal(msg, detail) {
  overlay('<div class="boot-box glass" role="alert"><h2>No se pudo cargar la plataforma</h2><p>' + msg + '</p>' +
    (detail ? '<p class="hint">' + detail + "</p>" : "") +
    '<div class="btnrow"><button type="button" class="btn btn-primary" onclick="location.reload()">Reintentar</button></div></div>');
}
overlay('<div class="boot-box"><div class="spinner" aria-hidden="true"></div><p>Cargando…</p></div>');

(async function main() {
  /* el botón 🌙/☀️ se activa YA, sin depender de Firebase ni del resto del arranque */
  try { await loadScript("js/theme.js"); } catch (e) { console.error(e); }
  try { await loadScripts(BASE); } catch (e) { return fatal("Falta un archivo del sitio. Recarga la página.", String(e.message || e)); }

  let Session, State, Banks, Sync, Devices, Payments, FB;
  try {
    FB = await import("./fb.js");
    [Session, State, Banks, Sync, Devices, Payments] = await Promise.all([
      import("./session.js"), import("./state.js"), import("./banks.js"), import("./sync.js"), import("./devices.js"), import("./payments.js")
    ]);
  } catch (e) {
    console.error(e);
    return fatal("No hay conexión con Firebase (o el navegador bloqueó el script de Google). Revisa tu internet y vuelve a intentarlo.");
  }

  const Store = P.Store, Access = P.Access;
  let Analytics = null;
  try { Analytics = await import("./analytics.js"); } catch (e) { /* la analítica es opcional */ }

  const user = await Session.currentGoogleUser();          // null = visitante (sin sesión)
  let cfgRes, acct;
  try {
    cfgRes = await State.loadConfig();
    acct = await State.loadAccount(user, cfgRes.cfg);
  } catch (e) {
    console.error(e);
    return fatal("No se pudo leer tu cuenta. Revisa tu conexión e inténtalo de nuevo.");
  }
  const cfg = cfgRes.cfg;
  const access = acct.level === "trial" || acct.level === "premium";

  async function signIn() {
    try { await Session.signInWithGoogle(); location.reload(); }
    catch (e) { if (P.UI) P.UI.toast("⚠️ " + e.message, "warn"); else alert(e.message); }
  }
  Access.init({
    level: acct.level, status: acct.status, isAdmin: acct.isAdmin, trialEndsAt: acct.trialEndsAt, premiumEndsAt: acct.premiumEndsAt, trialError: acct.trialError,
    user: user ? { uid: user.uid, email: user.email, name: user.displayName, photo: user.photoURL } : null,
    hooks: { signIn }
  });

  /* ----- dispositivos (cuentas con acceso) ----- */
  const interactive = Session.consumeJustSignedIn();
  let displacedMsg = null;
  const maxDev = (cfg.devices && cfg.devices.max) || 2;
  if (access) {
    const dv = await Devices.checkDevice(user.uid, maxDev, interactive);
    if (!dv.ok) {
      await Sync.endSession(); await Session.signOutNow();
      return overlay('<div class="boot-box glass" role="alert"><h2>Tu sesión se cerró en este dispositivo</h2>' +
        "<p>Tu cuenta se abrió en otros " + maxDev + " dispositivos. Por seguridad, cada cuenta puede usarse en un número limitado de dispositivos a la vez.</p>" +
        '<p class="hint">Si esta cuenta es tuya, vuelve a entrar: este dispositivo pasará a ser uno de los activos.</p>' +
        '<div class="btnrow"><button type="button" class="btn btn-primary" id="reSign">Continuar con Google</button></div></div>', "accessBlocked")
        .querySelector("#reSign").addEventListener("click", () => signIn());
    }
    if (dv.displaced && dv.displaced.length) displacedMsg = "Se cerró la sesión más antigua (" + dv.displaced.join(", ") + ") porque tu cuenta permite " + maxDev + " dispositivos.";
  }

  /* ----- almacenamiento y banco ----- */
  let syncInfo = null;
  if (access) { Store.setBackend(null); syncInfo = await Sync.start(user.uid); }
  else { Store.useMemory(); Store.useKey("permar_v2_guest", null); }      // sin acceso: nada se guarda
  const bl = await Banks.loadBanks(page);

  /* ----- contexto compartido ----- */
  async function signOut() {
    if (access) {
      const r = await Sync.endSession();
      if (!r.ok && !confirm("No se pudieron subir tus últimos cambios a la nube. Si cierras sesión ahora podrías perderlos. ¿Cerrar sesión de todas formas?")) return;
    }
    Banks.clearBankCache();
    await Session.signOutNow();
    location.href = "index.html";
  }
  const ctx = { user, acct, cfg, cfgFromServer: cfgRes.remote, premium: acct.level === "premium", access, page, Session, State, Banks, Sync, Devices, Payments, FB, signIn, signOut, interactive, missingBanks: bl.missing };
  P.ctx = ctx;

  /* ----- bloqueos de página (la interfaz NO es la única barrera: las reglas de Firestore protegen los datos) ----- */
  const needsAdmin = !!DEF.adminOnly;
  const needsAccess = !!DEF.needsAccess;
  const blocked = (needsAdmin && !acct.isAdmin) || (needsAccess && !access);
  if (Analytics) Analytics.track(page, access);

  await loadScripts(STUDY.concat(DEF.review ? ["js/core/review.js"] : []));
  const { mount } = await import("./account-ui.js");
  mount(ctx);
  hideLoading();

  if (displacedMsg) P.UI.toast("ℹ️ " + displacedMsg, "ok");
  if (bl.missing.length && acct.isAdmin) P.UI.toast("⚠️ Falta el banco de «" + bl.missing.join(", ") + "» en la nube; se muestra solo la muestra. Impórtalo desde Administración → Bancos.", "warn");

  if (blocked) {
    document.body.setAttribute("data-blocked", "1");     // oculta el contenido interactivo estático de la página
    if (needsAdmin) {
      overlay('<div class="boot-box glass"><h2>Acceso restringido</h2><p>Esta sección es solo para la administración.</p><div class="btnrow"><a class="btn btn-primary" href="index.html">Volver al inicio</a></div></div>', "accessBlocked");
    } else Access.showWall("interactive");
    return;
  }

  if (DEF.module) { const m = await import(DEF.module); await m.init(ctx); }
  else await loadScript(DEF.page);

  /* ----- el acceso puede vencer MIENTRAS la persona estudia: se guarda lo pendiente y se muestra el aviso ----- */
  if (access && needsAccess) {
    const endsAt = acct.level === "trial" ? acct.trialEndsAt : acct.premiumEndsAt;
    const wait = endsAt ? endsAt - acct.nowMs : 0;
    if (wait > 0 && wait < 2147000000) {
      setTimeout(async () => {
        try { await Sync.flush(); } catch (e) { /* nada */ }
        Access.level = "locked"; Access.status = acct.level === "trial" ? "trial_expired" : "premium_expired";
        Access.showWall("interactive");
      }, wait + 500);
    }
  }

  /* ----- importación manual del progreso antiguo de este navegador (una sola vez por cuenta y dispositivo) ----- */
  if (access && syncInfo && syncInfo.cloudEmpty && !syncInfo.offline && Sync.legacyAvailable()) {
    let decided = null; try { decided = localStorage.getItem(Sync.legacyDecisionKey(user.uid)); } catch (e) { /* nada */ }
    if (!decided) {
      const ok = await P.UI.dialog({
        title: "Encontramos progreso guardado en este dispositivo",
        html: "<p>Antes de las cuentas, tu avance se guardaba solo en este navegador. ¿Quieres <strong>importarlo a tu cuenta</strong> (" + P.Util.esc(user.email || "") + ")?</p>" +
              '<p class="hint">Si este dispositivo lo usa otra persona, elige «No importar». No se borra nada del navegador.</p>',
        dismissValue: false,
        actions: [{ label: "No importar", value: false, cls: "btn-secondary" }, { label: "Importar a mi cuenta", value: true, cls: "btn-primary" }]
      });
      try { localStorage.setItem(Sync.legacyDecisionKey(user.uid), ok ? "import" : "no"); } catch (e) { /* nada */ }
      if (ok) { Sync.importLegacy(user.uid); await Sync.flush(); location.reload(); }
    }
  }
})().catch((e) => { console.error(e); fatal("Ocurrió un error inesperado al iniciar.", String(e && e.message || e)); });
