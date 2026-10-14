/*
  Sesiones de estudio con respuesta inmediata:
    ?modo=errores  → Repasar mis errores (filtros por categoría / pendientes de dominar)
    ?modo=hoy      → Repasos de hoy (repetición espaciada)
    ?modo=rapida   → Práctica corta por TIEMPO (5/10/15 min) o por NÚMERO de preguntas

  Comportamiento de las sesiones por tiempo (claro y consistente):
    cuando se acaba el tiempo NO se corta la pregunta en curso: puedes contestarla,
    y al pulsar "Ver resumen" la sesión termina conservando todo lo respondido.
  Cada respuesta se guarda al momento; si recargas puedes continuar donde ibas o
  cerrar la sesión (queda marcada como interrumpida y no suma XP ni medallas).
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, UI = P.UI, Engine = P.Engine, Store = P.Store, Stats = P.Stats, S = P.SRS;
  var $ = UI.$;

  var MODOS = {
    errores: { titulo: "🔁 Repasar mis errores", tipo: "errores" },
    hoy:     { titulo: "📅 Repasos de hoy",       tipo: "hoy" },
    rapida:  { titulo: "⏱️ Práctica rápida",       tipo: "rapida" }
  };
  var modo = UI.param("modo");
  if (!MODOS[modo]) modo = "rapida";
  $("#titulo").textContent = MODOS[modo].titulo;
  document.title = MODOS[modo].titulo.replace(/^\S+\s/, "") + " · Simulacro PERMAR";

  var setupView = $("#setupView"), sessionView = $("#sessionView"), summaryView = $("#summaryView");
  var botones = Array.prototype.slice.call(document.querySelectorAll(".opcion"));
  var elProg = $("#progreso"), elTimer = $("#timer"), elPunt = $("#puntaje"), elXp = $("#xpSesion"), elBarra = $("#barra");
  var elPreg = $("#pregunta"), elFb = $("#feedback"), elExp = $("#expText"), expBtn = $("#expBtn"), nextBtn = $("#nextBtn");
  var elBanner = $("#banner"), finishBtn = $("#finishBtn");

  var sess = null;           // sesión en curso
  var shownAt = 0, tickId = null, finishing = false;

  /* ============================================================
     PREPARACIÓN
     ============================================================ */
  function pill(name, value, label, checked, disabled) {
    return '<label class="pill' + (disabled ? " off" : "") + '"><input type="radio" name="' + name + '" value="' + value + '"' +
      (checked ? " checked" : "") + (disabled ? " disabled" : "") + "><span>" + label + "</span></label>";
  }
  function checkPill(name, value, label, checked) {
    return '<label class="pill"><input type="checkbox" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
  }
  function val(name) { var e = setupView.querySelector('input[name="' + name + '"]:checked'); return e ? e.value : null; }
  function vals(name) { return Array.prototype.map.call(setupView.querySelectorAll('input[name="' + name + '"]:checked'), function (e) { return e.value; }); }

  function empty(icon, title, msg, actions) {
    return '<div class="empty"><div class="empty-icon" aria-hidden="true">' + icon + "</div><h2>" + title + "</h2><p>" + msg + '</p><div class="btnrow">' + actions + "</div></div>";
  }

  function renderSetup() {
    var state = Store.get(), today = U.today();
    sessionView.hidden = true; summaryView.hidden = true; setupView.hidden = false;
    if (modo === "errores") setupErrores(state, today);
    else if (modo === "hoy") setupHoy(state, today);
    else setupRapida(state, today);
    var go = $("#goBtn"); if (go) go.addEventListener("click", start);
    var f = setupView.querySelector("input:checked") || setupView.querySelector("a,button"); if (f) f.focus();
  }

  /* ----- errores ----- */
  function setupErrores(state, today) {
    var total = Stats.errorIds(state, "todas").length;
    if (total === 0) {
      setupView.innerHTML = empty("🌱", "Aún no tienes errores registrados",
        "Cuando falles una pregunta en cualquier práctica, aparecerá aquí para que la repases hasta dominarla.",
        '<a class="btn btn-primary" href="estudio.html?modo=rapida">⏱️ Practicar unos minutos</a><a class="btn btn-secondary" href="index.html">Volver</a>');
      return;
    }
    var pend = Stats.errorIds(state, "pendientes").length;
    var pre = UI.param("cat");
    if (!C.catByKey[pre] || Stats.errorIds(state, pre).length === 0) pre = pend > 0 ? "pendientes" : "todas";
    var opts = [pill("filtro", "todas", "Todas las falladas (" + total + ")", pre === "todas"),
                pill("filtro", "pendientes", "Pendientes de dominar (" + pend + ")", pre === "pendientes", pend === 0)];
    C.categories.forEach(function (c) {
      var n = Stats.errorIds(state, c.key).length;
      opts.push(pill("filtro", c.key, c.icono + " " + c.nombre + " (" + n + ")", pre === c.key, n === 0));
    });
    setupView.innerHTML =
      "<h2>¿Qué quieres repasar?</h2>" +
      '<p class="hint">Una pregunta se considera <strong>dominada</strong> tras ' + C.srs.masteryStreak + " aciertos independientes en días distintos, sin ayuda. Si la vuelves a fallar, regresa a la lista.</p>" +
      '<fieldset class="group"><legend>Filtro</legend><div class="pills">' + opts.join("") + "</div>" + UI.espHint() + "</fieldset>" +
      '<fieldset class="group"><legend>Cantidad</legend><div class="pills">' +
      pill("cant", "10", "10", true) + pill("cant", "20", "20", false) + pill("cant", "0", "Todas", false) + "</div></fieldset>" +
      '<p class="hint" id="estimate"></p><button type="button" class="btn btn-primary big" id="goBtn">▶ Empezar repaso</button>';
    var upd = function () {
      var n = Stats.errorIds(state, val("filtro")).length, c = +val("cant");
      var m = c > 0 ? Math.min(c, n) : n;
      $("#estimate").textContent = m + " " + U.plural(m, "pregunta", "preguntas") + " · aprox. " + Stats.estimateMinutes(state, m) + " min";
    };
    setupView.addEventListener("change", upd); upd();
  }

  /* ----- hoy ----- */
  function setupHoy(state, today) {
    var due = Stats.dueIds(state, C.catKeys, today);
    if (due.length === 0) {
      var any = Object.keys(state.q).length > 0;
      setupView.innerHTML = empty("🎉", any ? "¡Estás al día!" : "Todavía no hay repasos programados",
        any ? "No tienes repasos pendientes hoy. Buen trabajo: puedes practicar preguntas nuevas para seguir avanzando."
            : "Los repasos se programan solos cuando respondes preguntas. Empieza con una sesión corta.",
        '<a class="btn btn-primary" href="estudio.html?modo=rapida&min=5">⏱️ Practicar preguntas nuevas</a><a class="btn btn-secondary" href="index.html">Volver</a>');
      return;
    }
    var fails = due.filter(function (id) { return state.q[id].last === "w"; }).length;
    setupView.innerHTML =
      "<h2>Tienes " + due.length + " " + U.plural(due.length, "repaso pendiente", "repasos pendientes") + " hoy</h2>" +
      "<p class=\"hint\">Primero salen las que fallaste (" + fails + ") y las más atrasadas. Las que respondes bien se espacian: 1 · 3 · 7 · 14 días…</p>" +
      '<fieldset class="group"><legend>¿Cuántas quieres hacer ahora?</legend><div class="pills">' +
      (due.length > 10 ? pill("cant", "10", "10", true) : "") +
      (due.length > 20 ? pill("cant", "20", "20", false) : "") +
      pill("cant", "0", "Todas (" + due.length + ")", due.length <= 10) + "</div></fieldset>" +
      '<p class="hint" id="estimate"></p><button type="button" class="btn btn-primary big" id="goBtn">▶ Empezar repasos</button>';
    var upd = function () {
      var c = +val("cant"), m = c > 0 ? Math.min(c, due.length) : due.length;
      $("#estimate").textContent = m + " " + U.plural(m, "pregunta", "preguntas") + " · aprox. " + Stats.estimateMinutes(state, m) + " min";
    };
    setupView.addEventListener("change", upd); upd();
  }

  /* ----- rápida ----- */
  function setupRapida(state, today) {
    var preMin = +UI.param("min");
    var cats = C.categories.map(function (c) { return checkPill("cats", c.key, c.icono + " " + c.nombre, true); }).join("");
    var timeOpts = C.session.timeOptions.map(function (m, k) { return pill("lim", m, m + " min", preMin ? m === preMin : k === 0); }).join("");
    var cntOpts = C.session.countOptions.map(function (n) { return pill("lim", "n" + n, n + " preguntas", false); }).join("");
    setupView.innerHTML =
      "<h2>Practica unos minutos</h2>" +
      '<fieldset class="group"><legend>Duración</legend>' +
      '<p class="sub">Por tiempo — termina al acabarse el tiempo (conserva lo respondido)</p><div class="pills">' + timeOpts + "</div>" +
      '<p class="sub">Por número de preguntas — termina al responderlas todas</p><div class="pills">' + cntOpts + "</div></fieldset>" +
      '<fieldset class="group"><legend>Categorías</legend><div class="pills">' + cats + "</div>" + UI.espHint() + "</fieldset>" +
      '<p class="hint">Se priorizan tus repasos pendientes, luego las preguntas que aún no has visto. No se repite ninguna dentro de la sesión.</p>' +
      '<p class="hint" id="estimate"></p><button type="button" class="btn btn-primary big" id="goBtn">▶ Empezar</button>';
    var upd = function () {
      var l = val("lim"), go = $("#goBtn"), cs = vals("cats"), spq = Stats.secondsPerQuestion(state);
      go.disabled = cs.length === 0;
      if (!l) return;
      $("#estimate").textContent = cs.length === 0 ? "Elige al menos una categoría."
        : (l.charAt(0) === "n" ? "Aprox. " + Stats.estimateMinutes(state, +l.slice(1)) + " min"
                               : "Aprox. " + Math.round((+l * 60) / spq) + " preguntas en " + l + " min");
    };
    setupView.addEventListener("change", upd); upd();
  }

  /* ============================================================
     ARRANQUE
     ============================================================ */
  function start() {
    var state = Store.get(), today = U.today(), ids = [], cats = C.catKeys.slice(), mode = "preguntas", limitSec = 0, target = 0;
    if (modo === "errores") {
      var f = val("filtro"), c = +val("cant");
      ids = Stats.errorIds(state, f);
      // pendientes primero y dentro de cada grupo orden aleatorio estable
      ids = U.shuffle(ids.filter(function (id) { return !state.q[id].mastered; })).concat(U.shuffle(ids.filter(function (id) { return state.q[id].mastered; })));
      if (c > 0) ids = ids.slice(0, c);
      cats = C.catKeys.filter(function (k) { return ids.some(function (id) { return id.indexOf(k + "-") === 0; }); });
    } else if (modo === "hoy") {
      ids = Stats.dueIds(state, C.catKeys, today);
      var c2 = +val("cant"); if (c2 > 0) ids = ids.slice(0, c2);
    } else {
      cats = vals("cats"); var l = val("lim");
      if (l.charAt(0) === "n") { target = +l.slice(1); ids = Stats.buildQueue(state, cats, target, today); }
      else { mode = "tiempo"; limitSec = +l * 60; target = +l; ids = Stats.buildQueue(state, cats, 400, today); }
    }
    if (!ids.length) { UI.toast("No hay preguntas disponibles con esa selección.", "warn"); return; }
    sess = {
      kind: "estudio", id: U.uid("ses"), modo: modo, type: MODOS[modo].tipo, mode: mode, cats: cats, ids: ids,
      idx: 0, answered: 0, correct: 0, wrong: [], xp: 0, elapsed: 0, limitSec: limitSec, target: target,
      startedAt: U.nowISO(), timeUp: false
    };
    beginSession();
  }

  function beginSession() {
    sess.t0 = Date.now() - sess.elapsed * 1000;
    if (sess.timeUp && sess.answeredCurrent) { endSession("completada"); return; }
    setupView.hidden = true; summaryView.hidden = true; sessionView.hidden = false;
    finishing = false;
    elTimer.hidden = sess.mode !== "tiempo";
    elPunt.textContent = "Aciertos: " + sess.correct;
    elXp.textContent = "+" + sess.xp + " XP";
    if (tickId) clearInterval(tickId);
    tickId = setInterval(tick, 500);
    tick();
    showQuestion();
  }

  function elapsedNow() { return Math.floor((Date.now() - sess.t0) / 1000); }

  function tick() {
    if (!sess || finishing) return;
    sess.elapsed = elapsedNow();
    if (sess.mode !== "tiempo") return;
    var left = Math.max(0, sess.limitSec - sess.elapsed);
    elTimer.textContent = "⏱ " + U.fmtClock(left);
    elTimer.classList.toggle("low", left <= 30);
    if (left <= 0 && !sess.timeUp) {
      sess.timeUp = true;
      elBanner.hidden = false;
      elBanner.textContent = "⏱ Se acabó el tiempo. " + (answeredCurrent ? "Pulsa «Ver resumen»." : "Responde esta última pregunta y verás tu resumen.");
      if (answeredCurrent) nextBtn.textContent = "Ver resumen";
    }
  }

  /* ============================================================
     PREGUNTA
     ============================================================ */
  var answeredCurrent = false;

  function currentQ() { var info = Stats.find(sess.ids[sess.idx]); return info ? info.q : null; }

  function showQuestion() {
    // salta ids que ya no existan en el banco (nunca se inventan preguntas)
    while (sess.idx < sess.ids.length && !Stats.find(sess.ids[sess.idx])) sess.idx++;
    if (sess.idx >= sess.ids.length) { return endSession("completada"); }
    var q = currentQ(), info = Stats.find(sess.ids[sess.idx]);
    var st = Store.get().q[q.id], today = U.today();
    answeredCurrent = false;
    var total = sess.ids.length;
    elProg.textContent = sess.mode === "tiempo" ? "Pregunta " + (sess.answered + 1) : "Pregunta " + (sess.idx + 1) + " de " + total;
    elBarra.style.width = (sess.mode === "tiempo"
      ? U.clamp((sess.elapsed / sess.limitSec) * 100, 0, 100)
      : (sess.idx / total) * 100) + "%";
    $("#qcat").textContent = UI.catIcon(info.cat) + " " + UI.catName(info.cat);
    var label = { nueva: "Nueva", pendiente: "Repaso pendiente", fallada: "Fallada", aprendiendo: "En aprendizaje", dominada: "Dominada" }[S.status(st, today)];
    $("#qstate").textContent = label;
    elPreg.textContent = q.pregunta;
    botones.forEach(function (b, k) { b.textContent = q.opciones[k]; b.classList.remove("correcta", "incorrecta"); b.disabled = false; });
    elFb.textContent = ""; elFb.className = "feedback";
    elExp.hidden = true; elExp.innerHTML = "";
    expBtn.hidden = true; expBtn.textContent = "📖 Ver explicación y fuente";
    nextBtn.disabled = true;
    nextBtn.textContent = sess.timeUp ? "Ver resumen" : (sess.mode === "preguntas" && sess.idx + 1 >= total ? "Ver resumen" : "Siguiente");
    shownAt = Date.now();
    if (sess.timeUp) { elBanner.hidden = false; elBanner.textContent = "⏱ Se acabó el tiempo. Responde esta última pregunta y verás tu resumen."; }
    else elBanner.hidden = true;
    saveActive();
  }

  function answer(k) {
    if (answeredCurrent || !sess || finishing) return;
    answeredCurrent = true;
    var q = currentQ(), ok = k === q.correcta;
    var secs = Math.round((Date.now() - shownAt) / 1000);
    botones.forEach(function (b) { b.disabled = true; });
    botones[k].classList.add(ok ? "correcta" : "incorrecta");
    if (!ok) { botones[q.correcta].classList.add("correcta"); sess.wrong.push(q.id); }
    elFb.textContent = ok ? "✓ ¡Correcto!" : "✕ Incorrecto. La respuesta correcta es la " + UI.optionLetter(q.correcta) + ".";
    elFb.className = "feedback " + (ok ? "ok" : "bad");
    sess.answered++; if (ok) sess.correct++;
    elPunt.textContent = "Aciertos: " + sess.correct;
    var res = Engine.answer({ id: q.id, result: ok ? "correct" : "wrong", mode: "review", assisted: false, seconds: secs });
    sess.xp += res.xp; elXp.textContent = "+" + sess.xp + " XP";
    UI.celebrate(res);
    expBtn.hidden = false;
    nextBtn.disabled = false; nextBtn.focus();
    sess.idx++;                       // la respuesta ya está guardada: el índice avanza ahora
    sess.elapsed = elapsedNow();
    if (sess.timeUp) nextBtn.textContent = "Ver resumen";
    saveActive();
  }

  function next() {
    if (!answeredCurrent || finishing) return;
    if (sess.timeUp) { endSession("completada"); return; }
    showQuestion();
  }

  function toggleExp() {
    // la pregunta mostrada ya fue avanzada (idx+1): la actual es idx-1
    var info = Stats.find(sess.ids[sess.idx - 1]);
    if (!info) return;
    if (elExp.hidden) { elExp.innerHTML = UI.explanationHtml(info.q); elExp.hidden = false; expBtn.textContent = "❌ Ocultar explicación"; }
    else { elExp.hidden = true; expBtn.textContent = "📖 Ver explicación y fuente"; }
  }

  /* ============================================================
     RESTAURAR / GUARDAR ESTADO ACTIVO
     ============================================================ */
  function saveActive() {
    if (!sess || finishing) return;
    var copy = JSON.parse(JSON.stringify(sess)); delete copy.t0;
    copy.answeredCurrent = answeredCurrent;
    Store.setActive(copy);
  }

  function offerRestore(a) {
    var done = a.answered, total = a.mode === "tiempo" ? "" : " de " + a.ids.length;
    var left = a.mode === "tiempo" ? Math.max(0, a.limitSec - a.elapsed) : null;
    UI.dialog({
      title: "Tienes una sesión sin terminar",
      html: "<p><strong>" + UI.esc(MODOS[a.modo].titulo) + "</strong>: " + done + total + " respondidas" +
            (left !== null ? " · quedan " + U.fmtClock(left) : "") + ".</p>" +
            "<p class='hint'>Lo que ya respondiste está guardado. Si la cierras, se marcará como <em>interrumpida</em> (no suma XP ni medallas).</p>",
      dismissValue: "cerrar",
      actions: [{ label: "Cerrar sesión", value: "cerrar", cls: "btn-secondary" }, { label: "▶ Continuar", value: "seguir", cls: "btn-primary" }]
    }).then(function (v) {
      if (v === "seguir") {
        sess = a; modo = a.modo;
        $("#titulo").textContent = MODOS[modo].titulo;
        // la pregunta sin contestar se vuelve a mostrar; el tiempo "fuera" no cuenta
        beginSession();
      } else {
        Engine.finishSession({ id: a.id, type: a.type, mode: a.mode, cats: a.cats, startedAt: a.startedAt,
          answered: a.answered, correct: a.correct, seconds: a.elapsed, status: "interrumpida", wrong: a.wrong });
        Store.clearActive("estudio");
        renderSetup();
      }
    });
  }

  /* ============================================================
     FIN
     ============================================================ */
  function endSession(status) {
    if (finishing || !sess) return;
    finishing = true;
    if (tickId) { clearInterval(tickId); tickId = null; }
    var secs = Math.max(sess.elapsed, elapsedNow());
    var res = Engine.finishSession({ id: sess.id, type: sess.type, mode: sess.mode, cats: sess.cats, startedAt: sess.startedAt,
      answered: sess.answered, correct: sess.correct, seconds: secs, status: status, wrong: sess.wrong });
    Store.clearActive("estudio");
    var xpTotal = sess.xp + (res.xp || 0);
    UI.celebrate(res);
    renderSummary(status, secs, xpTotal, res);
  }

  function renderSummary(status, secs, xp, res) {
    sessionView.hidden = true; setupView.hidden = true; summaryView.hidden = false;
    var a = sess.answered, c = sess.correct, w = a - c, pct = U.pct(c, a);
    var counted = a >= C.session.minAnswersToCount;
    var titulo = status === "finalizada" ? "Sesión finalizada" : "¡Sesión completada!";
    var failed = sess.wrong.map(function (id) { return Stats.find(id); }).filter(Boolean);
    var failedHtml = failed.length
      ? '<details class="fails"><summary>Ver las ' + failed.length + " que fallaste</summary><ul>" +
        failed.map(function (f) {
          return "<li><strong>" + UI.esc(f.q.pregunta) + '</strong><br><span class="okline">✓ ' + UI.esc(f.q.opciones[f.q.correcta]) + "</span>" +
                 (f.q.fuente ? '<br><small class="muted">📚 ' + UI.esc(f.q.fuente) + "</small>" : "") + "</li>";
        }).join("") + "</ul></details>" : "";
    var next = a === 0 ? "" : (w > 0 ? '<a class="btn btn-secondary" href="estudio.html?modo=errores">🔁 Repasar mis errores</a>' : "");
    summaryView.innerHTML =
      "<h2>" + titulo + "</h2>" +
      '<div class="tiles">' +
      '<div class="tile"><span class="n">' + a + '</span><span class="l">respondidas</span></div>' +
      '<div class="tile ok"><span class="n">' + c + '</span><span class="l">aciertos</span></div>' +
      '<div class="tile bad"><span class="n">' + w + '</span><span class="l">errores</span></div>' +
      '<div class="tile"><span class="n">' + pct + ' %</span><span class="l">de acierto</span></div>' +
      '<div class="tile"><span class="n">' + U.fmtDuration(secs) + '</span><span class="l">tiempo</span></div>' +
      '<div class="tile xp"><span class="n">+' + xp + '</span><span class="l">XP</span></div></div>' +
      (!counted && a > 0 ? '<p class="hint">Con menos de ' + C.session.minAnswersToCount + " respuestas la sesión no suma como completada, pero tus respuestas sí quedaron registradas.</p>" : "") +
      (a === 0 ? '<p class="hint">No respondiste ninguna pregunta.</p>' : "") +
      failedHtml +
      '<div class="btnrow"><a class="btn btn-primary" href="' + location.pathname.split("/").pop() + location.search + '">↻ Otra sesión</a>' + next +
      '<a class="btn btn-secondary" href="index.html">🏠 Centro de estudio</a></div>';
    summaryView.querySelector(".btn").focus();
  }

  /* ============================================================
     EVENTOS (una sola vez)
     ============================================================ */
  botones.forEach(function (b, k) { b.addEventListener("click", function () { answer(k); }); });
  nextBtn.addEventListener("click", next);
  expBtn.addEventListener("click", toggleExp);
  finishBtn.addEventListener("click", function () {
    if (!sess || finishing) return;
    if (sess.answered === 0) {
      UI.confirm("¿Salir sin responder?", "<p>No has respondido ninguna pregunta.</p>", "Salir", true).then(function (ok) {
        if (ok) { finishing = true; if (tickId) clearInterval(tickId); Store.clearActive("estudio"); location.href = "index.html"; }
      });
      return;
    }
    UI.confirm("¿Finalizar la sesión?", "<p>Llevas <strong>" + sess.answered + "</strong> respondidas. Se guardará el resultado con lo que has contestado.</p>", "Finalizar").then(function (ok) {
      if (ok) endSession("finalizada");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (!sess || finishing || e.altKey || e.ctrlKey || e.metaKey || sessionView.hidden) return;
    if (document.querySelector("dialog[open]")) return;
    var k = e.key.toLowerCase();
    if (!answeredCurrent && k.length === 1 && "abcd".indexOf(k) >= 0) { answer("abcd".indexOf(k)); return; }
    var tag = document.activeElement && document.activeElement.tagName;
    var onControl = tag === "BUTTON" || tag === "A" || tag === "SELECT" || tag === "INPUT";
    if (answeredCurrent && ((k === "enter" && !onControl) || k === "arrowright")) { e.preventDefault(); next(); }
  });

  /* ---------- inicio ---------- */
  var active = Store.getActive("estudio");
  if (active && Array.isArray(active.ids) && MODOS[active.modo] && active.idx <= active.ids.length) {
    renderSetup();
    offerRestore(active);
  } else {
    renderSetup();
  }
})();
