# Simulacro Ascenso PERMAR

Sitio estático (HTML/CSS/JS, sin dependencias). Abre `index.html` o sírvelo con `python3 -m http.server`.

## Estructura
- `index.html` centro de estudio · `leer.html` leer preguntas y respuestas (solo lectura) · `quiz.html` práctica por categoría · `estudio.html` errores / repaso de hoy / sesión rápida
- `tarjetas.html` · `simulacro.html` · `desafios.html` · `progreso.html`
- `css/` estilos · `js/data/` bancos de preguntas · `js/core/` lógica (storage, srs, gamify, stats, engine, ui) · `js/pages/` una por pantalla
- Especialidades: `js/data/especialidades.js` (lista + banco activo) y un banco por especialidad en `js/data/<clave>.js`. Para agregar otra: crea su archivo y añádela a la lista.
- `tests/` pruebas: `node tests/core.test.js` y `python3 tests/e2e.py` (requiere Playwright y el servidor en el puerto 8765)

Los datos se guardan en localStorage (`permar_v2`); el historial antiguo (`historial`) se importa sin borrarse.
