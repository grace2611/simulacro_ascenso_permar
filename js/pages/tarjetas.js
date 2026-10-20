/*
  Tarjetas de memoria.
  Frente: la pregunta + categoría. Reverso: la opción correcta TAL COMO está en el banco
  (nunca se inventa ni se resume una respuesta). Solo se puede evaluar después de revelar.
    Lo recordé    → acierto independiente (avanza el calendario de repaso)
    Tuve dudas    → se repite mañana, sin subir de paso
    No lo recordé → vuelve a la lista de errores y vence hoy
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, UI = P.UI, Engine = P.Engine, Store = P.Store, Stats = P.Stats;
  var $ = UI.$;

  var setupView = $("#setupView"), sessionView = $("#sessionView"), summaryView = $("#summaryView");
  var flash = $("#flash"), elLive = $("#live"), expBtn = $("#expBtn"), expText = $("#expText");
  var revealBtn = $("#revealBtn"), prevBtn = $("#prevBtn"), finishBtn = $("#finishBtn");
  var rateBtns = Array.prototype.slice.call(document.querySelectorAll(".rate"));
  var RLABEL = { r: "Lo recordé", d: "Tuve dudas", n: "No lo recordé" };

  var sess = null, flipped = false, shownAt = 0, view = null, finishing = false;
  // view: null = tarjeta actual sin evaluar · número = posición de una tarjeta ya evaluada que se está revisando

  /* ---------- preparación ---------- */
  function pill(name, value, label, checked) {
    return '<label class="pill"><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? " checked" : "") + "><span>" + label + "</span></label>";
  }
  function val(name) { var e = setupView.querySelector('input[name="' + name + '"]:checked'); return e ? e.value : null; }

  function renderSetup() {
    if (P.Access && !P.Access.guard("cards")) return;
    var state = Store.get(), today = U.today();
    sessionView.hidden = true; summaryView.hidden = true; setupView.hidden = false;
    var ov = Stats.overview(state, today);
    var pre = UI.param("cat"); if (!C.catByKey[pre]) pre = "todas";
    var cats = pill("cat", "todas", "🧩 Todas", pre === "todas") + C.categories.map(function (c) {
      var st = ov.cats.filter(function (x) { return x.cat === c.key; })[0];
      return pill("cat", c.key, c.icono + " " + c.nombre + (st && st.due ? " · " + st.due + " pend." : ""), pre === c.key);
    }).join("");
    setupView.innerHTML =
      "<h2>Aprende con tarjetas</h2>" +
      '<p class="hint">Lee la pregunta, intenta recordar la respuesta, revélala y dinos cómo te fue. ' +
      (ov.due > 0 ? "Tienes <strong>" + ov.due + "</strong> repasos pendientes: saldrán primero." : "Saldrán primero tus pendientes, luego las preguntas nuevas.") + "</p>" +
      '<fieldset class="group"><legend>Categoría</legend><div class="pills">' + cats + "</div>" + UI.espHint() + "</fieldset>" +
      '<fieldset class="group"><legend>Cantidad de tarjetas</legend><div class="pills">' +
      pill("n", "10", "10", true) + pill("n", "20", "20", false) + pill("n", "30", "30", false) + "</div></fieldset>" +
      '<p class="hint" id="estimate"></p><button type="button" class="btn btn-primary big" id="goBtn">▶ Empezar</button>';
    var upd = function () { var n = +val("n"); $("#estimate").textContent = "Aprox. " + Stats.estimateMinutes(state, n) + " min"; };
    setupView.addEventListener("change", upd); upd();
    $("#goBtn").addEventListener("click", start);
    $("#goBtn").focus();
  }

  function start() {
    var state = Store.get(), c = val("cat"), n = +val("n");
    if (P.Access && !P.Access.guard("cards")) return;
    var cats = c === "todas" ? C.catKeys.slice() : [c];
    var ids = Stats.buildQueue(state, cats, n, U.today());
    if (!ids.length) { UI.toast("No hay preguntas disponibles.", "warn"); return; }
    sess = { kind: "tarjetas", id: U.uid("tar"), type: "tarjetas", cats: cats, ids: ids, idx: 0, ratings: {}, secs: {},
             xp: 0, startedAt: U.nowISO(), elapsed: 0 };
    begin();
  }

  function begin() {
    finishing = false;
    sess.t0 = Date.now() - sess.elapsed * 1000;
    setupView.hidden = true; summaryView.hidden = true; sessionView.hidden = false;
    $("#xpSesion").textContent = "+" + sess.xp + " XP";
    show();
  }
  function ratedCount() { return Object.keys(sess.ratings).length; }

  /* ---------- tarjeta ---------- */
  function setFlipped(f) {
    flipped = f;
    flash.setAttribute("aria-pressed", f ? "true" : "false");
    flash.dataset.flipped = f ? "true" : "false";
    var back = flash.querySelector(".back"), front = flash.querySelector(".front");
    back.setAttribute("aria-hidden", f ? "false" : "true");
    front.setAttribute("aria-hidden", f ? "true" : "false");
  }

  function show() {
    var total = sess.ids.length, pos = view !== null ? view : sess.idx;
    if (view === null && sess.idx >= total) { return end("completada"); }
    var id = sess.ids[pos], info = Stats.find(id);
    if (!info) { if (view === null) { sess.idx++; return show(); } return; }
    var q = info.q, done = ratedCount();
    $("#progreso").textContent = "Tarjeta " + (pos + 1) + " de " + total;
    $("#contador").textContent = "Estudiadas: " + done + " · Pendientes: " + (total - done);
    $("#barra").style.width = (done / total) * 100 + "%";
    $("#fcat").textContent = UI.catIcon(info.cat) + " " + UI.catName(info.cat);
    $("#fq").textContent = q.pregunta;
    $("#fa").textContent = q.opciones[q.correcta];
    var already = sess.ratings[id];
    expText.hidden = true; expBtn.textContent = "📖 Explicación y fuente";
    prevBtn.disabled = pos <= 0;
    if (already) {                       // revisando una tarjeta ya evaluada (solo lectura)
      setFlipped(true);
      $("#fstate").textContent = "Tu evaluación: " + RLABEL[already];
      rateBtns.forEach(function (b) { b.disabled = true; });
      revealBtn.textContent = "→ Volver a la actual"; revealBtn.disabled = false; revealBtn.dataset.mode = "back";
      expBtn.hidden = false;
    } else {
      setFlipped(false);
      $("#fstate").textContent = "";
      rateBtns.forEach(function (b) { b.disabled = true; });          // no se puede evaluar sin revelar
      revealBtn.textContent = "👁 Revelar respuesta"; revealBtn.disabled = false; revealBtn.dataset.mode = "reveal";
      expBtn.hidden = true;
      shownAt = Date.now();
    }
    saveActive();
  }

  function reveal() {
    if (view !== null || flipped) return;
    setFlipped(true);
    var info = Stats.find(sess.ids[sess.idx]);
    elLive.textContent = "Respuesta: " + info.q.opciones[info.q.correcta];
    rateBtns.forEach(function (b) { b.disabled = false; });
    revealBtn.disabled = true; expBtn.hidden = false;
    rateBtns[0].focus();
  }

  function rate(r) {
    if (view !== null || !flipped || finishing) return;       // imposible evaluar antes de revelar
    var id = sess.ids[sess.idx];
    if (sess.ratings[id]) return;                              // una evaluación por tarjeta
    sess.ratings[id] = r;
    var secs = Math.round((Date.now() - shownAt) / 1000); sess.secs[id] = secs;
    var res = Engine.answer({ id: id, result: r === "r" ? "correct" : r === "d" ? "doubt" : "wrong", mode: "card", assisted: false, seconds: secs });
    sess.xp += res.xp; $("#xpSesion").textContent = "+" + sess.xp + " XP";
    UI.celebrate(res);
    sess.idx++;
    sess.elapsed = Math.floor((Date.now() - sess.t0) / 1000);
    show();
    if (sess.idx < sess.ids.length) flash.focus();
  }

  function goPrev() {
    var pos = view !== null ? view : sess.idx;
    if (pos <= 0) return;
    view = pos - 1; show();
  }
  function backToCurrent() { view = null; show(); }

  function toggleExp() {
    var pos = view !== null ? view : sess.idx, info = Stats.find(sess.ids[pos]);
    if (!info) return;
    if (expText.hidden) { expText.innerHTML = UI.explanationHtml(info.q); expText.hidden = false; expBtn.textContent = "❌ Ocultar"; }
    else { expText.hidden = true; expBtn.textContent = "📖 Explicación y fuente"; }
  }

  /* ---------- guardado / restauración ---------- */
  function saveActive() {
    if (!sess || finishing) return;
    var copy = JSON.parse(JSON.stringify(sess)); delete copy.t0; Store.setActive(copy);
  }
  function offerRestore(a) {
    var done = Object.keys(a.ratings).length;
    UI.dialog({
      title: "Tienes tarjetas sin terminar",
      html: "<p>Evaluaste <strong>" + done + "</strong> de " + a.ids.length + " tarjetas.</p><p class='hint'>Lo evaluado ya está guardado. Si la cierras, se marcará como <em>interrumpida</em>.</p>",
      dismissValue: "cerrar",
      actions: [{ label: "Cerrar sesión", value: "cerrar", cls: "btn-secondary" }, { label: "▶ Continuar", value: "seguir", cls: "btn-primary" }]
    }).then(function (v) {
      if (v === "seguir") { sess = a; view = null; begin(); }
      else {
        var ids = Object.keys(a.ratings);
        Engine.finishSession({ id: a.id, type: "tarjetas", cats: a.cats, startedAt: a.startedAt, answered: ids.length,
          correct: ids.filter(function (i) { return a.ratings[i] === "r"; }).length, seconds: a.elapsed, status: "interrumpida",
          wrong: ids.filter(function (i) { return a.ratings[i] === "n"; }) });
        Store.clearActive("tarjetas"); renderSetup();
      }
    });
  }

  /* ---------- fin ---------- */
  function end(status) {
    if (finishing || !sess) return;
    finishing = true;
    var ids = Object.keys(sess.ratings), r = 0, d = 0, n = 0, wrong = [];
    ids.forEach(function (i) { var v = sess.ratings[i]; if (v === "r") r++; else if (v === "d") d++; else { n++; wrong.push(i); } });
    var secs = Math.max(sess.elapsed, Math.floor((Date.now() - sess.t0) / 1000));
    var res = Engine.finishSession({ id: sess.id, type: "tarjetas", cats: sess.cats, startedAt: sess.startedAt, answered: ids.length,
      correct: r, seconds: secs, status: status, wrong: wrong });
    Store.clearActive("tarjetas");
    UI.celebrate(res);
    var xp = sess.xp + (res.xp || 0), pending = sess.ids.length - ids.length;
    sessionView.hidden = true; summaryView.hidden = false;
    summaryView.innerHTML =
      "<h2>" + (status === "finalizada" ? "Sesión finalizada" : "¡Tarjetas completadas!") + "</h2>" +
      '<div class="tiles">' +
      '<div class="tile"><span class="n">' + ids.length + '</span><span class="l">estudiadas</span></div>' +
      '<div class="tile ok"><span class="n">' + r + '</span><span class="l">las recordé</span></div>' +
      '<div class="tile warn"><span class="n">' + d + '</span><span class="l">con dudas</span></div>' +
      '<div class="tile bad"><span class="n">' + n + '</span><span class="l">no recordé</span></div>' +
      '<div class="tile"><span class="n">' + U.fmtDuration(secs) + '</span><span class="l">tiempo</span></div>' +
      '<div class="tile xp"><span class="n">+' + xp + '</span><span class="l">XP</span></div></div>' +
      (pending > 0 ? '<p class="hint">' + pending + " " + U.plural(pending, "tarjeta quedó", "tarjetas quedaron") + " sin estudiar (siguen pendientes).</p>" : "") +
      (d + n > 0 ? '<p class="hint">Las tarjetas con dudas volverán mañana; las que no recordaste vencen hoy en «Repasos de hoy».</p>' : "") +
      '<div class="btnrow"><a class="btn btn-primary" href="tarjetas.html">↻ Más tarjetas</a>' +
      (n > 0 ? '<a class="btn btn-secondary" href="estudio.html?modo=errores">🔁 Repasar mis errores</a>' : "") +
      '<a class="btn btn-secondary" href="index.html">🏠 Centro de estudio</a></div>';
    summaryView.querySelector(".btn").focus();
  }

  /* ---------- eventos ---------- */
  flash.addEventListener("click", function () { if (view === null && !flipped) reveal(); });
  revealBtn.addEventListener("click", function () { if (revealBtn.dataset.mode === "back") backToCurrent(); else reveal(); });
  prevBtn.addEventListener("click", goPrev);
  expBtn.addEventListener("click", toggleExp);
  rateBtns.forEach(function (b) { b.addEventListener("click", function () { rate(b.getAttribute("data-r")); }); });
  finishBtn.addEventListener("click", function () {
    if (!sess || finishing) return;
    if (ratedCount() === 0) {
      UI.confirm("¿Salir sin estudiar?", "<p>No has evaluado ninguna tarjeta.</p>", "Salir", true).then(function (ok) {
        if (ok) { finishing = true; Store.clearActive("tarjetas"); location.href = "index.html"; }
      });
      return;
    }
    UI.confirm("¿Terminar la sesión?", "<p>Has evaluado <strong>" + ratedCount() + "</strong> de " + sess.ids.length + " tarjetas. Se guardará el resultado.</p>", "Terminar").then(function (ok) { if (ok) end("finalizada"); });
  });
  document.addEventListener("keydown", function (e) {
    if (!sess || finishing || sessionView.hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    if (document.querySelector("dialog[open]")) return;
    var k = e.key;
    if (k === "ArrowLeft") { e.preventDefault(); goPrev(); }
    else if (flipped && view === null && (k === "1" || k === "2" || k === "3")) rate(["r", "d", "n"][+k - 1]);
    else if (!flipped && view === null && (k === " " || k === "Enter") && document.activeElement !== flash && document.activeElement.tagName !== "BUTTON") { e.preventDefault(); reveal(); }
  });

  var active = Store.getActive("tarjetas");
  renderSetup();
  if (active && Array.isArray(active.ids) && active.ratings) offerRestore(active);
})();
