/*
  Especialidades disponibles y especialidad activa.

  Cada especialidad tiene su propio banco en js/data/<clave>.js (100 preguntas, ids "<clave>-001"…).
  Este archivo se carga en lugar de un <script> fijo: lee la especialidad elegida por la persona
  (localStorage "permar_especialidad") y carga SOLO ese banco, para que las páginas sigan siendo ligeras.

  Para agregar una especialidad nueva:
    1) crea js/data/<clave>.js con el mismo formato que oficinista.js (P.DATA.<clave> = [...]);
    2) añádela a LISTA aquí abajo. No hace falta tocar nada más.
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});

  var LISTA = [
    { key: "oficinista",   nombre: "Oficinista",           icono: "🗂️" },
    { key: "policia",      nombre: "Policía Naval",        icono: "🛡️" },
    { key: "sanidad",      nombre: "Sanidad",              icono: "🩺" },
    { key: "servicios",    nombre: "Servicios",            icono: "🍽️" },
    { key: "cubierta",     nombre: "Cubierta",             icono: "⛵" },
    { key: "guardacostas", nombre: "Guardacostas",         icono: "🚤" },
    { key: "infanteria",   nombre: "Infantería de Marina", icono: "🎖️" },
    { key: "musicos",      nombre: "Músicos",              icono: "🎺" }
  ];
  var STORAGE_KEY = "permar_especialidad";
  var DEFAULT_KEY = "oficinista";

  var porClave = {};
  LISTA.forEach(function (e) { porClave[e.key] = e; });

  function leer() {
    try {
      var k = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (k && porClave[k]) return k;
    } catch (e) { /* sin almacenamiento: se usa la especialidad por defecto */ }
    return DEFAULT_KEY;
  }

  var activa = leer();

  P.ESP = {
    lista: LISTA,
    porClave: porClave,
    storageKey: STORAGE_KEY,
    porDefecto: DEFAULT_KEY,
    activa: activa,
    // Guarda la elección (devuelve false si el navegador no permite guardar).
    guardar: function (key) {
      if (!porClave[key]) return false;
      try { root.localStorage.setItem(STORAGE_KEY, key); return true; } catch (e) { return false; }
    }
  };

  // Carga el banco de la especialidad activa (solo mientras la página se está leyendo).
  var doc = root.document;
  if (doc && doc.readyState === "loading") {
    doc.write('<script src="js/data/' + activa + '.js"><\/script>');
  }
})(typeof window !== "undefined" ? window : globalThis);
