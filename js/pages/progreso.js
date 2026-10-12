/*
  Mi progreso: panel de estadísticas, gráficos (SVG responsivos, claro/oscuro) e historial.
  Distingue: último intento · rendimiento histórico · preguntas únicas · respuestas totales · dominio.
*/
(function () {
  "use strict";
  var P = window.PERMAR, C = P.CONFIG, U = P.Util, UI = P.UI, G = P.Gamify, Stats = P.Stats, Store = P.Store, Review = P.Review;
  var $ = UI.$, esc = U.esc;
  var SHOWN = 30, listCache = [];

  /* ---------- gráficos ---------- */
  var SHAPES = {
    cat1: function (x, y, cls, t) { return '<circle class="' + cls + '" cx="' + x + '" cy="' + y + '" r="5"><title>' + t + "</title></circle>"; },
    cat2: function (x, y, cls, t) { return '<rect class="' + cls + '" x="' + (x - 5) + '" y="' + (y - 5) + '" width="10" height="10"><title>' + t + "</title></rect>"; },
    cat3: function (x, y, cls, t) { return '<polygon class="' + cls + '" points="' + x + "," + (y - 6.5) + " " + (x + 6) + "," + (y + 4.5) + " " + (x - 6) + "," + (y + 4.5) + '"><title>' + t + "</title></polygon>"; }
  };
  function shapeIcon(i) {
    var k = "cat" + (i + 1);
    return '<svg viewBox="0 0 16 16" aria-hidden="true" class="' + "c" + (i + 1) + '">' + SHAPES[k](8, 8, "c" + (i + 1), "").replace("<title></title>", "") + "</svg>";
  }

  function lineChart(series) {
    var W = 640, H = 300, L = 40, R = 18, T = 16, B = 44, pw = W - L - R, ph = H - T - B;
    var maxN = 0; C.catKeys.forEach(function (k) { maxN = Math.max(maxN, series[k].length); });
    var xs = function (i) { return maxN <= 1 ? L + pw / 2 : L + (pw * i) / (maxN - 1); };
    var ys = function (g) { return T + ph - (ph * g) / C.gradeScale; };
    var g = "";
    [0, 5, 10, 15, 20].forEach(function (v) {
      g += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(v) + '" y2="' + ys(v) + '"/><text class="axis-text" x="' + (L - 8) + '" y="' + (ys(v) + 4) + '" text-anchor="end">' + v + "</text>";
    });
    g += '<line class="pass-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + ys(C.passGrade) + '" y2="' + ys(C.passGrade) + '"/>' +
         '<text class="axis-text" x="' + (W - R) + '" y="' + (ys(C.passGrade) - 5) + '" text-anchor="end">' + C.passGrade + " (aprobado)</text>";
    for (var i = 0; i < maxN; i++) g += '<text class="axis-text" x="' + xs(i) + '" y="' + (H - 22) + '" text-anchor="middle">' + (i + 1) + "</text>";
    g += '<text class="axis-text" x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Nº de intento / simulacro (por categoría)</text>';
    C.catKeys.forEach(function (k, ci) {
      var pts = series[k]; if (!pts.length) return;
      var cls = "c" + (ci + 1);
      g += '<polyline class="line ' + cls + '" points="' + pts.map(function (p, i) { return xs(i) + "," + ys(p.grade); }).join(" ") + '"/>';
      pts.forEach(function (p, i) {
        g += SHAPES["cat" + (ci + 1)](xs(i), ys(p.grade), cls, esc(C.catByKey[k].nombre + " · " + p.kind + " " + (i + 1) + ": " + U.fmtGrade(p.grade) + "/20"));
      });
    });
    var legend = '<div class="chart-legend">' + C.categories.map(function (c, i) {
      return '<span class="c' + (i + 1) + '">' + shapeIcon(i) + '<span style="color:var(--text-primary)">' + esc(c.nombre) + "</span></span>";
    }).join("") + '<span><svg viewBox="0 0 16 16" aria-hidden="true"><line class="pass-line" x1="0" x2="16" y1="8" y2="8"/></svg>Nota mínima ' + C.passGrade + "</span></div>";
    var rows = "";
    C.catKeys.forEach(function (k) { series[k].forEach(function (p, i) {
      rows += "<tr><td>" + esc(C.catByKey[k].nombre) + "</td><td>" + (i + 1) + "</td><td>" + esc(p.kind) + "</td><td>" + p.total + "</td><td>" + U.fmtGrade(p.grade) + "</td></tr>";
    }); });
    var summary = C.catKeys.map(function (k) {
      var s = series[k]; return s.length ? C.catByKey[k].nombre + ": " + s.length + " registros, última nota " + U.fmtGrade(s[s.length - 1].grade) : null;
    }).filter(Boolean).join(". ");
    return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Gráfico de líneas con la evolución de tus notas sobre 20. ' + esc(summary) + '">' + g + "</svg>" + legend + "</div>" +
      '<details class="datatable"><summary>Ver los datos del gráfico</summary><div class="tablewrap"><table class="data"><thead><tr><th>Categoría</th><th>Nº</th><th>Tipo</th><th>Preguntas</th><th>Nota /20</th></tr></thead><tbody>' + rows + "</tbody></table></div></details>";
  }

  function barChart(items, opts) {
    var W = 640, H = 240, L = 40, R = 12, T = 22, B = 40, pw = W - L - R, ph = H - T - B;
    var max = opts.max || Math.max(1, Math.max.apply(null, items.map(function (i) { return i.v || 0; })));
    var step = pw / items.length, bw = Math.min(54, step * 0.62);
    var g = "";
    var ticks = opts.ticks || [0, max / 2, max];
    ticks.forEach(function (v) {
      var y = T + ph - (ph * v) / max;
      g += '<line class="grid-line" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="axis-text" x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + Math.round(v) + "</text>";
    });
    items.forEach(function (it, i) {
      var cx = L + step * i + step / 2;
      if (it.v !== null && it.v !== undefined) {
        var h = (ph * it.v) / max, y = T + ph - h;
        g += '<rect class="bar-c" x="' + (cx - bw / 2) + '" y="' + y + '" width="' + bw + '" height="' + Math.max(0, h) + '" rx="4"><title>' + esc(it.title) + "</title></rect>";
        if (it.v > 0 || opts.zeros) g += '<text class="val-text" x="' + cx + '" y="' + (y - 5) + '" text-anchor="middle">' + esc(it.label) + "</text>";
      } else {
        g += '<text class="axis-text" x="' + cx + '" y="' + (T + ph - 6) + '" text-anchor="middle">—</text>';
      }
      if (!opts.sparseLabels || i % 2 === 0 || i === items.length - 1) g += '<text class="axis-text" x="' + cx + '" y="' + (H - 22) + '" text-anchor="middle">' + esc(it.x) + "</text>";
      if (it.sub) g += '<text class="axis-text" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(it.sub) + "</text>";
    });
    return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.aria) + '">' + g + "</svg></div>";
  }

  /* ---------- secciones ---------- */
  function lastGrade(state, cat) {
    var last = null;
    state.attempts.forEach(function (a) { if (a.cat === cat && a.total > 0) last = { g: U.num(a.grade), t: "práctica" }; });
    state.exams.forEach(function (e) { if (e.cat === cat && e.counted) last = { g: U.num(e.grade), t: "simulacro" }; });
    return last;
  }

  function renderAll() {
    var state = Store.get(), today = U.today(), ov = Stats.overview(state, today);
    var lv = G.levelFor(state.xp.total), sk = G.streak(state, today);
    var empty = $("#empty"), content = $("#content");

    if (!ov.hasActivity) {
      empty.hidden = false; content.hidden = true;
      empty.innerHTML = '<div class="empty"><div class="empty-icon" aria-hidden="true">🌊</div><h2>Todavía no hay actividad</h2>' +
        "<p>Cuando respondas preguntas aquí verás tus notas, tu dominio por categoría y cómo evoluciona tu rendimiento. Con pocos datos no se muestran tendencias para no engañarte.</p>" +
        '<div class="btnrow"><a class="btn btn-primary" href="estudio.html?modo=rapida&min=5">⏱️ Empezar 5 minutos</a><a class="btn btn-secondary" href="quiz.html?categoria=cultura">Práctica por fases</a></div></div>';
    } else {
      empty.hidden = true; content.hidden = false;

      $("#summary").innerHTML =
        tile("Nivel " + lv.level, esc(lv.name) + " · " + lv.xp + " XP") +
        tile(sk.current + " " + U.plural(sk.current, "día", "días"), "racha (mejor " + sk.best + ")") +
        tile(ov.answers, "respuestas totales") +
        tile(ov.seen + " / " + ov.total, "preguntas únicas") +
        tile(ov.answers ? ov.accuracy + " %" : "—", "acierto histórico") +
        tile(ov.mastered + " / " + ov.total, "dominadas (" + U.pct(ov.mastered, ov.total) + " %)", "ok") +
        tile(ov.due, "repasos pendientes", ov.due ? "warn" : "") +
        tile(U.fmtDuration(ov.seconds), "tiempo de estudio");

      $("#cats").innerHTML = ov.cats.map(function (c, i) {
        var cat = C.catByKey[c.cat], lg = lastGrade(state, c.cat);
        return '<article class="catcard"><h3><span class="c' + (i + 1) + '" style="color:var(--cat' + (i + 1) + ')">' + shapeIcon(i) + "</span>" + cat.icono + " " + esc(cat.nombre) + "</h3>" +
          UI.bar(c.masteredPct, "Dominio de " + cat.nombre) +
          '<p class="hint">Dominio: ' + c.masteredPct + " % (" + c.mastered + " de " + c.total + ")</p><dl>" +
          "<dt>Preguntas únicas vistas</dt><dd>" + c.seen + " / " + c.total + "</dd>" +
          "<dt>Respuestas totales</dt><dd>" + c.answers + "</dd>" +
          "<dt>Aciertos</dt><dd>" + c.correct + "</dd><dt>Errores</dt><dd>" + c.wrong + "</dd>" +
          "<dt>Acierto histórico</dt><dd>" + (c.answers ? c.accuracy + " %" : "—") + "</dd>" +
          "<dt>Último intento</dt><dd>" + (lg ? U.fmtGrade(lg.g) + " / 20 (" + lg.t + ")" : "—") + "</dd>" +
          "<dt>Pendientes de repaso</dt><dd>" + c.due + "</dd><dt>Errores por dominar</dt><dd>" + c.errorsOpen + "</dd>" +
          "<dt>Tiempo de estudio</dt><dd>" + U.fmtDuration(c.seconds) + "</dd></dl>" +
          (c.errorsOpen ? '<a class="btn btn-secondary" href="estudio.html?modo=errores&cat=' + c.cat + '">🔁 Repasar errores</a>' : "") + "</article>";
      }).join("");

      var series = Stats.gradeSeries(state), most = 0;
      C.catKeys.forEach(function (k) { most = Math.max(most, series[k].length); });
      $("#evo").innerHTML = most < 2
        ? '<p class="hint">Todavía no hay muestras suficientes para ver una tendencia: se necesitan al menos 2 intentos o simulacros en una categoría.</p>' + (most === 1 ? lineChart(series) : "")
        : lineChart(series);

      var ph = Stats.phaseStats(state), any = ph.some(function (p) { return p.n > 0; });
      $("#phases").innerHTML = !any
        ? '<p class="hint">Aún no hay intentos con detalle por fase. Cada fase se califica con sus 25 preguntas.</p>'
        : barChart(ph.map(function (p) {
            return { x: "Fase " + p.phase, sub: p.n + " " + U.plural(p.n, "intento", "intentos"), v: p.avg, label: p.avg === null ? "" : U.fmtGrade(p.avg),
                     title: "Fase " + p.phase + ": nota media " + (p.avg === null ? "sin datos" : U.fmtGrade(p.avg)) + " / 20 en " + p.n + " intentos" };
          }), { max: 20, ticks: [0, 5, 10, 15, 20], zeros: true, aria: "Nota media sobre 20 por fase. " + ph.map(function (p) { return "Fase " + p.phase + ": " + (p.avg === null ? "sin datos" : U.fmtGrade(p.avg)); }).join(". ") });

      var days = Stats.dailySeries(state, today, 14), tot = days.reduce(function (a, d) { return a + d.a; }, 0);
      $("#activity").innerHTML = tot === 0
        ? '<p class="hint">No hay respuestas en los últimos 14 días.</p>'
        : barChart(days.map(function (d) {
            return { x: d.key.slice(8), v: d.a, label: String(d.a), title: U.fmtDate(d.key) + ": " + d.a + " respuestas, " + d.c + " aciertos" };
          }), { aria: "Preguntas respondidas por día en los últimos 14 días. Total: " + tot, sparseLabels: false });
    }
    buildHistory(state);
  }
  function tile(n, l, cls) { return '<div class="tile ' + (cls || "") + '"><span class="n">' + n + '</span><span class="l">' + l + "</span></div>"; }

  /* ---------- historial ---------- */
  var TYPE = { errores: "Repaso de errores", hoy: "Repasos de hoy", rapida: "Práctica rápida", tarjetas: "Tarjetas" };
  function buildHistory(state) {
    var rows = [];
    state.attempts.forEach(function (a, i) { rows.push({ kind: "att", d: a, ts: a.ts, order: i }); });
    state.exams.forEach(function (e, i) { rows.push({ kind: "exam", d: e, ts: e.ts, order: 1000 + i }); });
    state.sessions.forEach(function (s, i) { rows.push({ kind: "ses", d: s, ts: s.ts, order: 2000 + i }); });
    rows.sort(function (a, b) {
      if (a.ts && b.ts) return a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : b.order - a.order;
      if (a.ts) return -1; if (b.ts) return 1;      // los importados (sin hora) van al final = más antiguos
      return b.order - a.order;
    });
    listCache = rows; SHOWN = 30; paintHistory();
  }

  function wrongList(ids) {
    var items = ids.map(function (id) { return Stats.find(id); }).filter(Boolean);
    if (!items.length) return "<p class=\"hint\">Sin errores registrados en este intento.</p>";
    return '<ul class="fails" style="list-style:none;padding:0;display:grid;gap:10px">' + items.map(function (f) {
      return "<li><strong>" + esc(f.q.pregunta) + '</strong><br><span class="okline">✓ ' + esc(f.q.opciones[f.q.correcta]) + "</span>" + (f.q.fuente ? '<br><small class="muted">📚 ' + esc(f.q.fuente) + "</small>" : "") + "</li>";
    }).join("") + "</ul>";
  }

  function rowHtml(r, idx) {
    var d = r.d, cat, tag, title, grade = null, extra = "";
    if (r.kind === "att") {
      cat = C.catByKey[d.cat] || { nombre: d.cat, icono: "📚" };
      var st = d.source === "legacy" ? "importado" : d.status === "completo" ? "completo" : d.status === "parcial" ? "parcial" : "terminado";
      tag = "Práctica · " + st; title = cat.icono + " " + cat.nombre;
      grade = U.num(d.grade);
      extra = "Fase " + d.phase + " · " + d.correct + " / " + d.total;
    } else if (r.kind === "exam") {
      cat = d.cat === "mixto" ? { nombre: "Mixto", icono: "🧩" } : (C.catByKey[d.cat] || { nombre: d.cat, icono: "📝" });
      tag = "Simulacro · " + d.status; title = cat.icono + " " + cat.nombre;
      if (d.counted) grade = U.num(d.grade);
      extra = d.correct + " / " + d.total + " · " + U.fmtDuration(d.seconds);
    } else {
      tag = (TYPE[d.type] || d.type) + " · " + d.status; title = "⏱️ " + (TYPE[d.type] || d.type);
      extra = d.correct + " / " + d.answered + " · " + U.fmtDuration(d.seconds);
    }
    var when = r.ts ? U.fmtDateTime(r.ts) : (d.when || "");
    return '<li><button type="button" aria-expanded="false" data-i="' + idx + '"><strong>' + esc(title) + '</strong><span class="tag">' + esc(tag) + "</span><span>" + esc(extra) + '</span><span class="muted">' + esc(when) + "</span>" +
      (grade !== null ? '<span class="gr ' + (grade >= C.passGrade ? "pass" : "fail") + '">' + U.fmtGrade(grade) + " / 20</span>" : "") + '</button><div class="detail" hidden></div></li>';
  }

  function paintHistory() {
    var ul = $("#hist");
    if (!listCache.length) { ul.innerHTML = '<li><div class="row">No hay registros todavía.</div></li>'; $("#moreBtn").hidden = true; return; }
    ul.innerHTML = listCache.slice(0, SHOWN).map(rowHtml).join("");
    $("#moreBtn").hidden = SHOWN >= listCache.length;
    $("#moreBtn").textContent = "Ver más (" + (listCache.length - SHOWN) + ")";
  }

  function openDetail(btn) {
    var li = btn.parentNode, box = li.querySelector(".detail"), r = listCache[+btn.getAttribute("data-i")];
    var open = btn.getAttribute("aria-expanded") === "true";
    if (open) { btn.setAttribute("aria-expanded", "false"); box.hidden = true; return; }
    btn.setAttribute("aria-expanded", "true"); box.hidden = false;
    var d = r.d, html = "";
    if (r.kind === "att") {
      if (d.source === "legacy") html = "<p>Registro importado de la versión anterior: guarda la nota y la fase, pero no el detalle por pregunta.</p>";
      else {
        html = "<h4>Resultado por fase</h4>" + (d.phases && d.phases.length
          ? '<div class="tablewrap"><table class="data"><thead><tr><th>Fase</th><th>Aciertos</th><th>Nota</th></tr></thead><tbody>' +
            d.phases.map(function (p) { return "<tr><td>" + p.phase + "</td><td>" + p.correct + " / " + p.total + "</td><td>" + U.fmtGrade(p.grade) + " / 20</td></tr>"; }).join("") + "</tbody></table></div>" : "<p>Sin detalle.</p>") +
          "<p>Acumulado: " + d.correct + " / " + d.total + " → " + U.fmtGrade(d.grade) + " / 20" + (d.seconds ? " · " + U.fmtDuration(d.seconds) : "") + "</p><h4>Preguntas falladas</h4>" + wrongList(d.wrong || []);
      }
    } else if (r.kind === "ses") {
      html = "<p>Respondidas: " + d.answered + " · aciertos: " + d.correct + " · tiempo: " + U.fmtDuration(d.seconds) + " · estado: " + esc(d.status) + (d.counted ? "" : " (no cuenta como sesión completada)") + "</p>" +
        ((d.wrong || []).length ? "<h4>Preguntas falladas</h4>" + wrongList(d.wrong) : "");
    } else {
      html = "<p>" + esc(d.status) + " · " + d.correct + " correctas, " + d.wrong + " incorrectas, " + d.unanswered + " sin responder · " + U.fmtDuration(d.seconds) + " de " + d.minutes + " min" +
        (d.counted ? "" : " · interrumpido: sin nota") + "</p>" + (d.counted ? '<div class="rev"></div>' : "");
    }
    box.innerHTML = html;
    var rev = box.querySelector(".rev");
    if (rev) Review.render(rev, (d.items || []).map(function (a) { return { id: a[0], sel: a[1], mark: !!a[2] }; }));
  }

  /* ---------- eventos ---------- */
  $("#hist").addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (b) openDetail(b); });
  $("#moreBtn").addEventListener("click", function () { SHOWN += 30; paintHistory(); });
  $("#settingsBtn").addEventListener("click", function () { UI.openSettings(function (reset) { if (reset) location.reload(); else renderAll(); }); });
  $("#resetBtn").addEventListener("click", function () { UI.confirmReset().then(function (ok) { if (ok) location.reload(); }); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) { Store.invalidate(); renderAll(); } });

  renderAll();
})();
