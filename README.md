# Simulacro Ascenso PERMAR

Sitio estático (HTML/CSS/JS) con **Firebase** (Authentication solo Google + Cloud Firestore) y **Cloud Functions** opcionales para correos.
**Lee primero `docs/GUIA_COMPLETA.md`** (estados de acceso, pagos, correos, despliegue, migración, pruebas y pendientes).

## Acceso
1. **Visitante** (sin sesión): solo *Leer preguntas y respuestas* (banco completo, solo lectura).
2. **Con acceso vigente**: prueba gratuita de **48 h automática** (una vez por cuenta) o **PERMAR Premium — 90 días — S/ 5.00** (pago manual por Yape/Plin verificado por la administradora). Acceso a todo lo interactivo.
3. **Sin acceso vigente**: lectura + cuenta + pagos + soporte; conserva su historial.

## Estructura
- Páginas: `index` · `leer` · `quiz` · `estudio` · `tarjetas` · `simulacro` · `desafios` · `progreso` · `planes` · `cuenta` · `recomendaciones` · `admin`
- `js/app/` capa Firebase (`site-config.js` = tu configuración) · `js/core/` lógica de estudio, `access.js`, `billing.js`
- `firebase/` reglas, índices y `firebase.json` · `functions/` correos · `tests/` pruebas
- Pruebas: `node tests/access.test.js` · `node tests/core.test.js` · `node tests/sync.test.js` · `node functions/test/mail.test.js` · `python3 -m http.server 8765` + `python3 tests/e2e_permar.py` · `tests/rules.test.js` (emulador)
