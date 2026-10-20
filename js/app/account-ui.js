/*
  Barra de cuenta (arriba de cada página) y diálogo «Mi cuenta».
  Muestra claramente en qué estado está la persona: visitante · prueba activa · Premium · vencido · pago en revisión.
  Solo se ofrecen enlaces a funciones que la persona puede usar (nada interactivo sin acceso vigente).
*/
const P = window.PERMAR;

function fmtDate(ms) { return ms ? new Date(ms).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
export function fmtRemaining(ms) {
  if (ms <= 0) return "terminó";
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return Math.ceil(h / 24) + " días";
  return h > 0 ? h + " h " + m + " min" : m + " min";
}

export function mount(ctx) {
  const A = P.Access, U = P.Util, esc = U.esc;
  const host = document.querySelector(".page, .container") || document.body;
  const bar = document.createElement("div");
  bar.id = "accountBar"; bar.className = "account-bar";
  let left = "", right = "";
  if (ctx.acct.level === "visitor") {
    left = '<span class="acc-badge acc-free">👤 Visitante</span><span class="acc-note">Puedes leer todo el banco con las respuestas · para practicar, inicia sesión</span>';
    right = '<button type="button" class="btn btn-primary btn-sm" id="accSignin">Continuar con Google</button><a class="btn btn-secondary btn-sm" href="planes.html">Plan Premium</a>';
  } else {
    const u = ctx.user, name = (u.displayName || u.email || "Mi cuenta").split(" ")[0];
    const ini = esc((u.displayName || u.email || "?").charAt(0).toUpperCase());
    const av = u.photoURL ? '<img class="acc-av" alt="" referrerpolicy="no-referrer" src="' + esc(u.photoURL) + '">' : '<span class="acc-av acc-ini">' + ini + "</span>";
    if (ctx.acct.level === "premium") left = av + '<span class="acc-badge acc-premium">⭐ Premium</span><span class="acc-note">hasta el ' + fmtDate(ctx.acct.premiumEndsAt) + "</span>";
    else if (ctx.acct.level === "trial") left = av + '<span class="acc-badge acc-trial">🎁 Prueba gratuita</span><span class="acc-note">' + esc(fmtRemaining(ctx.acct.trialEndsAt - ctx.acct.nowMs)) + " restantes</span>";
    else left = av + '<span class="acc-badge acc-free">' + esc(A.statusLabel()) + '</span><span class="acc-note">' + esc(name) + "</span>";
    right = (ctx.acct.isAdmin ? '<a class="btn btn-secondary btn-sm" href="admin.html">🛠 Administración</a>' : "") +
      (ctx.acct.level === "premium" ? "" : '<a class="btn btn-primary btn-sm" href="planes.html">' + (ctx.acct.status === "pending" ? "Ver mi solicitud" : "Premium") + "</a>") +
      '<a class="btn btn-secondary btn-sm" href="cuenta.html">Mi cuenta</a>';
  }
  bar.innerHTML = '<div class="acc-left">' + left + '</div><div class="acc-right">' + right + "</div>";
  host.insertBefore(bar, host.firstChild);
  const si = bar.querySelector("#accSignin"); if (si) si.addEventListener("click", ctx.signIn);
}

/* Diálogo con dispositivos activos, identificador y cierre de sesión (se abre desde la página «Mi cuenta»). */
export async function openAccount(ctx) {
  const U = P.Util, esc = U.esc, u = ctx.user, A = P.Access;
  let devices = "";
  if (ctx.access) {
    try {
      const list = await ctx.Devices.listDevices(u.uid);
      devices = '<h3 class="acc-h">Dispositivos activos (máx. ' + ((ctx.cfg.devices && ctx.cfg.devices.max) || 2) + ")</h3><ul class='plain' id='devList'>" +
        list.map((d) => "<li>" + esc(d.label) + (d.mine ? " <strong>(este)</strong>" : ' <button type="button" class="linkbtn" data-dev="' + esc(d.id) + '">cerrar</button>') +
          ' <small>· ' + (d.seen ? new Date(d.seen).toLocaleString("es-PE") : "") + "</small></li>").join("") + "</ul>";
    } catch (e) { devices = ""; }
  }
  const html =
    '<p><strong>' + esc(u.displayName || "") + "</strong><br>" + esc(u.email || "") + "</p>" +
    "<p>Estado: <strong>" + esc(A.statusLabel()) + "</strong></p>" + devices +
    '<h3 class="acc-h">Tu identificador</h3><p class="hint">Solo lo ves tú y la administración. Sirve para soporte (y para configurar la administradora la primera vez).</p>' +
    '<p><code class="uid" id="uidTxt">' + esc(u.uid) + '</code> <button type="button" class="linkbtn" id="uidCopy">copiar</button></p>';
  P.UI.dialog({
    title: "👤 Dispositivos e identificador", html, dismissValue: "close",
    actions: [{ label: "Cerrar sesión", value: "out", cls: "btn-secondary" }, { label: "Cerrar", value: "close", cls: "btn-primary" }],
    onOpen: (d) => {
      const c = d.querySelector("#uidCopy");
      if (c) c.addEventListener("click", () => { navigator.clipboard && navigator.clipboard.writeText(u.uid).then(() => P.UI.toast("✅ Identificador copiado", "ok")); });
      d.querySelectorAll("[data-dev]").forEach((b) => b.addEventListener("click", async () => {
        try { await ctx.Devices.removeDevice(u.uid, b.getAttribute("data-dev")); b.closest("li").remove(); P.UI.toast("✅ Dispositivo cerrado", "ok"); }
        catch (e) { P.UI.toast("⚠️ No se pudo cerrar ese dispositivo.", "warn"); }
      }));
    }
  }).then((v) => { if (v === "out") ctx.signOut(); });
}
