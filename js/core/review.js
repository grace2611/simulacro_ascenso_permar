/*
  Revisión de un simulacro (resultado y detalle en "Mi progreso").
  Muestra cada pregunta con tu respuesta, la correcta, la explicación y la fuente ORIGINALES.
  Se usa icono + texto, no solo color.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var U = P.Util, Stats = P.Stats;

  function status(it, q) {
    if (it.sel < 0) return "sin";
    return it.sel === q.correcta ? "ok" : "mal";
  }

  function itemHtml(it, n) {
    var info = Stats.find(it.id);
    if (!info) return "";
    var q = info.q, st = status(it, q);
    var badge = st === "ok" ? '<span class="rv-badge ok">✓ Correcta</span>'
              : st === "mal" ? '<span class="rv-badge bad">✕ Incorrecta</span>'
              : '<span class="rv-badge none">— Sin responder</span>';
    var opts = q.opciones.map(function (o, k) {
      var cls = "rv-opt", tag = "";
      if (k === q.correcta) { cls += " is-correct"; tag = '<b class="rv-tag ok">✓ Correcta</b>'; }
      if (k === it.sel && k !== q.correcta) { cls += " is-wrong"; tag = '<b class="rv-tag bad">✕ Tu respuesta</b>'; }
      if (k === it.sel && k === q.correcta) tag = '<b class="rv-tag ok">✓ Tu respuesta (correcta)</b>';
      return '<li class="' + cls + '"><span class="rv-l">' + "ABCD".charAt(k) + "</span><span class=\"rv-t\">" + U.esc(o) + "</span>" + tag + "</li>";
    }).join("");
    var exp = "";
    if (q.explicacion) exp += "<strong>📘 Explicación:</strong> " + U.esc(q.explicacion) + "<br>";
    if (q.fuente) exp += "<em>📚 Fuente: " + U.esc(q.fuente) + "</em>";
    return '<li class="rv-item" data-st="' + st + '" data-mark="' + (it.mark ? 1 : 0) + '">' +
      '<div class="rv-head"><span class="rv-n">' + n + "</span>" + badge + (it.mark ? '<span class="rv-badge mark">🚩 Marcada</span>' : "") + "</div>" +
      '<p class="rv-q">' + U.esc(q.pregunta) + "</p><ul class=\"rv-opts\">" + opts + "</ul>" +
      (exp ? '<div class="rv-exp">' + exp + "</div>" : "") + "</li>";
  }

  var Review = {
    // items: [{ id, sel, mark }]
    render: function (el, items) {
      var counts = { todas: items.length, mal: 0, sin: 0, mark: 0 };
      items.forEach(function (it) {
        var info = Stats.find(it.id); if (!info) return;
        var s = status(it, info.q);
        if (s === "mal") counts.mal++; else if (s === "sin") counts.sin++;
        if (it.mark) counts.mark++;
      });
      el.innerHTML =
        '<div class="pills rv-filters" role="group" aria-label="Filtrar revisión">' +
        '<label class="pill"><input type="radio" name="rvf" value="todas" checked><span>Todas (' + counts.todas + ")</span></label>" +
        '<label class="pill"><input type="radio" name="rvf" value="mal"><span>Incorrectas (' + counts.mal + ")</span></label>" +
        '<label class="pill"><input type="radio" name="rvf" value="sin"><span>Sin responder (' + counts.sin + ")</span></label>" +
        '<label class="pill"><input type="radio" name="rvf" value="mark"><span>Marcadas (' + counts.mark + ")</span></label></div>" +
        '<ol class="rv-list">' + items.map(function (it, i) { return itemHtml(it, i + 1); }).join("") + "</ol>" +
        '<p class="empty-note" hidden>No hay preguntas con ese filtro.</p>';
      var list = el.querySelector(".rv-list"), note = el.querySelector(".empty-note");
      el.querySelector(".rv-filters").addEventListener("change", function (e) {
        var f = e.target.value, shown = 0;
        Array.prototype.forEach.call(list.children, function (li) {
          var ok = f === "todas" || (f === "mark" ? li.getAttribute("data-mark") === "1" : li.getAttribute("data-st") === f);
          li.hidden = !ok; if (ok) shown++;
        });
        note.hidden = shown !== 0;
      });
    }
  };

  P.Review = Review;
})(typeof window !== "undefined" ? window : globalThis);
