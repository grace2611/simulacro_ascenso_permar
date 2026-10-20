/*
  Práctica clásica por categoría (fases de 25 · 50 · 75 · 100 preguntas).

  Mejoras respecto a la versión anterior (el funcionamiento visible se conserva):
   • Cada FASE se califica con SUS 25 preguntas; el acumulado se muestra aparte.
   • Al terminar las 100 se guarda automáticamente el resultado, una sola vez
     (antes la nota final salía NaN y no se guardaba).
   • El intento se guarda con un id único: terminar, avanzar de fase o pulsar
     varias veces nunca crea registros duplicados (se actualiza el mismo).
   • Cada respuesta se registra en el sistema de aprendizaje (errores, repasos, XP).
   • Aleatorización Fisher–Yates (el anterior sort aleatorio estaba sesgado).
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, UI = P.UI, Engine = P.Engine, Store = P.Store;

  var params = new URLSearchParams(location.search);
  var categoria = params.get("categoria");
  if (P.Access && !P.Access.guard("q")) { return; }                // muestra gratuita agotada → invitación
  if (!categoria || !C.catByKey[categoria] || !P.DATA[categoria]) {
    alert("⚠️ Categoría no válida");
    location.href = "index.html";
    return;
  }

  var PHASES = C.phases;                       // [25, 50, 75, 100]
  var PHASE_SIZE = PHASES[0];
  var preguntas = U.shuffle(P.DATA[categoria]); // sin repetir dentro del intento
  var TOTAL = Math.min(preguntas.length, PHASES[PHASES.length - 1]);

  var i = 0;                                   // índice de la pregunta actual (0..TOTAL-1)
  var respondido = false;
  var modoExplicacion = false;                 // el estado "ver explicación" se mantiene entre preguntas
  var shownAt = Date.now();
  var attemptId = U.uid("quiz");
  var startedISO = U.nowISO();
  var phaseCorrect = PHASES.map(function () { return 0; });
  var phaseAnswered = PHASES.map(function () { return 0; });
  var wrongIds = [];
  var sessionXp = 0;
  var secondsTotal = 0;
  var finished = false;                        // el intento ya terminó (evita doble finalización)
  var ended = false;

  var $ = UI.$;
  var elTitulo = $("#titulo"), elProg = $("#progreso"), elPunt = $("#puntaje"), elXp = $("#xpSesion");
  var elBarra = $("#barra"), elPreg = $("#pregunta"), elFb = $("#feedback");
  var botones = Array.prototype.slice.call(document.querySelectorAll(".opcion"));
  var expBtn = $("#expBtn"), expText = $("#expText"), nextBtn = $("#nextBtn");
  var qView = $("#questionView"), sView = $("#summaryView");

  elTitulo.textContent = C.catByKey[categoria].nombre.toUpperCase();

  /* ---------- cálculos (una sola fuente de verdad) ---------- */
  function phaseOf(idx) { return Math.min(PHASES.length - 1, Math.floor(idx / PHASE_SIZE)); }
  function answeredTotal() { return phaseAnswered.reduce(function (a, b) { return a + b; }, 0); }
  function correctTotal() { return phaseCorrect.reduce(function (a, b) { return a + b; }, 0); }
  function phaseLimit(p) { return Math.min(PHASES[p], TOTAL); }
  function phaseData(p) {
    var t = phaseAnswered[p];
    return { phase: p + 1, correct: phaseCorrect[p], total: t, grade: U.grade(phaseCorrect[p], t) };
  }

  /* ---------- pregunta ---------- */
  function cargar() {
    var p = preguntas[i], ph = phaseOf(i), limite = phaseLimit(ph);
    elPreg.textContent = p.pregunta;
    elProg.textContent = "Pregunta " + (i + 1) + " de " + limite + " · Fase " + (ph + 1);
    elBarra.style.width = ((i + 1) / limite) * 100 + "%";
    botones.forEach(function (b, k) {
      b.textContent = p.opciones[k];
      b.classList.remove("correcta", "incorrecta");
      b.disabled = false;
      b.removeAttribute("aria-label");
    });
    respondido = false;
    elFb.textContent = "";
    nextBtn.disabled = true;
    nextBtn.textContent = (i + 1 === limite) ? "Ver resultado de la fase" : "Siguiente";
    shownAt = Date.now();
    pintarExplicacion();
  }

  function pintarExplicacion() {
    if (modoExplicacion) {
      expText.innerHTML = UI.explanationHtml(preguntas[i]);
      expText.classList.add("show");
      expBtn.textContent = "❌ Ocultar";
    } else {
      expText.classList.remove("show");
      expBtn.textContent = "📖 Ver explicación";
    }
  }

  function responder(index) {
    if (respondido || finished) return;
    respondido = true;
    var p = preguntas[i], ph = phaseOf(i);
    var ok = index === p.correcta;
    var secs = Math.round((Date.now() - shownAt) / 1000);
    secondsTotal += Math.min(secs, C.session.maxSecondsPerAnswer);

    botones.forEach(function (b) { b.disabled = true; });
    if (ok) {
      botones[index].classList.add("correcta");
    } else {
      botones[index].classList.add("incorrecta");
      botones[p.correcta].classList.add("correcta");
      wrongIds.push(p.id);
    }
    elFb.textContent = ok ? "✓ ¡Correcto!" : "✕ Incorrecto. La respuesta correcta es la " + UI.optionLetter(p.correcta) + ".";
    elFb.className = "feedback " + (ok ? "ok" : "bad");

    phaseAnswered[ph]++;
    if (ok) phaseCorrect[ph]++;
    elPunt.textContent = "Puntaje: " + correctTotal();

    // registro en el sistema de aprendizaje (la explicación solo "ayuda" si realmente trae explicación)
    var res = Engine.answer({
      id: p.id, result: ok ? "correct" : "wrong", mode: "practice",
      assisted: !!(modoExplicacion && p.explicacion), seconds: secs
    });
    sessionXp += res.xp;
    elXp.textContent = "+" + sessionXp + " XP";
    UI.celebrate(res);

    nextBtn.disabled = false;
  }

  function siguiente() {
    if (!respondido || finished) { return; }
    var ph = phaseOf(i);
    i++;
    if (i >= phaseLimit(ph)) { resumenFase(ph); return; }
    cargar();
  }

  /* ---------- guardado del intento (siempre el MISMO registro) ---------- */
  function buildAttempt(status, phaseReached) {
    var total = answeredTotal(), correct = correctTotal();
    var phases = [];
    for (var p = 0; p < PHASES.length; p++) if (phaseAnswered[p] > 0) phases.push(phaseData(p));
    return {
      id: attemptId, cat: categoria, correct: correct, total: total, answered: total,
      grade: U.grade(correct, total), phase: phaseReached, when: new Date().toLocaleString(),
      ts: startedISO, status: status, phases: phases, wrong: wrongIds.slice(0, C.limits.wrongPerSession),
      seconds: secondsTotal
    };
  }
  function guardar(status, phaseReached) {
    var att = buildAttempt(status, phaseReached);
    var state = Store.get(), idx = -1;
    state.attempts.forEach(function (a, k) { if (a.id === attemptId) idx = k; });
    var res;
    if (idx >= 0) {                     // ya existe: se ACTUALIZA, no se duplica
      att.counted = state.attempts[idx].counted; att.source = "quiz";
      state.attempts[idx] = att; Store.save();
      res = { xp: 0, newBadges: [], levelUp: null };
    } else {
      res = Engine.saveAttempt(att);
    }
    sessionXp += res.xp || 0;
    UI.celebrate(res);
    return att;
  }

  /* ---------- fin de fase ---------- */
  function resumenFase(ph) {
    var d = phaseData(ph), cum = U.grade(correctTotal(), answeredTotal());
    var first = ph * PHASE_SIZE + 1, last = ph * PHASE_SIZE + phaseAnswered[ph];
    var isLast = ph === PHASES.length - 1 || phaseLimit(ph) >= TOTAL;
    guardar(isLast ? "completo" : "terminado", ph + 1);   // se guarda ya: no se pierde nada si cierras la pestaña
    if (isLast) finished = true;

    qView.hidden = true; sView.hidden = false;
    sView.innerHTML =
      "<h2>✅ Fase " + (ph + 1) + " completada</h2>" +
      '<table class="sumtable"><caption class="sr-only">Resultados de la fase y acumulado</caption>' +
      "<thead><tr><th></th><th>Aciertos</th><th>Nota</th><th>Acierto</th></tr></thead><tbody>" +
      "<tr><th scope='row'>Esta fase (preguntas " + first + "–" + last + ")</th><td>" + d.correct + " / " + d.total + "</td><td>" + U.fmtGrade(d.grade) + " / 20</td><td>" + U.pct(d.correct, d.total) + " %</td></tr>" +
      "<tr><th scope='row'>Acumulado (" + answeredTotal() + " preguntas)</th><td>" + correctTotal() + " / " + answeredTotal() + "</td><td>" + U.fmtGrade(cum) + " / 20</td><td>" + U.pct(correctTotal(), answeredTotal()) + " %</td></tr>" +
      "</tbody></table>" +
      '<p class="hint">Nota = (aciertos ÷ preguntas) × 20, sin descuento por errores.</p>' +
      '<div class="btnrow">' +
      (isLast ? "" : '<button type="button" class="btn btn-primary" id="goOn">➡ Continuar con la fase ' + (ph + 2) + "</button>") +
      (isLast ? '<button type="button" class="btn btn-primary" id="goFinal">🎉 Ver resultado final</button>'
              : '<button type="button" class="btn btn-secondary" id="goEnd">⏹ Terminar aquí</button>') +
      "</div>";
    var on = $("#goOn"), en = $("#goEnd"), fi = $("#goFinal");
    if (on) on.addEventListener("click", function () { sView.hidden = true; qView.hidden = false; cargar(); });
    if (en) en.addEventListener("click", function () { terminarAqui(ph + 1, "terminado"); });
    if (fi) fi.addEventListener("click", function () { mostrarFinal(ph + 1, "completo"); });
    sView.querySelector(".btn").focus();
  }

  function terminarAqui(phaseReached, status) {
    if (ended) return;
    ended = true; finished = true;
    guardar(status, phaseReached);
    mostrarFinal(phaseReached, status);
  }

  /* ---------- resultado final ---------- */
  function mostrarFinal(phaseReached, status) {
    ended = true; finished = true;
    qView.hidden = true; sView.hidden = false;
    var total = answeredTotal(), correct = correctTotal();
    var label = status === "completo" ? "🎉 Intento completo" : status === "parcial" ? "📝 Intento parcial" : "🎉 Resultado final";
    var rows = "";
    for (var p = 0; p < PHASES.length; p++) {
      if (!phaseAnswered[p]) continue;
      var d = phaseData(p);
      rows += "<tr><th scope='row'>Fase " + d.phase + "</th><td>" + d.correct + " / " + d.total + "</td><td>" + U.fmtGrade(d.grade) + " / 20</td></tr>";
    }
    sView.innerHTML =
      "<h2>" + label + "</h2>" +
      "<p>Fase alcanzada: <strong>" + phaseReached + "</strong></p>" +
      "<p>Puntaje acumulado: <strong>" + correct + " / " + total + "</strong></p>" +
      "<p>Nota acumulada: <strong>" + U.fmtGrade(U.grade(correct, total)) + " / 20</strong></p>" +
      (rows ? '<table class="sumtable"><caption>Resultado por fase</caption><thead><tr><th></th><th>Aciertos</th><th>Nota</th></tr></thead><tbody>' + rows + "</tbody></table>" : "") +
      '<p class="chip-xp big">+' + sessionXp + " XP en esta práctica</p>" +
      '<div class="btnrow">' +
      '<a class="btn btn-primary" href="index.html">🏠 Centro de estudio</a>' +
      '<a class="btn btn-secondary" href="progreso.html">📊 Ver progreso</a>' +
      (wrongIds.length ? '<a class="btn btn-secondary" href="estudio.html?modo=errores&cat=' + categoria + '">🔁 Repasar mis errores</a>' : "") +
      '<a class="btn btn-secondary" href="quiz.html?categoria=' + categoria + '">↻ Practicar de nuevo</a>' +
      "</div>";
    sView.querySelector(".btn").focus();
  }

  /* ---------- salir ---------- */
  function salir() {
    if (finished) { location.href = "index.html"; return; }
    var n = answeredTotal();
    if (n === 0) { location.href = "index.html"; return; }
    var actions = [{ label: "Seguir practicando", value: "seguir", cls: "btn-primary" }];
    if (n >= C.session.minAnswersToCount) actions.push({ label: "Terminar y guardar (" + n + ")", value: "guardar", cls: "btn-secondary" });
    actions.push({ label: "Salir sin guardar el intento", value: "salir", cls: "btn-danger" });
    UI.dialog({
      title: "¿Salir de la práctica?",
      html: "<p>Llevas <strong>" + n + "</strong> preguntas respondidas. Tus aciertos y errores ya quedaron registrados para el repaso.</p>",
      actions: actions, dismissValue: "seguir"
    }).then(function (v) {
      if (v === "salir") { location.href = "index.html"; return; }
      if (v === "guardar") {
        var reached = phaseOf(Math.max(0, n - 1)) + 1;
        terminarAqui(reached, sView.hidden ? "parcial" : "terminado");
      }
    });
  }

  /* ---------- eventos (se registran UNA sola vez) ---------- */
  botones.forEach(function (b, k) { b.addEventListener("click", function () { responder(k); }); });
  nextBtn.addEventListener("click", function () {
    if (!respondido) { UI.toast("⚠️ Marca una respuesta primero", "warn"); return; }
    siguiente();
  });
  expBtn.addEventListener("click", function () { modoExplicacion = !modoExplicacion; pintarExplicacion(); });
  $("#exitBtn").addEventListener("click", salir);
  document.addEventListener("keydown", function (e) {
    if (finished || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector("dialog[open]") || !sView.hidden) return;
    var k = e.key.toLowerCase();
    if (!respondido && k.length === 1 && "abcd".indexOf(k) >= 0) { responder("abcd".indexOf(k)); return; }
    var tag = document.activeElement && document.activeElement.tagName;
    var onControl = tag === "BUTTON" || tag === "A" || tag === "SELECT" || tag === "INPUT";
    if (respondido && ((k === "enter" && !onControl) || k === "arrowright")) { e.preventDefault(); siguiente(); }
  });

  cargar();
})();
