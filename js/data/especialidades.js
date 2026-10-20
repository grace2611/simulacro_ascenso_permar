/*
  Especialidades disponibles y especialidad activa.

  Cada especialidad tiene su propio banco en js/data/<clave>.js (100 preguntas, ids "<clave>-001"…).
  Este archivo solo lee la especialidad elegida (localStorage "permar_especialidad", una preferencia, no progreso).
  El banco lo carga js/app/boot.js: muestra pública para visitantes/no pagados, o el banco completo (Firestore) para premium.

  Para agregar una especialidad nueva:
    1) añade su banco a banco_privado_NO_SUBIR/js_data_originales/<clave>.js (formato P.DATA.<clave> = [...]);
    2) añádela a LISTA aquí abajo y regenera con herramientas/generar_bancos.js; luego impórtala desde el panel admin.
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

  // El banco de la especialidad activa lo carga js/app/boot.js (muestra pública o banco premium desde Firestore).
})(typeof window !== "undefined" ? window : globalThis);
