/*
  Utilidades de interfaz compartidas: diálogos accesibles, avisos, ajustes,
  celebraciones (nivel, medallas, metas) y preferencias de animación.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var C = P.CONFIG, U = P.Util, Store = P.Store, Engine = P.Engine, G = P.Gamify;
  var doc = root.document;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function h(html) { var t = doc.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

  var UI = {
    $: $, h: h, esc: U.esc,
    param: function (k) { return new URLSearchParams(root.location.search).get(k); },

    /* ---------- animaciones ---------- */
    applyMotion: function () {
      var on = false;
      try { on = !!Store.get().prefs.reduceMotion; } catch (e) { on = false; }
      if (on) doc.documentElement.setAttribute("data-motion", "reduce");
      else doc.documentElement.removeAttribute("data-motion");
    },
    systemReducesMotion: function () {
      return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
    },
    motionReduced: function () {
      return doc.documentElement.getAttribute("data-motion") === "reduce" || UI.systemReducesMotion();
    },

    /* ---------- avisos ---------- */
    toast: function (msg, kind) {
      var box = $("#toasts");
      if (!box) {
        box = doc.createElement("div");
        box.id = "toasts"; box.className = "toasts";
        box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite");
        doc.body.appendChild(box);
      }
      var t = h('<div class="toast ' + (kind || "") + '">' + msg + "</div>");
      box.appendChild(t);
      root.setTimeout(function () { t.classList.add("out"); root.setTimeout(function () { t.remove(); }, 350); }, 4200);
    },

    /* Muestra lo que ganó el usuario tras una acción (solo lo realmente ocurrido). */
    celebrate: function (res) {
      if (!res) return;
      if (res.levelUp) UI.toast("🎉 <strong>¡Subiste al nivel " + res.levelUp.to + "!</strong> " + U.esc(res.levelUp.name), "level");
      (res.newBadges || []).forEach(function (b) {
        UI.toast(b.icon + " <strong>Medalla: " + U.esc(b.name) + "</strong><br><small>" + U.esc(b.desc) + "</small>", "badge");
      });
      if (res.goalReached) UI.toast("✅ <strong>¡Meta diaria cumplida!</strong>", "ok");
      (res.challenges || []).forEach(function (t) { UI.toast("🏆 Desafío completado: <strong>" + U.esc(t) + "</strong>", "ok"); });
      (res.milestones || []).forEach(function (m) {
        UI.toast("🏅 " + U.esc(C.catByKey[m.cat].nombre) + ": " + m.pct + " % dominado", "ok");
      });
    },

    /* ---------- diálogos ---------- */
    dialog: function (opts) {
      // opts: { title, html, actions:[{label, value, cls}], dismissValue }
      return new Promise(function (resolve) {
        var d = doc.createElement("dialog");
        d.className = "modal glass";
        var acts = (opts.actions || [{ label: "Aceptar", value: true, cls: "btn-primary" }]).map(function (a, i) {
          return '<button type="button" class="btn ' + (a.cls || "btn-secondary") + '" data-i="' + i + '">' + a.label + "</button>";
        }).join("");
        d.innerHTML = '<form method="dialog" class="modal-in"><h2 class="modal-title">' + opts.title + "</h2>" +
          '<div class="modal-body">' + (opts.html || "") + '</div><div class="modal-actions">' + acts + "</div></form>";
        doc.body.appendChild(d);
        function close(v) { try { d.close(); } catch (e) { /* nada */ } d.remove(); resolve(v); }
        d.addEventListener("click", function (ev) {
          var b = ev.target.closest && ev.target.closest("button[data-i]");
          if (b) { ev.preventDefault(); close((opts.actions || [{ value: true }])[+b.getAttribute("data-i")].value); }
        });
        d.addEventListener("cancel", function (ev) { ev.preventDefault(); close(opts.dismissValue === undefined ? false : opts.dismissValue); });
        if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
        var first = d.querySelector("[data-focus]") || d.querySelector(".modal-actions .btn-primary") || d.querySelector("button");
        if (first) first.focus();
        if (opts.onOpen) opts.onOpen(d);
      });
    },
    confirm: function (title, html, okLabel, danger) {
      return UI.dialog({
        title: title, html: html, dismissValue: false,
        actions: [{ label: "Cancelar", value: false, cls: "btn-secondary" },
                  { label: okLabel || "Aceptar", value: true, cls: danger ? "btn-danger" : "btn-primary" }]
      });
    },

    /* ---------- ajustes ---------- */
    openSettings: function (onChange) {
      var s = Store.get(), g = s.goal;
      var types = Object.keys(C.goals.types).map(function (k) {
        return '<option value="' + k + '"' + (k === g.type ? " selected" : "") + ">" + C.goals.types[k].label + "</option>";
      }).join("");
      function targets(type, cur) {
        var def = C.goals.types[type], list = def.options.slice();
        if (list.indexOf(cur) < 0) list.push(cur);
        list.sort(function (a, b) { return a - b; });
        return list.map(function (n) { return '<option value="' + n + '"' + (n === cur ? " selected" : "") + ">" + n + " " + def.unit + "</option>"; }).join("");
      }
      var html =
        '<div class="field"><label for="setType">Objetivo diario</label><select id="setType" data-focus>' + types + "</select></div>" +
        '<div class="field"><label for="setTarget">Cantidad</label><select id="setTarget">' + targets(g.type, g.target) + "</select></div>" +
        '<p class="hint">Un día cuenta para tu racha cuando respondes al menos ' + C.goals.studyDayMin + " preguntas (abrir la página no basta).</p>" +
        '<label class="check"><input type="checkbox" id="setMotion"' + (s.prefs.reduceMotion ? " checked" : "") + '> Reducir animaciones</label>' +
        '<p class="hint">También se respeta la preferencia de tu sistema.</p>' +
        '<hr class="sep"><button type="button" class="btn btn-danger" id="setReset">🗑 Borrar todo mi progreso…</button>';
      UI.dialog({
        title: "⚙️ Ajustes", html: html, dismissValue: "close",
        actions: [{ label: "Cerrar", value: "close", cls: "btn-primary" }],
        onOpen: function (d) {
          var selT = d.querySelector("#setType"), selN = d.querySelector("#setTarget");
          selT.addEventListener("change", function () {
            var def = C.goals.types[selT.value];
            selN.innerHTML = targets(selT.value, def.def);
            Engine.setGoal(selT.value, def.def); if (onChange) onChange();
          });
          selN.addEventListener("change", function () { Engine.setGoal(selT.value, +selN.value); if (onChange) onChange(); });
          d.querySelector("#setMotion").addEventListener("change", function (e) {
            Engine.setReduceMotion(e.target.checked); UI.applyMotion(); if (onChange) onChange();
          });
          d.querySelector("#setReset").addEventListener("click", function () {
            UI.confirmReset().then(function (ok) { if (ok) { d.close(); d.remove(); if (onChange) onChange(true); } });
          });
        }
      });
    },

    confirmReset: function () {
      var html =
        "<p>Se eliminarán <strong>de este navegador</strong>:</p><ul class='plain'>" +
        "<li>tu historial de intentos y simulacros,</li><li>las preguntas falladas y el calendario de repasos,</li>" +
        "<li>XP, nivel, medallas, racha y objetivos,</li><li>el historial antiguo de versiones anteriores.</li></ul>" +
        "<p><strong>No se borran</strong> las preguntas, respuestas, explicaciones ni fuentes del banco.</p>" +
        "<p>Esta acción no se puede deshacer.</p>";
      return UI.confirm("¿Borrar todo el progreso?", html, "Sí, borrar todo", true).then(function (ok) {
        if (ok) { Store.reset(); UI.applyMotion(); }
        return ok;
      });
    },

    /* ---------- piezas visuales ---------- */
    bar: function (pct, label) {
      pct = U.clamp(Math.round(pct), 0, 100);
      return '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"' +
             (label ? ' aria-label="' + U.esc(label) + '"' : "") + '><span style="width:' + pct + '%"></span></div>';
    },
    catName: function (k) { return C.catByKey[k] ? C.catByKey[k].nombre : (k === "mixto" ? "Mixto" : k); },
    catIcon: function (k) { return C.catByKey[k] ? C.catByKey[k].icono : "🧩"; },

    // Pinta una pregunta + opciones en los elementos estándar (#pregunta, .opcion)
    optionLetter: function (i) { return "ABCD".charAt(i); },

    backLink: function (label) {
      return '<a class="backlink" href="index.html">← ' + (label || "Centro de estudio") + "</a>";
    },

    explanationHtml: function (q) {
      var t = "";
      if (q.explicacion) t += "<strong>📘 Explicación:</strong><br>" + U.esc(q.explicacion);
      if (q.fuente) t += (t ? "<br><br>" : "") + "<em>📚 Fuente: " + U.esc(q.fuente) + "</em>";
      if (!t) t = "<strong>📚 Fuente:</strong><br>No disponible";
      return t;
    },

    warnStorage: function () {
      if (!Store.isPersistent()) {
        UI.toast("⚠️ Este navegador no permite guardar datos: tu progreso solo durará mientras no cierres la página.", "warn");
      } else if (Store.lastError) {
        UI.toast("⚠️ " + U.esc(Store.lastError), "warn"); Store.lastError = null;
      }
    }
  };

  P.UI = UI;
  if (doc) {
    var start = function () { UI.applyMotion(); UI.warnStorage(); };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start); else start();
  }
})(typeof window !== "undefined" ? window : globalThis);
