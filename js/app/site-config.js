/*
  ============================================================
  CONFIGURACIÓN CENTRAL DEL SITIO  (el único archivo que editas)
  ============================================================
  1) firebase: la configuración WEB de tu proyecto (no es un secreto; la seguridad real está en firestore.rules).
  2) plan / payment: datos del plan ÚNICO y de cobro. El PRECIO (S/ 5.00) y la DURACIÓN (90 días) también están
     escritos en firestore.rules: el navegador no puede cambiarlos. Si algún día cambian, hay que editar AMBOS sitios.
  3) Desde el panel (admin.html → Configuración) solo se pueden ajustar: titular, contacto de soporte y horas de verificación
     que se muestran al estudiante. Los números de Yape/Plin y el precio salen SIEMPRE de este archivo.
*/
(function (root) {
  "use strict";
  root.PERMAR_SITE = {
    firebase: {
      apiKey: "AIzaSyCpxWZupkJc2X5VvmystWUzkoncZztuWcY",
      authDomain: "simulacro-ascenso-permar.firebaseapp.com",
      projectId: "simulacro-ascenso-permar",
      storageBucket: "simulacro-ascenso-permar.firebasestorage.app",
      messagingSenderId: "352566379080",
      appId: "1:352566379080:web:d15206fe054e8073888e7d"
    },
    sdkVersion: "13.0.0",                 // versión del SDK de Firebase (la misma que te dio la consola)

    /* App Check (opcional, recomendado): clave de sitio reCAPTCHA v3 / Enterprise. Vacío = desactivado. */
    appCheckSiteKey: "",

    /* Prueba gratuita: se inicia UNA vez por cuenta de Google (documento trials/{uid}, hora del servidor). */
    trial: { hours: 48 },

    /* Plan comercial ÚNICO. Sin renovación automática. Debe coincidir con firestore.rules (premium90 · 5 · 90). */
    plan: { id: "premium90", name: "PERMAR Premium — 90 días", days: 90, price: 5, currency: "PEN" },

    /* Datos de pago reales. Los QR son las imágenes que entregó la titular (no se modifican). */
    payment: {
      yape: { number: "933091898", qrImage: "assets/img/qr-yape.png", label: "Yape" },
      plin: { number: "933091898", qrImage: "assets/img/qr-plin.png", label: "Plin" },
      /* Titular: aparece impreso en el QR de Yape entregado. Cámbialo aquí o en el panel si hace falta. */
      holder: "Grace Antonella Uturunco Ramirez",
      /* Canal de soporte visible. Solo hay un correo verificado; NO se inventó ningún WhatsApp. */
      contact: "webpagepermar@gmail.com",
      mailFrom: "webpagepermar@gmail.com",   // remitente de los correos (se configura en functions/, ver docs)
      verifyHours: 24,                        // plazo de revisión que se muestra al estudiante
      currency: "PEN"
    },

    /* Control de dispositivos simultáneos para cuentas con acceso (disuasivo, no infalible). */
    devices: { max: 2 }
  };
})(window);
