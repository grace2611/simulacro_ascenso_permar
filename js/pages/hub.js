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
    if (!ov.hasActivity) {
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
    var primaryIdx = !ov.hasActivity ? 3 : (ov.due > 0 ? 1 : (ov.errorsOpen > 0 ? 2 : 3));
    $("#modes").innerHTML = modes.map(function (m, i) {
      return '<a class="mode' + (i === primaryIdx ? " primary" : "") + '" href="' + m.href + '"><span class="mi" aria-hidden="true">' + m.icon + "</span>" +
        '<span><span class="mt">' + m.t + '</span><br><span class="ms">' + esc(m.s) + "</span></span>" +
        (m.count ? '<span class="badgecount" aria-label="' + m.count + ' pendientes">' + m.count + "</span>" : "") + "</a>";
    }).join("");

    /* ---------- categorías ---------- */
    $("#cats").innerHTML = ov.cats.map(function (c) {
      var cat = C.catByKey[c.cat];
      var info = c.seen > 0
        ? '<div class="cstat">' + UI.bar(c.masteredPct, "Dominio de " + cat.nombre) +
          "<span>" + c.seen + " de " + c.total + " estudiadas · dominio " + c.masteredPct + " %" + (c.due ? " · " + c.due + " pend." : "") + "</span></div>"
        : "";
      if (cat.especialidad) {
        var esp = UI.espActual();
        return '<div class="card card-esp"><span class="card-icon" aria-hidden="true">' + cat.icono + "</span>" +
          '<div><h2><a class="card-link" href="quiz.html?categoria=' + c.cat + '">ESPECIALIDAD</a></h2>' +
          '<p><span aria-hidden="true">' + esp.icono + " </span>" + esc(esp.nombre) + " · " + c.total + " preguntas</p></div>" + info +
          '<button type="button" class="btn btn-secondary esp-change" data-esp-change>🔄 Cambiar especialidad</button></div>';
      }
      return '<a class="card" href="quiz.html?categoria=' + c.cat + '"><span class="card-icon" aria-hidden="true">' + cat.icono + "</span>" +
        "<div><h2>" + esc(cat.nombre.toUpperCase()) + "</h2><p>" + c.total + " preguntas</p></div>" + info + "</a>";
    }).join("");
  }

  $("#settingsBtn").addEventListener("click", function () { UI.openSettings(function () { render(); }); });
  render();
  // al volver con el botón "atrás" (bfcache) los datos pueden haber cambiado
  window.addEventListener("pageshow", function (e) { if (e.persisted) { Store.invalidate(); render(); } });
})();
