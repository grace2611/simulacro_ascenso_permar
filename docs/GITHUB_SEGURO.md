# Subir a GitHub (repositorio público) sin que te "hackeen"

## Lo esencial
Un repositorio público de GitHub Pages solo debe contener **código del sitio**. La seguridad real está en **Firebase (reglas)**, no en ocultar archivos.

| Puede ser público | NUNCA subir |
|---|---|
| Todo `simulacro_ascenso_permar/` (HTML, CSS, JS) | `banco_privado_NO_SUBIR/` (tu banco completo) |
| `site-config.js` con la config web de Firebase (apiKey NO es secreto) | `respaldo/*.zip` (tiene el historial Git con los bancos) |
| `firebase/firestore.rules` | claves privadas, `serviceAccount*.json`, `.env` |

## Paso a paso (repositorio NUEVO, sin historial)
1. En GitHub crea un repositorio nuevo (p. ej. `simulacro-permar`), público, **vacío** (sin README).
2. En tu PC, abre una terminal DENTRO de la carpeta `simulacro_ascenso_permar/` (no la carpeta de arriba):
   ```
   git init -b main
   git add .
   git status        # revisa: NO debe aparecer banco_privado_NO_SUBIR ni .zip
   git commit -m "Primera versión"
   git remote add origin https://github.com/TU_USUARIO/simulacro-permar.git
   git push -u origin main
   ```
3. GitHub → Settings → Pages → Source: `main` / `(root)`.
4. Firebase Console → Authentication → Settings → **Authorized domains** → añade `TU_USUARIO.github.io`.
5. Cuando el nuevo sitio funcione, **borra o pon privado el repositorio viejo** (su historial contiene los bancos completos y cualquiera puede clonarlos).

## Protecciones en tu cuenta de GitHub
- Activa **verificación en dos pasos (2FA)** en tu cuenta de GitHub (lo que más evita "hackeos").
- Settings del repo → Branches → protege `main` (exige pull request) si colaboras con otros.
- No des permisos de escritura a nadie que no conozcas.
- Activa *Secret scanning* y *Dependabot alerts* (gratis en repos públicos).

## Seguridad en Firebase (lo que realmente protege el dinero y el contenido)
1. Pega `firebase/firestore.rules` en Firestore → Reglas → Publicar.
2. Crea `admins/<tu UID>` **a mano** en la consola (nadie más puede).
3. Authentication: solo Google + Anónimo habilitados.
4. Google Cloud Console → Credenciales → tu API key → **Restricciones de aplicación: sitios web (HTTP referrers)** → `TU_USUARIO.github.io/*` y `localhost/*`.
5. Más adelante: App Check (reCAPTCHA v3).
6. Presupuesto: mantén el plan Spark (gratis); sin facturación no pueden generarte cobros.

## Después de publicar
Busca en el repo nuevo (`github.com/TU_USUARIO/repo` → buscar "mcq" o una pregunta tuya) que no aparezca el banco completo. Si aparece, bórralo y rehaz el repositorio de cero.


## Actualización (versión con prueba gratuita y plan único)
- **No subas** `functions/.env` ni ningún secreto (`GMAIL_APP_PASSWORD` vive solo en Firebase Secret Manager). Ya está en `functions/.gitignore`.
- El banco de preguntas en Firestore (`bank/*`) es ahora de **lectura pública** (requisito de «Leer preguntas y respuestas»). `banco_privado_NO_SUBIR/` sigue siendo tu archivo fuente: no lo publiques en el repositorio.
- Los comprobantes de pago son privados (solo dueño y administradora); nunca los copies a GitHub.
