/*
  Centro de estudio (menú principal). Solo muestra datos reales: sin actividad
  presenta un estado inicial que explica cómo empezar.
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, UI = P.UI, G = P.Gamify, Stats = P.Stats, Store = P.Store;
  var $ = UI.$, esc = U.esc;

  function stat(k, v, s, extra) {
    return '<div class="stat"><span class="k">' + k + '</span><span class="v">' + v + "</span>" + (extra || "") + (s ? '<span class="s">' + s + "</span>" : "") + "</div>";
  }

  function render() {
    var state = Store.get(), today = U.today();
    var ov = Stats.overview(state, today);
    var gp = G.goalProgress(state, today), sk = G.streak(state, today), lv = G.levelFor(state.xp.total);

    /* ---------- bienvenida / hoy ---------- */
    var welcome = $("#welcome"), box = $("#today");
    var A = P.Access, free = A && !A.isPremium();
    if (free) {
      welcome.hidden = false; box.hidden = true;
      var C2 = P.ctx || {}, plan = (C2.cfg && C2.cfg.plan) || { price: 5, days: 90 };
      var info;
      if (A.isVisitor()) {
        info = "<h2>📖 Lee todo el banco, gratis</h2><p>Puedes leer todas las preguntas con la respuesta correcta resaltada, sin registrarte. " +
          "Para practicar, hacer simulacros y guardar tu progreso, continúa con Google.</p>";
      } else if (A.status === "pending") {
        info = "<h2>⏳ Tu pago está en revisión</h2><p>Revisaremos tu comprobante en hasta 24 horas y te avisaremos por correo. Mientras tanto puedes leer todo el banco.</p>";
      } else if (A.status === "premium_expired") {
        info = "<h2>⌛ Tu Premium venció</h2><p>Conservas tu cuenta, historial y progreso. Renueva por S/ " + plan.price.toFixed(2) + " (" + plan.days + " días) para volver a practicar.</p>";
      } else if (A.status === "suspended") {
        info = "<h2>⛔ Acceso suspendido</h2><p>Comunícate con soporte desde «Mi cuenta».</p>";
      } else if (A.status === "rejected") {
        info = "<h2>❌ Tu solicitud no fue aprobada</h2><p>Revisa el motivo en «Mi cuenta» y envía una nueva solicitud.</p>";
      } else {
        info = "<h2>⌛ Tu prueba gratuita terminó</h2><p>Sigues pudiendo leer todo el banco. Para volver a practicar activa PERMAR Premium por S/ " + plan.price.toFixed(2) + " (" + plan.days + " días).</p>";
      }
      welcome.innerHTML = info + '<div class="btnrow">' +
        (A.isVisitor() ? '<button type="button" class="btn btn-primary" id="hubSignin">Continuar con Google</button>' : "") +
        '<a class="btn ' + (A.isVisitor() ? "btn-secondary" : "btn-primary") + '" href="' + (A.isVisitor() || A.status === "pending" || A.status === "suspended" ? (A.isVisitor() ? "planes.html" : "cuenta.html") : "planes.html") + '">' +
        (A.isVisitor() ? "💳 Ver el plan Premium" : (A.status === "pending" || A.status === "suspended" ? "Ver mi cuenta" : "💳 Ver el plan Premium")) + "</a></div>";
      var sb = $("#hubSignin"); if (sb) sb.addEventListener("click", function () { A.hooks.signIn && A.hooks.signIn(); });
    } else if (!ov.hasActivity) {
      welcome.hidden = false; box.hidden = true;
      welcome.innerHTML =
        "<h2>👋 Empieza con una sesión corta</h2>" +
        "<p>Aquí verás tus repasos pendientes, tu racha, tu nivel y tu progreso en cuanto estudies. " +
        "Un buen primer paso: <strong>5 minutos</strong> de práctica. Lo que falles se guardará para repasarlo con repetición espaciada.</p>" +
        '<div class="btnrow"><a class="btn btn-primary" href="estudio.html?modo=rapida&min=5">⏱️ Empezar 5 minutos</a>' +
        '<a class="btn btn-secondary" href="leer.html">📖 Leer preguntas y respuestas</a>' +
        '<a class="btn btn-secondary" href="tarjetas.html">🃏 Probar las tarjetas</a></div>';
    } else {
      welcome.hidden = true; box.hidden = false;
      var goalSub = gp.done ? "✅ ¡Meta cumplida hoy!" : "Te " + U.plural(gp.target - gp.value, "falta", "faltan") + " " + (gp.target - gp.value) + " " + gp.unit;
      var streakSub = sk.current > 0
        ? (sk.doneToday ? "Hoy ya cuenta. " : "Estudia hoy para mantenerla. ") + "Mejor racha: " + sk.best + " " + U.plural(sk.best, "día", "días")
        : (sk.best > 0 ? "Mejor racha: " + sk.best + " " + U.plural(sk.best, "día", "días") + ". ¡Hoy es un buen día para retomar!" : "Responde " + C.goals.studyDayMin + " preguntas hoy para empezar tu racha.");
      var dueBlock = ov.due > 0
        ? stat("Repasos de hoy", ov.due + " " + U.plural(ov.due, "pendiente", "pendientes"),
               "Aprox. " + Stats.estimateMinutes(state, Math.min(ov.due, 20)) + " min para " + Math.min(ov.due, 20) + ".",
               '<a class="btn btn-primary" href="estudio.html?modo=hoy">▶ Repasar ahora</a>')
        : stat("Repasos de hoy", "Al día 🎉", Object.keys(state.q).length ? "No tienes repasos pendientes. ¿Practicas preguntas nuevas?" : "Se programan solos cuando estudias.");
      box.innerHTML =
        stat("Objetivo diario", gp.value + " / " + gp.target, goalSub, UI.bar(gp.pct, "Progreso del objetivo diario") + '<span class="s">' + esc(gp.label) + " · " + gp.pct + " %</span>") +
        stat("Racha", sk.current + " " + U.plural(sk.current, "día", "días") + (sk.current >= 3 ? " 🔥" : ""), streakSub) +
        stat("Nivel " + lv.level, esc(lv.name), lv.into + " / " + lv.need + " XP para el siguiente", UI.bar(lv.pct, "Progreso al siguiente nivel")) +
        dueBlock +
        stat("Acierto reciente", ov.recentAccuracy === null ? "—" : ov.recentAccuracy + " %",
             ov.recentAccuracy === null ? "Aún no hay muestras suficientes (se necesitan 10 respuestas en los últimos 7 días)." : "Últimos 7 días · " + ov.recentAnswers + " respuestas") +
        stat("Última actividad", ov.lastDay ? esc(U.fmtDate(ov.lastDay)) : "—",
             ov.errorsOpen > 0 ? ov.errorsOpen + " " + U.plural(ov.errorsOpen, "pregunta pendiente", "preguntas pendientes") + " de dominar" : "Sin errores pendientes");
    }

    /* ---------- modalidades ---------- */
    var errSub = ov.failedEver === 0 ? "Aún no tienes errores registrados" : ov.errorsOpen + " " + U.plural(ov.errorsOpen, "pendiente", "pendientes") + " de dominar · " + ov.failedEver + " falladas en total";
    var modes = [
      { href: "leer.html", icon: "📖", t: "Leer preguntas y respuestas", s: "Lee todo el banco con la respuesta correcta resaltada" },
      { href: "tarjetas.html", icon: "🃏", t: "Aprender con tarjetas", s: ov.due > 0 ? ov.due + " pendientes saldrán primero" : "Recuerda activamente y evalúate" },
      { href: "estudio.html?modo=errores", icon: "🔁", t: "Repasar mis errores", s: errSub, count: ov.errorsOpen },
      { href: "estudio.html?modo=rapida", icon: "⏱️", t: "Practicar unos minutos", s: "5, 10 o 15 min — o por número de preguntas" },
      { href: "desafios.html", icon: "🏆", t: "Realizar desafíos", s: "Retos semanales, medallas y nivel" },
      { href: "simulacro.html", icon: "📝", t: "Hacer un simulacro", s: "Condiciones de examen con tiempo límite" },
      { href: "progreso.html", icon: "📊", t: "Consultar mi progreso", s: ov.hasActivity ? ov.answers + " respuestas · " + ov.mastered + " dominadas" : "Tu historial aparecerá aquí" }
    ];
    if (free) modes.forEach(function (m) {
      if (m.href !== "leer.html") { m.lock = true; m.href = A.isVisitor() ? "#signin" : "planes.html"; m.s = A.isVisitor() ? "🔒 Inicia sesión · prueba gratuita de 48 h" : "🔒 Requiere prueba o Premium vigente"; }
    });
    if (A && A.hasAccess()) modes.push({ href: "recomendaciones.html", icon: "💡", t: "Recomendaciones para PERMAR", s: "Sugiere preguntas, correcciones o mejoras" });
    var primaryIdx = free ? 0 : !ov.hasActivity ? 3 : (ov.due > 0 ? 1 : (ov.errorsOpen > 0 ? 2 : 3));
    $("#modes").innerHTML = modes.map(function (m, i) {
      return '<a class="mode' + (i === primaryIdx ? " primary" : "") + (m.lock ? " locked" : "") + '" href="' + m.href + '"><span class="mi" aria-hidden="true">' + m.icon + "</span>" +
        '<span><span class="mt">' + m.t + '</span><br><span class="ms">' + esc(m.s) + "</span></span>" +
        (m.count ? '<span class="badgecount" aria-label="' + m.count + ' pendientes">' + m.count + "</span>" : "") + "</a>";
    }).join("");

    /* ---------- categorías ---------- */
    /* Igual que las modalidades: si no hay acceso (visitante, Premium vencido, etc.) se muestran con 🔒 y el mismo texto. */
    var lockHref = free ? (A.isVisitor() ? "#signin" : "planes.html") : null;
    var lockSub = free ? (A.isVisitor() ? "🔒 Inicia sesión · prueba gratuita de 48 h" : "🔒 Requiere prueba o Premium vigente") : "";
    $("#cats").innerHTML = ov.cats.map(function (c) {
      var cat = C.catByKey[c.cat];
      var info = (c.seen > 0 && !free)
        ? '<div class="cstat">' + UI.bar(c.masteredPct, "Dominio de " + cat.nombre) +
          "<span>" + c.seen + " de " + c.total + " estudiadas · dominio " + c.masteredPct + " %" + (c.due ? " · " + c.due + " pend." : "") + "</span></div>"
        : "";
      var href = free ? lockHref : "quiz.html?categoria=" + c.cat;
      var sub = free ? lockSub : c.total + " preguntas";
      if (cat.especialidad) {
        var esp = UI.espActual();
        return '<div class="card card-esp' + (free ? " locked" : "") + '"><span class="card-icon" aria-hidden="true">' + cat.icono + "</span>" +
          '<div><h2><a class="card-link" href="' + href + '">ESPECIALIDAD</a></h2>' +
          '<p><span aria-hidden="true">' + esp.icono + " </span>" + esc(esp.nombre) + " · " + esc(sub) + "</p></div>" + info +
          '<button type="button" class="btn btn-secondary esp-change" data-esp-change>🔄 Cambiar especialidad</button></div>';
      }
      return '<a class="card' + (free ? " locked" : "") + '" href="' + href + '"><span class="card-icon" aria-hidden="true">' + cat.icono + "</span>" +
        "<div><h2>" + esc(cat.nombre.toUpperCase()) + "</h2><p>" + esc(sub) + "</p></div>" + info + "</a>";
    }).join("");
  }

  $("#settingsBtn").addEventListener("click", function () { UI.openSettings(function () { render(); }); });
  render();
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#signin"]');
    if (a) { e.preventDefault(); P.Access.hooks.signIn && P.Access.hooks.signIn(); }
  });
  // al volver con el botón "atrás" (bfcache) los datos pueden haber cambiado
  window.addEventListener("pageshow", function (e) { if (e.persisted) { Store.invalidate(); render(); } });
})();
