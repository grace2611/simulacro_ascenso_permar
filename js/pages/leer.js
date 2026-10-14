/*
  Leer preguntas y respuestas: lista de solo lectura del banco completo,
  con la opción correcta resaltada. No escribe nada en el almacenamiento.
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, esc = U.esc;
  var $ = function (s) { return document.querySelector(s); };

  var cats = C.categories;
  var current = "todas";
  try {
    var p = new URLSearchParams(location.search).get("categoria");
    if (p && C.catByKey[p]) current = p;
  } catch (e) {}

  function bank(key) { return (P.DATA && P.DATA[key]) || []; }
  function allItems() {
    var out = [];
    cats.forEach(function (c) { bank(c.key).forEach(function (q, i) { out.push({ q: q, cat: c, n: i + 1 }); }); });
    return out;
  }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function highlight(text, term) {
    var t = esc(text);
    if (!term) return t;
    // resalta sin acentos: se busca sobre el texto normalizado y se mapea por posición
    var n = norm(text), k = norm(term), res = "", i = 0, at;
    if (n.length !== text.length) return t; // normalización cambió longitud: sin resaltado
    while ((at = n.indexOf(k, i)) !== -1) {
      res += esc(text.slice(i, at)) + '<mark class="hl">' + esc(text.slice(at, at + k.length)) + "</mark>";
      i = at + k.length;
    }
    return res + esc(text.slice(i));
  }

  function renderTabs() {
    var total = allItems().length;
    var tabs = [{ key: "todas", label: "Todas", n: total }].concat(cats.map(function (c) {
      return { key: c.key, label: c.icono + " " + c.nombre, n: bank(c.key).length };
    }));
    $("#tabs").innerHTML = tabs.map(function (t) {
      return '<button type="button" class="leer-tab" role="tab" data-k="' + t.key + '" aria-selected="' + (t.key === current) + '">' +
        esc(t.label) + "<small>" + t.n + "</small></button>";
    }).join("");
  }

  function render() {
    var term = $("#buscar").value.trim(), k = norm(term), only = $("#soloResp").checked;
    var items = allItems().filter(function (it) {
      if (current !== "todas" && it.cat.key !== current) return false;
      if (!k) return true;
      return norm(it.q.pregunta + " " + it.q.opciones.join(" ")).indexOf(k) !== -1;
    });
    $("#contador").textContent = items.length + " " + U.plural(items.length, "pregunta", "preguntas") + (term ? " para «" + term + "»" : "");
    if (!items.length) { $("#lista").innerHTML = '<div class="panel glass leer-empty">No hay preguntas que coincidan.</div>'; return; }
    var letters = "ABCD";
    $("#lista").innerHTML = items.map(function (it) {
      var q = it.q;
      var opts = q.opciones.map(function (o, i) {
        var ok = i === q.correcta;
        return '<div class="opcion' + (ok ? " correcta" : "") + (only && !ok ? " oculta" : "") + '" aria-label="Opción ' + letters[i] + (ok ? ", correcta" : "") + '">' +
          "<span>" + highlight(o, term) + "</span></div>";
      }).join("");
      return '<article class="panel glass leer-q"><div class="leer-meta"><span class="leer-num">#' + it.n + '</span><span class="chip">' +
        it.cat.icono + " " + esc(it.cat.nombre) + "</span></div>" +
        '<h2 class="leer-text">' + highlight(q.pregunta, term) + "</h2>" +
        '<div class="opciones">' + opts + "</div>" +
        (q.fuente ? '<p class="leer-src">📚 ' + esc(q.fuente) + "</p>" : "") + "</article>";
    }).join("");
  }

  $("#tabs").addEventListener("click", function (e) {
    var b = e.target.closest(".leer-tab"); if (!b) return;
    current = b.getAttribute("data-k"); renderTabs(); render(); window.scrollTo({ top: 0 });
  });
  var timer;
  $("#buscar").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(render, 150); });
  $("#soloResp").addEventListener("change", render);
  var top = $("#topBtn");
  top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  window.addEventListener("scroll", function () { top.hidden = window.scrollY < 600; }, { passive: true });

  if (P.UI) $("#espHint").innerHTML = P.UI.espHint();
  renderTabs(); render();
})();
