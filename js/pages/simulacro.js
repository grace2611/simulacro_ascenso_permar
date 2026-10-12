/*
  Simulacro de examen cronometrado (independiente del modo de aprendizaje).

  Reglas:
   • No se muestra si aciertas ni la explicación hasta que el examen termina.
   • Temporizador basado en la hora límite (no se "congela" al recargar).
   • Termina: voluntariamente (con confirmación) o automáticamente al agotarse el tiempo.
   • Nota = (aciertos − penalización × errores) ÷ preguntas × 20  (penalización configurable, 0 por defecto).
     Las preguntas sin responder cuentan como no acertadas.
   • Estados: completo · finalizado voluntariamente · tiempo agotado · interrumpido.
   • El resultado se guarda UNA vez (id único + protección contra doble clic).
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, UI = P.UI, Engine = P.Engine, Store = P.Store, Stats = P.Stats, Review = P.Review;
  var $ = UI.$;

  var setupView = $("#setupView"), examView = $("#examView"), resultView = $("#resultView");
  var botones = Array.prototype.slice.call(document.querySelectorAll(".opcion"));
  var elTimer = $("#timer"), elCounts = $("#counts"), elBarra = $("#barra"), elLive = $("#live");
  var prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn"), finishBtn = $("#finishBtn"), markChk = $("#markChk"), qgrid = $("#qgrid");

  var ex = null, tickId = null, finishing = false, warned = {};

  /* ---------- preparación ---------- */
  function pill(name, value, label, checked) {
    return '<label class="pill"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
  }
  function val(name) { var e = setupView.querySelector('input[name="' + name + '"]:checked'); return e ? e.value : null; }

  function renderSetup() {
    resultView.hidden = true; examView.hidden = true; setupView.hidden = false;
    var cfg = C.exam;
    var cats = C.categories.map(function (c, k) { return pill("cat", c.key, c.icono + " " + c.nombre, k === 0); }).join("") + pill("cat", "mixto", "🧩 Mixto (las 3)", false);
    var counts = cfg.countOptions.map(function (n) { return pill("n", n, n, n === cfg.defaultCount); }).join("");
    setupView.innerHTML =
      "<h2>Configura tu simulacro</h2>" +
      '<p class="hint">Condiciones de examen: sin ayudas, sin explicaciones y con tiempo límite. Verás todo al terminar.</p>' +
      '<fieldset class="group"><legend>Categoría</legend><div class="pills">' + cats + "</div></fieldset>" +
      '<fieldset class="group"><legend>Cantidad de preguntas</legend><div class="pills">' + counts + "</div></fieldset>" +
      '<div class="field inline"><label for="mins">Tiempo disponible (minutos)</label>' +
      '<input id="mins" type="number" inputmode="numeric" min="' + cfg.minMinutes + '" max="' + cfg.maxMinutes + '" step="1" value="' + cfg.defaultCount * cfg.minutesPerQuestion + '"></div>' +
      '<p class="hint">Cálculo de la nota: <strong>(aciertos' + (cfg.penaltyPerWrong ? " − " + cfg.penaltyPerWrong + " × errores" : "") + ") ÷ preguntas × 20</strong>. " +
      "Las preguntas sin responder cuentan como no acertadas. Es una fórmula propia y configurable, no una regla oficial.</p>" +
      '<p class="hint" id="warn" role="alert"></p>' +
      '<button type="button" class="btn btn-primary big" id="goBtn">▶ Iniciar examen</button>';
    var mins = $("#mins", setupView);
    var userEdited = false;
    mins.addEventListener("input", function () { userEdited = true; });
    setupView.addEventListener("change", function (e) {
      if (e.target.name === "n" && !userEdited) mins.value = +val("n") * cfg.minutesPerQuestion;
    });
    $("#goBtn").addEventListener("click", function () {
      var m = Math.round(+mins.value);
      if (!(m >= cfg.minMinutes && m <= cfg.maxMinutes)) {
        $("#warn").textContent = "El tiempo debe estar entre " + cfg.minMinutes + " y " + cfg.maxMinutes + " minutos.";
        mins.focus(); return;
      }
      start(val("cat"), +val("n"), m);
    });
    $("#goBtn").focus();
  }

  function start(cat, n, minutes) {
    var cats = cat === "mixto" ? C.catKeys.slice() : [cat];
    var pool = Stats.allIds(cats);
    var ids = U.shuffle(pool).slice(0, Math.min(n, pool.length));
    var now = Date.now();
    ex = { kind: "simulacro", id: U.uid("exa"), cat: cat, ids: ids, answers: {}, marks: {}, idx: 0, minutes: minutes,
           startMs: now, deadlineMs: now + minutes * 60000, ts: U.nowISO() };
    warned = {};
    beginExam();
  }

  /* ---------- examen ---------- */
  function beginExam() {
    finishing = false;
    setupView.hidden = true; resultView.hidden = true; examView.hidden = false;
    $("#titulo").textContent = "📝 Simulacro · " + UI.catName(ex.cat);
    $("#backLink").hidden = true;
    buildGrid();
    show();
    if (tickId) clearInterval(tickId);
    tickId = setInterval(tick, 250);
    tick();
  }

  function remaining() { return Math.max(0, Math.ceil((ex.deadlineMs - Date.now()) / 1000)); }

  function tick() {
    if (!ex || finishing) return;
    var left = remaining();
    elTimer.textContent = "⏱ " + U.fmtClock(left);
    elTimer.classList.toggle("low", left <= 60);
    [300, 60].forEach(function (s) {
      if (left <= s && left > 0 && !warned[s]) { warned[s] = true; elLive.textContent = "Quedan " + (s / 60) + " " + (s === 60 ? "minuto" : "minutos"); }
    });
    if (left <= 0) finish("tiempo");
  }

  function currentId() { return ex.ids[ex.idx]; }
  function answeredN() { return Object.keys(ex.answers).length; }

  function buildGrid() {
    qgrid.innerHTML = ex.ids.map(function (id, i) {
      return '<button type="button" class="qn" data-i="' + i + '" aria-label="Pregunta ' + (i + 1) + '">' + (i + 1) + "</button>";
    }).join("");
  }
  function paintGrid() {
    Array.prototype.forEach.call(qgrid.children, function (b, i) {
      var id = ex.ids[i];
      b.classList.toggle("answered", ex.answers[id] !== undefined);
      b.classList.toggle("marked", !!ex.marks[id]);
      b.classList.toggle("current", i === ex.idx);
      var s = "Pregunta " + (i + 1) + (ex.answers[id] !== undefined ? ", respondida" : ", sin responder") + (ex.marks[id] ? ", marcada" : "");
      b.setAttribute("aria-label", s);
      if (i === ex.idx) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
  }

  function show() {
    var id = currentId(), info = Stats.find(id), q = info.q, sel = ex.answers[id];
    $("#qnum").textContent = "Pregunta " + (ex.idx + 1) + " de " + ex.ids.length;
    $("#qcat").textContent = UI.catIcon(info.cat) + " " + UI.catName(info.cat);
    $("#pregunta").textContent = q.pregunta;
    botones.forEach(function (b, k) {
      b.textContent = q.opciones[k];
      b.classList.toggle("selected", sel === k);
      b.setAttribute("aria-pressed", sel === k ? "true" : "false");
    });
    markChk.checked = !!ex.marks[id];
    prevBtn.disabled = ex.idx === 0;
    nextBtn.disabled = ex.idx === ex.ids.length - 1;
    var left = ex.ids.length - answeredN();
    elCounts.innerHTML = "<strong>" + answeredN() + "</strong> respondidas · <strong>" + left + "</strong> sin responder";
    elBarra.style.width = (answeredN() / ex.ids.length) * 100 + "%";
    paintGrid();
    save();
  }

  function select(k) {
    if (finishing) return;
    var id = currentId();
    if (ex.answers[id] === k) delete ex.answers[id]; else ex.answers[id] = k;
    show();
  }
  function go(i) { if (finishing) return; ex.idx = U.clamp(i, 0, ex.ids.length - 1); show(); $("#qbox").scrollIntoView({ block: "nearest" }); }
  function save() { if (!ex || finishing) return; Store.setActive(ex); }

  /* ---------- cálculo del resultado ---------- */
  function compute(reason, interrupted) {
    var total = ex.ids.length, correct = 0, answered = 0, marked = 0;
    var items = ex.ids.map(function (id) {
      var q = Stats.find(id).q, sel = ex.answers[id] === undefined ? -1 : ex.answers[id];
      if (sel >= 0) { answered++; if (sel === q.correcta) correct++; }
      if (ex.marks[id]) marked++;
      return { id: id, sel: sel, mark: !!ex.marks[id] };
    });
    var wrong = answered - correct, unanswered = total - answered;
    var grade = U.clamp(U.grade(correct - C.exam.penaltyPerWrong * wrong, total), 0, C.gradeScale);
    var used = Math.min(ex.minutes * 60, Math.round((Date.now() - ex.startMs) / 1000));
    var status = interrupted ? "interrumpido" : unanswered === 0 ? "completo" : reason === "tiempo" ? "tiempo agotado" : "finalizado voluntariamente";
    return { id: ex.id, cat: ex.cat, ts: ex.ts, minutes: ex.minutes, seconds: used, total: total, answered: answered, correct: correct,
             wrong: wrong, unanswered: unanswered, marked: marked, grade: grade, pct: U.pct(correct, total), status: status, items: items };
  }

  function finish(reason) {
    if (finishing || !ex) return;            // doble clic / tiempo + clic: se ignora
    finishing = true;
    if (tickId) { clearInterval(tickId); tickId = null; }
    var r = compute(reason, false);
    var res = Engine.completeExam(r);
    Store.clearActive("simulacro");
    UI.celebrate(res);
    renderResult(r, res);
  }

  /* ---------- resultado ---------- */
  function recommendations(r) {
    var out = [];
    if (r.unanswered / r.total > 0.15) out.push('Dejaste muchas sin responder: gana ritmo con <a href="estudio.html?modo=rapida&min=10">sesiones cortas por tiempo</a>.');
    if (r.pct < 60) out.push('Refuerza lo fallado con <a href="estudio.html?modo=errores">Repasar mis errores</a> y fija conceptos con las <a href="tarjetas.html">tarjetas de memoria</a>.');
    else if (r.wrong > 0) out.push('Repasa tus errores de este simulacro en <a href="estudio.html?modo=errores">Repasar mis errores</a>.');
    if (r.pct >= 85 && r.unanswered === 0) out.push('¡Muy buen resultado! Mantén el ritmo con <a href="estudio.html?modo=hoy">Repasos de hoy</a>.');
    if (!out.length) out.push('Sigue con <a href="estudio.html?modo=hoy">Repasos de hoy</a> para consolidar lo aprendido.');
    return out;
  }

  function renderResult(r, res) {
    examView.hidden = true; setupView.hidden = true; resultView.hidden = false;
    $("#backLink").hidden = false;
    $("#titulo").textContent = "📝 Resultado del simulacro";
    var ok = r.grade >= C.passGrade;
    resultView.innerHTML =
      '<p class="statuschip ' + (r.status === "completo" ? "ok" : "warn") + '">' + UI.esc(r.status.charAt(0).toUpperCase() + r.status.slice(1)) + "</p>" +
      '<div class="tiles">' +
      '<div class="tile big ' + (ok ? "ok" : "bad") + '"><span class="n">' + U.fmtGrade(r.grade) + '</span><span class="l">nota sobre 20</span></div>' +
      '<div class="tile"><span class="n">' + r.correct + " / " + r.total + '</span><span class="l">puntaje</span></div>' +
      '<div class="tile"><span class="n">' + r.pct + ' %</span><span class="l">de aciertos</span></div>' +
      '<div class="tile ok"><span class="n">' + r.correct + '</span><span class="l">correctas</span></div>' +
      '<div class="tile bad"><span class="n">' + r.wrong + '</span><span class="l">incorrectas</span></div>' +
      '<div class="tile warn"><span class="n">' + r.unanswered + '</span><span class="l">sin responder</span></div>' +
      '<div class="tile"><span class="n">' + U.fmtDuration(r.seconds) + '</span><span class="l">de ' + r.minutes + ' min</span></div>' +
      '<div class="tile xp"><span class="n">+' + (res.xp || 0) + '</span><span class="l">XP</span></div></div>' +
      '<p class="hint">Nota = (aciertos' + (C.exam.penaltyPerWrong ? " − " + C.exam.penaltyPerWrong + " × errores" : "") + ") ÷ " + r.total + " × 20. Las preguntas sin responder no suman.</p>" +
      "<h2>¿Qué estudiar ahora?</h2><ul class=\"plain recs\">" + recommendations(r).map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" +
      '<h2>Revisión de respuestas</h2><div id="review"></div>' +
      '<div class="btnrow"><a class="btn btn-primary" href="simulacro.html">↻ Nuevo simulacro</a>' +
      '<a class="btn btn-secondary" href="progreso.html">📊 Ver progreso</a><a class="btn btn-secondary" href="index.html">🏠 Centro de estudio</a></div>';
    Review.render($("#review", resultView), r.items);
    resultView.querySelector("h2, .tile").scrollIntoView({ block: "start" });
  }

  /* ---------- restauración ---------- */
  function offerRestore(a) {
    var left = Math.max(0, Math.ceil((a.deadlineMs - Date.now()) / 1000));
    if (left <= 0) {                                   // el tiempo se agotó mientras estabas fuera → termina de forma controlada
      ex = a; UI.toast("⏱ El tiempo del simulacro anterior se agotó: aquí está su resultado.", "warn"); finish("tiempo"); return;
    }
    var n = Object.keys(a.answers).length;
    UI.dialog({
      title: "Tienes un simulacro en curso",
      html: "<p>" + UI.esc(UI.catName(a.cat)) + " · " + n + " de " + a.ids.length + " respondidas · quedan <strong>" + U.fmtClock(left) + "</strong>.</p>" +
            "<p class='hint'>El tiempo sigue corriendo aunque la página esté cerrada. Si lo descartas se guardará como <em>interrumpido</em> (sin nota ni XP).</p>",
      dismissValue: "seguir",
      actions: [{ label: "Descartar", value: "descartar", cls: "btn-danger" }, { label: "▶ Continuar", value: "seguir", cls: "btn-primary" }]
    }).then(function (v) {
      if (v === "seguir") { ex = a; beginExam(); }
      else {
        ex = a; finishing = true;
        var r = compute("descartado", true);
        Engine.completeExam(r);
        Store.clearActive("simulacro"); ex = null; finishing = false;
        UI.toast("Simulacro descartado: quedó registrado como interrumpido.");
        renderSetup();
      }
    });
  }

  /* ---------- eventos (una sola vez) ---------- */
  botones.forEach(function (b, k) { b.addEventListener("click", function () { select(k); }); });
  prevBtn.addEventListener("click", function () { go(ex.idx - 1); });
  nextBtn.addEventListener("click", function () { go(ex.idx + 1); });
  markChk.addEventListener("change", function () { var id = currentId(); if (markChk.checked) ex.marks[id] = 1; else delete ex.marks[id]; show(); });
  qgrid.addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (b) go(+b.getAttribute("data-i")); });
  finishBtn.addEventListener("click", function () {
    if (!ex || finishing) return;
    var un = ex.ids.length - answeredN(), mk = Object.keys(ex.marks).length;
    UI.dialog({
      title: "¿Finalizar el examen?",
      html: "<ul class='plain'><li>Respondidas: <strong>" + answeredN() + "</strong> de " + ex.ids.length + "</li>" +
            "<li>Sin responder: <strong>" + un + "</strong>" + (un ? " (contarán como no acertadas)" : "") + "</li>" +
            "<li>Marcadas para revisar: <strong>" + mk + "</strong></li><li>Tiempo restante: <strong>" + U.fmtClock(remaining()) + "</strong></li></ul>",
      dismissValue: "seguir",
      actions: [{ label: "Volver al examen", value: "seguir", cls: "btn-secondary" }, { label: "Finalizar ahora", value: "fin", cls: "btn-primary" }]
    }).then(function (v) { if (v === "fin") finish("voluntario"); });
  });
  document.addEventListener("keydown", function (e) {
    if (!ex || finishing || examView.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector("dialog[open]")) return;
    var t = e.target; if (t && (t.tagName === "INPUT" && t.type === "number")) return;
    var k = e.key.toLowerCase();
    if (k.length === 1 && "abcd".indexOf(k) >= 0) select("abcd".indexOf(k));
    else if (k === "arrowright") go(ex.idx + 1);
    else if (k === "arrowleft") go(ex.idx - 1);
    else if (k === "m") { markChk.checked = !markChk.checked; markChk.dispatchEvent(new Event("change")); }
  });
  window.addEventListener("pagehide", function () { if (ex && !finishing) save(); });

  /* ---------- inicio ---------- */
  var active = Store.getActive("simulacro");
  if (active && Array.isArray(active.ids) && active.ids.length && active.answers) { renderSetup(); offerRestore(active); }
  else renderSetup();
})();
