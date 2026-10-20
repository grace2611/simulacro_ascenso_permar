/*
  Inicialización de Firebase (SDK modular desde el CDN oficial de Google, misma versión que te dio la consola).
  Exporta: app, auth, db y los módulos completos como A (auth) y F (firestore).
  Se usan Authentication (solo Google) y Cloud Firestore. Las Cloud Functions de correo (carpeta functions/) son opcionales y requieren plan Blaze.
*/
const S = window.PERMAR_SITE;
const base = "https://www.gstatic.com/firebasejs/" + S.sdkVersion + "/";

const [appM, authM, fsM] = await Promise.all([
  import(base + "firebase-app.js"),
  import(base + "firebase-auth.js"),
  import(base + "firebase-firestore.js")
]);

export const app = appM.initializeApp(S.firebase);

// App Check (opcional): reduce abusos desde fuera de tu sitio. Solo si pusiste appCheckSiteKey en site-config.js.
if (S.appCheckSiteKey) {
  try {
    const ac = await import(base + "firebase-app-check.js");
    ac.initializeAppCheck(app, { provider: new ac.ReCaptchaV3Provider(S.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  } catch (e) { console.warn("App Check no se pudo iniciar:", e); }
}

export const auth = authM.getAuth(app);
export const db = fsM.getFirestore(app);
export const A = authM;
export const F = fsM;
