/*
Modo claro / oscuro (igual que FinanceFlow).
Se guarda en localStorage y se aplica como data-theme en <html>.
*/
(function () {
  "use strict";

  var KEY = "simulacro_theme";
  var root = document.documentElement;

  function current() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function paint(button) {
    var dark = current() === "dark";
    button.textContent = dark ? "☀️" : "🌙";
    button.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
    button.title = dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var button = document.getElementById("themeToggle");
    if (!button) return;

    paint(button);

    button.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paint(button);
    });
  });
})();
