# Guía completa · Simulacro Ascenso PERMAR (acceso, prueba gratuita, pagos, Premium y administración)

Proyecto Firebase: `simulacro-ascenso-permar` (no se cambió). Esta guía describe **lo que ahora hace la plataforma**, **qué debes configurar tú** y **cómo comprobar que funciona**. Lo que no se pudo probar aquí está marcado como tal en la sección 12.

## 1. Resumen de cambios
- **Tres estados de acceso** (visitante · con prueba o Premium vigente · sin acceso vigente) aplicados en la interfaz **y** en las reglas de Firestore.
- **Solo «Continuar con Google»**. Se eliminó el acceso anónimo (ya no se usa y puedes desactivarlo en Authentication).
- **Prueba gratuita de 48 h automática**, una sola vez por cuenta, con hora del servidor.
- **Plan único**: PERMAR Premium — 90 días — S/ 5.00, renovación manual, activación solo tras verificación de pago.
- **Yape/Plin reales**: número 933091898, QR reales (`assets/img/qr-yape.png`, `assets/img/qr-plin.png`), comprobante **obligatorio**.
- **Correos** (recibida / aprobada / rechazada) con estado de entrega y reintento (Cloud Functions, carpeta `functions/`).
- **Panel admin** reutilizado y ampliado: resumen, actividad (quién ingresa), pagos con filtros, usuarios, recomendaciones, correos, configuración, bancos, auditoría.
- **Recomendaciones para PERMAR** (solo con acceso vigente).
- **Páginas nuevas**: `cuenta.html` (estado de la cuenta) y `recomendaciones.html`.
- **Analítica anónima** de visitas para el panel (sin IP).

## 2. Estados de acceso
| Estado | Qué puede hacer |
|---|---|
| **Visitante** (sin sesión) | Solo **Leer preguntas y respuestas** (banco completo, respuesta correcta resaltada, sin registrar nada). También ver el plan y el inicio de sesión. |
| **Prueba activa** (48 h) | Todo lo interactivo: repaso, tarjetas, cuestionarios, simulacros, desafíos, XP, rachas, progreso e historial sincronizados, recomendaciones. |
| **Premium activo** (90 días) | Lo mismo que la prueba, durante la suscripción. |
| **Sin acceso vigente** (prueba vencida, Premium vencido, suspendido) | Leer el banco, ver su cuenta y el estado de sus solicitudes, ver el plan y pagar/renovar, soporte. **Conserva** cuenta, historial, estadísticas y progreso. |

Las páginas interactivas (`quiz, estudio, tarjetas, simulacro, desafios, progreso, recomendaciones`) no cargan su lógica sin acceso: muestran un aviso con el motivo. Además, el motor de estudio no registra nada sin acceso, y las **reglas de Firestore** impiden guardar progreso, dispositivos o recomendaciones sin prueba/Premium vigente.

> **Importante (consecuencia del requisito de lectura pública):** el banco (`bank/*`) es de **lectura pública**. Leerlo no da XP ni acceso a nada interactivo, pero cualquiera puede leer las preguntas con sus respuestas. Eso es lo que pediste para «Leer preguntas y respuestas».

## 3. Prueba gratuita de 48 horas
- Se crea sola al iniciar sesión por primera vez: documento `trials/{uid}` con `startedAt = hora del servidor` (la regla exige `startedAt == request.time`). **No hay botón** ni pago.
- Las reglas solo permiten **crear** ese documento: nadie puede editarlo ni borrarlo (ni recargando, cerrando sesión, cambiando de navegador/dispositivo o borrando datos).
- El vencimiento es `startedAt + 48 h`, calculado igual en el cliente (con la hora del servidor, no la del dispositivo) y en las reglas.
- Si vence mientras estudia, se guarda lo pendiente y aparece el aviso.
- **Límite honesto:** una persona puede crear **otra cuenta de Google** y obtener otra prueba. Ninguna regla de cliente lo impide; se mitiga con App Check y revisando usuarios en el panel.
- **Usuarios que ya existían** y no tienen `trials/{uid}`: reciben su única prueba de 48 h **en su primer ingreso después del despliegue** (es la regla más simple y justa: nunca habían tenido esta prueba). Si prefieres que no la reciban, avísame o crea a mano `trials/{uid}` con `startedAt` antiguo para ellos desde la consola.

## 4. Plan único y renovaciones
- Precio, duración y plan están en **`firestore.rules`** (`premium90 · 5 · 90`) y en `site-config.js`. El navegador no puede cambiarlos. Si algún día cambian, edita **ambos**.
- Renovación **manual**, sin cobro automático.
- **Renovar con Premium activo suma 90 días al vencimiento vigente**; si ya venció, cuenta desde la fecha de activación (`js/core/billing.js`, probado).

## 5. Pagos con Yape / Plin
1. El estudiante inicia sesión → `planes.html` → elige Yape o Plin (QR separado, ampliable, número copiable, titular).
2. Paga **S/ 5.00** y completa el formulario: método, **captura del comprobante (obligatoria)**, **código de operación**, **nombre de quien pagó**, **casilla de confirmación** y comentario opcional. Sin alguno de estos no se envía (validado en pantalla **y** en las reglas).
3. Queda `paymentRequests/{uid}` en estado **`pending`** con el mensaje de «hasta 24 horas». **No activa nada.**
4. La administradora revisa en `admin.html → Pagos`, **verifica el dinero en su app de Yape/Plin** y pulsa **Aprobar pago y activar Premium** o **Rechazar solicitud** (motivo obligatorio).
- **QR:** son las imágenes que enviaste, sin modificar. Si falta una, esa pestaña muestra «pendiente de configuración».
- **Titular:** el QR de Yape trae impreso *Grace Antonella Uturunco Ramirez*; se usó como titular por defecto (editable en `site-config.js` o en el panel). El QR de Plin no muestra nombre.
- **Soporte:** solo se usa el correo `webpagepermar@gmail.com` (no se inventó WhatsApp). Cámbialo si tienes otro canal.
- **Abrir Yape/Plin desde el celular:** se buscó un enlace oficial y **no se encontró uno documentado y verificado**, por lo que **no se implementó** ninguno. La alternativa es escanear el QR o copiar el número (en computadora: escanear con el celular).
- **Comprobante:** se guarda como **JPEG reducido (≤ ~300 KB)** en `receipts/{uid}` (documento privado), no como Base64 enorme. Se eligió Firestore y no Storage porque Storage exige plan Blaze y reglas adicionales; el tamaño está muy por debajo del límite de 1 MB. Al resolver, una copia queda en `receiptsArchive/*` (solo admin).

### Aprobación segura e idempotente
`admin.js` aprueba con **una transacción**: relee la solicitud (debe seguir `pending` y ser la misma), comprueba que no exista ya su historial, calcula la fecha con la hora del servidor, y en el mismo bloque escribe suscripción + historial (`approved`) + archivo del comprobante + auditoría y cierra la solicitud. El id del historial es `uid_fechaSolicitud` y las reglas exigen que la solicitud exista y se consuma en ese mismo lote: **repetir o aprobar en paralelo no duplica días**. Si algo falla, no se aprueba nada a medias.

## 6. Correos automáticos
Carpeta `functions/` (Cloud Functions v2, Node 20). **Requiere plan Blaze.** La web funciona sin ellas; solo los correos dependen de ellas.
- `onPaymentRequest` → «solicitud recibida» (plan, precio, método, código, fecha, estado pendiente, plazo, aviso de Premium no activo, soporte).
- `onPaymentResolved` → «aprobada» (solo si la suscripción **ya está activa** con ese pago; fechas de inicio y vencimiento) o «rechazada» (con el **motivo escrito por la administradora**, enlace a pagos y soporte).
- `retryMail` (callable) → reintento desde el panel; **verifica en el servidor** que quien llama sea administradora (`admins/{uid}`).
- Estado por correo en `mailLog/*` (`sending → sent | error`, intentos, fechas, error sin credenciales). Los reintentos **no duplican** los ya enviados. Un error de correo **nunca** revierte una aprobación (mantiene separados pago, Premium y correo).

### Configurar el remitente `webpagepermar@gmail.com`
Escribir el correo en el código no basta. Pasos:
1. En esa cuenta de Google activa la **verificación en 2 pasos** y crea una **contraseña de aplicación** (Cuenta de Google → Seguridad → Contraseñas de aplicaciones).
2. Guárdala como secreto (nunca en el código):  
   `firebase functions:secrets:set GMAIL_APP_PASSWORD`
3. Copia `functions/.env.example` a `functions/.env` y pon tu `SITE_URL`.
4. Despliega (sección 10). Gmail permite ~500 correos/día, suficiente para este volumen. Si prefieres un proveedor transaccional (Resend, Brevo…), solo cambia `transport()` en `functions/index.js`.
> **No se probó el envío real** (sin credenciales ni red hacia Gmail). Está probado el contenido, la idempotencia y el manejo de errores (sección 12). Hasta que hagas una prueba real, no des por hecho que los correos llegan.

## 7. Panel de administración (`admin.html`)
Solo entra quien tiene `admins/{uid}` (lo valida el cliente **y** las reglas). Pestañas:
- **Resumen:** usuarios, pruebas activas/vencidas, Premium activos/vencidos, pagos pendientes/aprobados, rechazados, **ingresos reales** (suma de aprobados), correos enviados/con error, recomendaciones y visitas (estimación).
- **Pagos:** filtros por estado, método, fechas y correo/nombre; comprobante privado; botones pedidos; historial y estado del correo.
- **Usuarios:** búsqueda, prueba, Premium, solicitud, errores de correo; activación manual / suspender / reactivar (todo auditado).
- **Recomendaciones:** filtros, cambio de estado, **notas privadas** (colección aparte que el estudiante no puede leer) e historial de cambios.
- **Actividad (👁):** quién ingresa. Tarjetas de ingresos y registros (hoy / 7 / 30 días), gráfico de visitas por día y lista de los últimos 50/100/200 usuarios con foto, correo, «hace cuánto» ingresaron, fecha de registro y estado (Premium, prueba, sin acceso, suspendido). Buscador por nombre o correo y botón **Gestionar**. Solo lee datos (no escribe nada) y no necesita cambios en `firestore.rules`: `users`, `subscriptions`, `trials` y `analytics` ya son legibles únicamente por la administradora.
- **Correos:** estado y **Reintentar**. **Configuración:** solo titular, contacto, horas de revisión y dispositivos. **Bancos:** importar `bancos.json`. **Auditoría:** `adminLog` (solo se puede añadir).

## 8. Reglas de Firestore (resumen; ver `firebase/firestore.rules`)
- Denegado por defecto. Visitantes: leer `bank/*` y `config/public`, y sumar **+1** a `analytics/{día}`.
- `hasAccess()` = Premium vigente **o** prueba vigente (y no suspendido) → exigido para progreso, dispositivos y recomendaciones.
- `subscriptions`: solo la administradora escribe (futuro y ≤ 800 días). `admins`: nadie escribe desde el cliente.
- `paymentRequests`: solo plan `premium90`, S/ 5, 90 días, comprobante, confirmación, nombre y código válidos; `status == pending`. `paymentHistory` y `adminLog`: solo añadir, solo admin.
- `recommendations`: dueño/administradora; `recommendationNotes`, `mailLog`, `receiptsArchive`: solo administradora (`mailLog` lo escribe únicamente el Admin SDK).
- **No hay** reglas abiertas para colecciones privadas. El Admin SDK omite las reglas, por eso `retryMail` verifica el rol por separado.
- Se eliminó la colección `usage` (límites por uso) y los topes gratuitos.

## 9. Analítica y privacidad
`analytics/{AAAA-MM-DD}` guarda **contadores**: sesiones estimadas (1 por sesión del navegador), «únicos» estimados (marca aleatoria en `localStorage` de 30 días), entradas a «Leer preguntas» y sesiones con acceso. **No se guardan IP ni datos personales**; no otorga permisos. Es una **estimación**: borrar datos o cambiar de dispositivo cuenta de nuevo, y un script malicioso podría inflar los contadores (nunca obtener acceso).

## 10. Despliegue paso a paso
1. **Copia de seguridad** (ya incluida en `respaldo/`). En la consola, exporta Firestore si tienes datos reales (Firestore → Importar/Exportar) o anota las colecciones.
2. Authentication → habilita **Google**; en *Dominios autorizados* añade tu dominio. (Opcional: desactiva *Anónimo*.)
3. Instala herramientas: `npm i -g firebase-tools` → `firebase login`.
4. Desde la carpeta `firebase/`: `firebase use simulacro-ascenso-permar`.
5. **Reglas e índices:** `firebase deploy --only firestore:rules,firestore:indexes`.
6. **Funciones (opcional pero necesarias para correos):** cambia el proyecto a **Blaze**; configura el secreto y `.env` (sección 6); `cd ../functions && npm install`; luego `firebase deploy --only functions` (desde `firebase/`).
7. Publica el sitio (carpeta `simulacro_ascenso_permar`, **sin** `banco_privado_NO_SUBIR/`) en GitHub Pages/hosting.
8. Administradora: inicia sesión, copia tu UID (Mi cuenta → Dispositivos e identificador) y crea a mano en la consola `admins/{tu uid}` (campo `x: 1`). Entra a `admin.html`.
9. **Bancos:** `admin.html → Bancos` → importa `bancos.json` si aún no están en `bank/*`.
10. (Recomendado) activa **App Check** (`appCheckSiteKey` en `site-config.js`).

## 11. Migración y reversión
- **Antes:** respaldo del proyecto anterior en `respaldo/simulacro_ascenso_permar_ANTERIOR.zip`.
- **Datos que se conservan sin tocar:** `users`, progreso (`users/*/progress`), `subscriptions`, `paymentHistory`, `bank`, `admins`, `adminLog`.
- **Suscripciones antiguas (planes `p30`/`p90`):** siguen válidas hasta su `expiresAt`; **no se activa nada automáticamente**. Al renovar pasan al plan `premium90`.
- **Solicitudes pendientes antiguas** (`pending_verification`, plan anterior): la administradora las puede aprobar/rechazar igual; las nuevas solo se crean con las reglas actuales.
- **`config/public` antiguo:** se ignoran planes, límites y números viejos; al pulsar *Guardar* en Configuración se reemplaza por el formato nuevo.
- **Documentos `usage/*` y sesiones anónimas antiguas:** quedan sin uso (las reglas los deniegan). Puedes borrarlos desde la consola cuando quieras.
- **Usuarios existentes sin prueba:** ver sección 3.
- **Reversión:** vuelve a publicar el sitio anterior (`respaldo/`) y las reglas antiguas (`firebase/firestore.rules` del respaldo). Los datos nuevos (`trials`, `mailLog`, `analytics`, `receiptsArchive`, `recommendations*`) son aditivos y no estorban.

## 12. Pruebas
**Ejecutadas aquí (resultados reales):**
| Prueba | Resultado |
|---|---|
| `node tests/access.test.js` (acceso, prueba 48 h, Premium 90 d, renovación, formulario) | 25 / 25 |
| `node tests/core.test.js` | 33 / 33 |
| `node tests/sync.test.js` | 7 / 7 |
| `node functions/test/mail.test.js` (plantillas, idempotencia, errores) | 12 / 12 |
| `python3 tests/e2e_permar.py` (navegador real con Firebase **simulado**) | 82 / 82 (3 ejecuciones seguidas) |

El e2e cubre: visitante solo lectura (300 preguntas con correcta resaltada) y pantallas bloqueadas; prueba automática que no se reinicia (recarga, otro navegador, reingreso); prueba y Premium vencidos/suspendidos; renovar recupera historial; pago (QR Yape/Plin, validaciones, solicitud `pending`, no activa); aprobar, doble aprobación sin duplicar, renovación que suma 90 días, rechazo con motivo, auditoría, resumen, recomendaciones y notas privadas.

**NO ejecutadas (y por qué):**
- `tests/rules.test.js` (reglas con el emulador): **escrito pero no ejecutado**; el registro npm bloqueó `firebase-tools`/`@firebase/rules-unit-testing` en este entorno. **Ejecútalo antes de publicar:** `cd tests && npm install && npm run rules`. El e2e simula Firebase y **no** valida las reglas.
- Cloud Functions reales y envío de correo: no se pudo instalar `firebase-admin` ni acceder a Gmail; solo se probó la lógica con simulaciones.
- Pagos reales, inicio de sesión real con Google y despliegue: requieren tus credenciales.

## 13. Cómo verificar con una cuenta de prueba y otra administrativa
1. **Visitante** (ventana privada): abre el sitio → solo «Leer preguntas» está activo; entrar a `quiz.html` muestra el aviso.
2. **Cuenta de prueba (Google):** inicia sesión → barra «Prueba gratuita · X restantes» → practica. Cierra sesión y vuelve a entrar desde otro navegador: el tiempo restante **no se reinicia** (`trials/{uid}.startedAt`).
3. **Pago:** en `planes.html` envía una solicitud con comprobante → «pendiente»; confirma que **no** tienes Premium.
4. **Administradora:** `admin.html → Pagos` → revisa → **Aprobar** → la cuenta de prueba recarga y aparece Premium con fecha de vencimiento; revisa `Correos` (si desplegaste funciones).
5. Envía otra solicitud y **recházala** con motivo; comprueba el motivo en `Mi cuenta`.

## 14. Pendiente y riesgos
- Configurar el secreto de Gmail, `.env`, plan Blaze y desplegar funciones; probar un correo real.
- Ejecutar `rules.test.js` con el emulador.
- Un usuario puede obtener varias pruebas con varias cuentas de Google (App Check ayuda, no lo elimina).
- El control de dispositivos y la hora del dispositivo son del lado del cliente: son disuasivos; las reglas de Firestore son la barrera real.
- El banco es público por requisito.
- Titular y correo de soporte se tomaron de los datos que enviaste; confírmalos.
- Si cambias el precio o los días, editar **reglas + site-config.js**.

## 15. Archivos
**Nuevos:** `cuenta.html`, `recomendaciones.html`, `js/app/{account-page,recs-page,analytics}.js`, `js/core/billing.js`, `assets/img/qr-yape.png`, `assets/img/qr-plin.png`, `functions/**`, `tests/{access.test.js,e2e_permar.py}`, `functions/test/mail.test.js`.  
**Reescritos/modificados:** `firebase/{firestore.rules,firebase.json,firestore.indexes.json}`, `js/core/access.js`, `js/app/{site-config,session,state,banks,boot,payments,plans-page,admin,admin-page,account-ui}.js`, `js/pages/{hub,leer}.js`, `js/core/ui.js` (textos), `css/cuenta.css`, `planes.html`, `tests/{rules.test.js,sync.test.js,fake-firebase/core.js}`.  
**Eliminados:** `tests/e2e_firebase.py` (reemplazado por `e2e_permar.py`), `assets/img/LEEME_QR.txt`.


## 14. Novedades: logo, panel reorganizado y avisos por correo
- **Logo:** `assets/img/logo.png` (ancla) y los iconos `icon-32/180/192.png` están enlazados en el `<head>` de todas las páginas (pestaña del navegador y pantalla de inicio del celular); también aparece en el centro de estudio, en el panel y en los correos (si `SITE_URL` está definido).
- **Panel (`admin.html`) en 6 secciones:** 🏠 Inicio (qué necesita atención + números + guía rápida) · 💳 Pagos (Pendientes / Aprobados / Rechazados / Todos) · 👥 Usuarios (Quién ingresó / Buscar y gestionar) · ✉️ Correos · 💡 Ideas (recomendaciones) · ⚙️ Ajustes (Datos del sitio / Bancos / Registro de cambios). Las pestañas muestran contadores (pagos por revisar, correos con error, ideas nuevas).
- **Correo al aprobar o rechazar:** al terminar una revisión se abre «Avisar al estudiante». Si las Cloud Functions están activas, el panel detecta el envío automático (`mailLog`) y lo indica; si no, el mensaje ya viene redactado (con el **motivo del rechazo**) y se envía con un clic desde **Gmail** (o copiándolo). Funciona SIN plan Blaze. También se puede avisar después: Pagos → Aprobados/Rechazados → «✉️ Avisar por correo».
- **Motivo del rechazo:** lista de motivos frecuentes o texto libre (obligatorio al rechazar).
- Archivos nuevos: `js/core/mailtext.js`, `css/admin.css`, `tests/mailtext.test.js`.
