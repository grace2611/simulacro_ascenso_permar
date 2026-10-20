/*
  Desafíos semanales, objetivo diario, nivel y medallas.
  Las medallas se muestran bloqueadas con su condición real hasta que se cumple.
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, UI = P.UI, G = P.Gamify, Store = P.Store;
  var $ = UI.$, esc = U.esc;

  function render() {
    var state = Store.get(), today = U.today();
    var lv = G.levelFor(state.xp.total), gp = G.goalProgress(state, today), sk = G.streak(state, today);

    $("#level").innerHTML =
      '<div class="level-line"><strong style="color:var(--text-primary);font-size:1.15rem">Nivel ' + lv.level + " · " + esc(lv.name) + "</strong><span>" + lv.xp + " XP en total</span></div>" +
      UI.bar(lv.pct, "Progreso al siguiente nivel") +
      '<p class="hint">' + lv.into + " / " + lv.need + " XP · te faltan " + lv.toNext + " XP para el nivel " + (lv.level + 1) + ". " +
      "Ganas XP al acertar por primera vez cada día, recuperar preguntas falladas, completar sesiones y cumplir metas. Repetir preguntas fáciles no da más XP.</p>";

    $("#daily").innerHTML =
      '<div class="tiles">' +
      '<div class="tile"><span class="n">' + gp.value + " / " + gp.target + '</span><span class="l">' + esc(gp.label) + "</span></div>" +
      '<div class="tile ' + (gp.done ? "ok" : "") + '"><span class="n">' + gp.pct + ' %</span><span class="l">' + (gp.done ? "¡Meta cumplida!" : "completado hoy") + "</span></div>" +
      '<div class="tile"><span class="n">' + sk.current + " " + U.plural(sk.current, "día", "días") + '</span><span class="l">racha actual</span></div>' +
      '<div class="tile"><span class="n">' + sk.best + " " + U.plural(sk.best, "día", "días") + '</span><span class="l">mejor racha</span></div></div>' +
      UI.bar(gp.pct, "Progreso del objetivo diario") +
      '<p class="hint">Un día cuenta para la racha cuando respondes al menos ' + C.goals.studyDayMin + " preguntas. " +
      (sk.current === 0 && sk.best === 0 ? "Todavía no tienes racha: ¡empieza hoy!" : "") + "</p>" +
      '<div class="btnrow"><button type="button" class="btn btn-secondary" id="chGoal">⚙️ Cambiar objetivo</button>' +
      '<a class="btn btn-primary" href="estudio.html?modo=rapida">⏱️ Estudiar ahora</a></div>';
    $("#chGoal").addEventListener("click", function () { UI.openSettings(render); });

    $("#weekly").innerHTML = G.challenges(state, today).map(function (ch) {
      var pct = Math.min(100, U.pct(ch.value, ch.target)), done = ch.value >= ch.target;
      return '<article class="challenge' + (done ? " done" : "") + '"><h3><span aria-hidden="true">' + ch.icon + "</span>" + esc(ch.title) + (done ? " ✅" : "") + "</h3>" +
        "<p>" + esc(ch.desc) + "</p>" + UI.bar(pct, ch.title) +
        '<div class="ch-row"><span>' + Math.min(ch.value, ch.target) + " / " + ch.target + " " + ch.unit + "</span><span>" + (done ? "¡Completado! +" + C.xp.weeklyChallenge + " XP" : pct + " %") + "</span></div>" +
        (done ? "" : '<a class="btn btn-secondary" href="' + ch.href + '">' + esc(ch.cta) + "</a>") + "</article>";
    }).join("");

    var got = G.badges.filter(function (b) { return state.badges[b.id]; }).length;
    $("#medalCount").textContent = got + " de " + G.badges.length + " medallas desbloqueadas.";
    $("#badges").innerHTML = G.badges.map(function (b) {
      var when = state.badges[b.id];
      return '<article class="badge-card' + (when ? "" : " locked") + '"><span class="bi" aria-hidden="true">' + b.icon + "</span>" +
        "<h3>" + esc(b.name) + (when ? "" : ' <span class="sr-only">(bloqueada)</span>') + "</h3><p>" + esc(b.desc) + "</p>" +
        (when ? '<span class="when">✓ Desbloqueada · ' + esc(U.fmtDateTime(when)) + "</span>" : '<span class="cond">🔒 Requisito: ' + esc(b.cond) + "</span>") + "</article>";
    }).join("");
  }
  render();
})();
