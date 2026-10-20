/*
  PRUEBAS DE LAS REGLAS DE FIRESTORE (requieren el Emulador de Firebase: Java + `npm install` con acceso a internet).
  Desde la carpeta tests/:   npm install   y luego   npm run rules
  ⚠️ Estas pruebas están ESCRITAS para las reglas nuevas pero NO pudieron ejecutarse en el entorno donde se desarrolló
     (el registro npm bloqueó firebase-tools / @firebase/rules-unit-testing). Ejecútalas ANTES de publicar y avisa si alguna falla.
*/
const fs = require('fs'), path = require('path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, increment, Timestamp, writeBatch, collection, addDoc } = require('firebase/firestore');

const DAY = 86400000, HOUR = 3600000;
const ts = (offMs) => Timestamp.fromMillis(Date.now() + offMs);
let env, pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; console.log('  ✔', name); } catch (e) { fail++; console.log('  ✘', name, '\n     ', e.message); } }
const g = (uid, email) => env.authenticatedContext(uid, { email: email || uid + '@x.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } }).firestore();
const anon = (uid) => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const nobody = () => env.unauthenticatedContext().firestore();

const reqData = (uid, o) => Object.assign({ uid, email: uid + '@x.com', displayName: 'U', planId: 'premium90', planName: 'PERMAR Premium — 90 días', days: 90, amount: 5, currency: 'PEN', method: 'yape', operationCode: 'OP-123456', payerName: 'Ana Perez', note: '', hasReceipt: true, confirmed: true, status: 'pending', createdAt: serverTimestamp() }, o || {});
const rcpt = () => ({ image: 'data:image/jpeg;base64,/9j/AAAA', mime: 'image/jpeg', size: 30, createdAt: serverTimestamp() });
async function sendRequest(db, uid, o, withReceipt) {
  const b = writeBatch(db); b.set(doc(db, 'paymentRequests', uid), reqData(uid, o));
  if (withReceipt !== false) b.set(doc(db, 'receipts', uid), rcpt());
  return b.commit();
}

(async () => {
  env = await initializeTestEnvironment({ projectId: 'simulacro-ascenso-permar', firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firebase', 'firestore.rules'), 'utf8') } });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins/adm'), { x: 1 });
    await setDoc(doc(db, 'bank/cultura'), { items: [{ id: 'cultura-001' }] });
    await setDoc(doc(db, 'trials/tnew'), { startedAt: ts(-1 * HOUR), email: 'tnew@x.com' });
    await setDoc(doc(db, 'trials/told'), { startedAt: ts(-49 * HOUR), email: 'told@x.com' });
    await setDoc(doc(db, 'trials/tsusp'), { startedAt: ts(-1 * HOUR), email: 'tsusp@x.com' });
    await setDoc(doc(db, 'subscriptions/tsusp'), { status: 'suspended', expiresAt: ts(10 * DAY) });
    await setDoc(doc(db, 'subscriptions/prem'), { status: 'active', planId: 'premium90', expiresAt: ts(10 * DAY) });
    await setDoc(doc(db, 'subscriptions/pold'), { status: 'active', planId: 'premium90', expiresAt: ts(-1 * DAY) });
    await setDoc(doc(db, 'users/prem'), { email: 'prem@x.com' });
  });

  console.log('Lectura pública del banco y límites del visitante');
  await t('visitante sin sesión SÍ lee el banco', () => assertSucceeds(getDoc(doc(nobody(), 'bank/cultura'))));
  await t('visitante NO escribe el banco', () => assertFails(setDoc(doc(nobody(), 'bank/cultura'), { items: [] })));
  await t('Premium/prueba NO escriben el banco; administradora SÍ', async () => { await assertFails(setDoc(doc(g('prem'), 'bank/cultura'), { items: [] })); await assertSucceeds(setDoc(doc(g('adm'), 'bank/cultura'), { items: [{ id: 'c1' }] })); });
  await t('visitante NO lee users, trials, subscriptions, paymentRequests, receipts, recommendations, mailLog, adminLog, analytics', async () => {
    for (const p of ['users/prem', 'trials/tnew', 'subscriptions/prem', 'paymentRequests/prem', 'receipts/prem', 'recommendations/x', 'mailLog/x', 'adminLog/x', 'analytics/2026-10-15']) await assertFails(getDoc(doc(nobody(), p)));
  });
  await t('visitante NO escribe progreso ni usage', async () => { await assertFails(setDoc(doc(nobody(), 'users/prem/progress/core'), { json: '{}', rev: 1, updatedAt: serverTimestamp() })); await assertFails(setDoc(doc(nobody(), 'usage/x'), { q: 1 })); });
  await t('sesión anónima heredada NO accede a nada privado', () => assertFails(setDoc(doc(anon('a1'), 'users/a1'), { email: 'a@x.com', displayName: '', photoURL: '', createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() })));

  console.log('Prueba gratuita de 48 h');
  await t('primer inicio: crea trials/{uid} con hora del servidor', () => assertSucceeds(setDoc(doc(g('n1', 'n1@x.com'), 'trials/n1'), { startedAt: serverTimestamp(), email: 'n1@x.com' })));
  await t('NO se puede reiniciar (update) ni borrar su prueba', async () => { const d = g('told', 'told@x.com'); await assertFails(setDoc(doc(d, 'trials/told'), { startedAt: serverTimestamp(), email: 'told@x.com' })); await assertFails(updateDoc(doc(d, 'trials/told'), { startedAt: serverTimestamp() })); await assertFails(deleteDoc(doc(d, 'trials/told'))); });
  await t('NO se puede crear con fecha del cliente (retroceder o adelantar)', () => assertFails(setDoc(doc(g('n2', 'n2@x.com'), 'trials/n2'), { startedAt: ts(+5 * DAY), email: 'n2@x.com' })));
  await t('NO se puede crear la prueba de otro uid ni con campos extra', async () => { await assertFails(setDoc(doc(g('n3', 'n3@x.com'), 'trials/n9'), { startedAt: serverTimestamp(), email: 'n3@x.com' })); await assertFails(setDoc(doc(g('n4', 'n4@x.com'), 'trials/n4'), { startedAt: serverTimestamp(), email: 'n4@x.com', hours: 9999 })); });
  await t('lee su propia prueba; no la de otro', async () => { await assertSucceeds(getDoc(doc(g('tnew', 'tnew@x.com'), 'trials/tnew'))); await assertFails(getDoc(doc(g('u1'), 'trials/tnew'))); });

  console.log('Acceso interactivo (progreso, dispositivos)');
  const pg = (uid) => ({ json: '{}', rev: 1, updatedAt: serverTimestamp() });
  await t('prueba vigente SÍ guarda y lee su progreso', async () => { const d = g('tnew', 'tnew@x.com'); await assertSucceeds(setDoc(doc(d, 'users/tnew/progress/core'), pg())); await assertSucceeds(getDoc(doc(d, 'users/tnew/progress/core'))); });
  await t('prueba VENCIDA NO guarda progreso', () => assertFails(setDoc(doc(g('told', 'told@x.com'), 'users/told/progress/core'), pg())));
  await t('prueba vigente pero SUSPENDIDO NO guarda progreso', () => assertFails(setDoc(doc(g('tsusp', 'tsusp@x.com'), 'users/tsusp/progress/core'), pg())));
  await t('Premium vigente SÍ; Premium vencido NO', async () => { await assertSucceeds(setDoc(doc(g('prem', 'prem@x.com'), 'users/prem/progress/core'), pg())); await assertFails(setDoc(doc(g('pold', 'pold@x.com'), 'users/pold/progress/core'), pg())); });
  await t('NO lee el progreso de otro usuario', () => assertFails(getDoc(doc(g('prem', 'prem@x.com'), 'users/tnew/progress/core'))));
  await t('un usuario con prueba vencida SÍ puede borrar su propio progreso', async () => { await env.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), 'users/told/progress/core'), { json: '{}', rev: 1 })); await assertSucceeds(deleteDoc(doc(g('told', 'told@x.com'), 'users/told/progress/core'))); });

  console.log('Suscripción y rol');
  await t('estudiante NO puede activarse Premium ni cambiar fechas', async () => { const u = g('u1'); await assertFails(setDoc(doc(u, 'subscriptions/u1'), { status: 'active', expiresAt: ts(90 * DAY), updatedAt: serverTimestamp(), updatedBy: 'u1' })); await assertFails(updateDoc(doc(g('prem', 'prem@x.com'), 'subscriptions/prem'), { expiresAt: ts(900 * DAY) })); });
  await t('estudiante NO crea admins/{uid}', () => assertFails(setDoc(doc(g('u1'), 'admins/u1'), { x: 1 })));
  await t('administradora activa (futuro y ≤ 800 días); rechaza pasado y absurdo', async () => { const a = g('adm', 'adm@x.com'); const ok = (e) => ({ status: 'active', planId: 'premium90', expiresAt: ts(e), updatedAt: serverTimestamp(), updatedBy: 'adm' }); await assertSucceeds(setDoc(doc(a, 'subscriptions/u5'), ok(90 * DAY))); await assertFails(setDoc(doc(a, 'subscriptions/u6'), ok(-2 * DAY))); await assertFails(setDoc(doc(a, 'subscriptions/u7'), ok(5000 * DAY))); });
  await t('usuario NO lee la suscripción de otro; SÍ la suya', async () => { await assertFails(getDoc(doc(g('u1'), 'subscriptions/prem'))); await assertSucceeds(getDoc(doc(g('prem', 'prem@x.com'), 'subscriptions/prem'))); });
  await t('perfil: no admite campo "role" ni correo ajeno', async () => { await assertFails(setDoc(doc(g('u9'), 'users/u9'), { email: 'u9@x.com', displayName: '', photoURL: '', role: 'admin', createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() })); await assertFails(setDoc(doc(g('u8'), 'users/u8'), { email: 'otro@x.com', displayName: '', photoURL: '', createdAt: serverTimestamp(), lastLoginAt: serverTimestamp() })); });

  console.log('Pagos manuales');
  await t('solicitud válida (plan único, S/ 5, 90 días, comprobante, confirmación) se crea como pending', () => sendRequest(g('p1'), 'p1').then(() => {}));
  await t('sin comprobante (sin documento receipts) es rechazada', () => assertFails(sendRequest(g('p2'), 'p2', {}, false)));
  await t('hasReceipt=false es rechazada', () => assertFails(sendRequest(g('p3'), 'p3', { hasReceipt: false })));
  await t('sin confirmación / sin nombre del pagador / código inválido / método inválido', async () => {
    await assertFails(sendRequest(g('p4'), 'p4', { confirmed: false })); await assertFails(sendRequest(g('p5'), 'p5', { payerName: '' }));
    await assertFails(sendRequest(g('p6'), 'p6', { operationCode: 'a b' })); await assertFails(sendRequest(g('p7'), 'p7', { method: 'bcp' }));
  });
  await t('precio, días o plan manipulados son rechazados', async () => { await assertFails(sendRequest(g('p8'), 'p8', { amount: 1 })); await assertFails(sendRequest(g('p9'), 'p9', { days: 999 })); await assertFails(sendRequest(g('p10'), 'p10', { planId: 'p30' })); });
  await t('NO se puede crear ya "approved" ni a nombre de otro uid', async () => { await assertFails(sendRequest(g('p11'), 'p11', { status: 'approved' })); const b = writeBatch(g('p12')); b.set(doc(g('p12'), 'paymentRequests/p13'), reqData('p13')); await assertFails(b.commit()); });
  await t('el estudiante NO edita su solicitud ni activa nada; otro estudiante NO la lee', async () => { await assertFails(updateDoc(doc(g('p1'), 'paymentRequests/p1'), { status: 'approved' })); await assertFails(setDoc(doc(g('p1'), 'subscriptions/p1'), { status: 'active' })); await assertFails(getDoc(doc(g('p14'), 'paymentRequests/p1'))); await assertFails(getDoc(doc(g('p14'), 'receipts/p1'))); });
  await t('la administradora lee la solicitud y el comprobante', async () => { await assertSucceeds(getDoc(doc(g('adm', 'adm@x.com'), 'paymentRequests/p1'))); await assertSucceeds(getDoc(doc(g('adm', 'adm@x.com'), 'receipts/p1'))); });
  const approveBatch = (db, uid, hid) => { const b = writeBatch(db); b.set(doc(db, 'paymentHistory', hid), { uid, status: 'approved', reviewedBy: 'adm', reviewedAt: serverTimestamp() }); b.delete(doc(db, 'paymentRequests', uid)); b.delete(doc(db, 'receipts', uid)); return b.commit(); };
  await t('un estudiante NO escribe historial ni auditoría', async () => { await assertFails(setDoc(doc(g('p1'), 'paymentHistory/x'), { uid: 'p1', status: 'approved', reviewedBy: 'p1', reviewedAt: serverTimestamp() })); await assertFails(setDoc(doc(g('p1'), 'adminLog/x'), { by: 'p1', at: serverTimestamp() })); });
  await t('aprobar SIN solicitud pendiente es rechazado; con solicitud que se consume, OK; repetir NO duplica', async () => {
    const a = g('adm', 'adm@x.com');
    await assertFails(approveBatch(a, 'nadie', 'nadie_1'));
    await assertSucceeds(approveBatch(a, 'p1', 'p1_1'));
    await assertFails(approveBatch(a, 'p1', 'p1_1'));
  });
  await t('el historial no se edita ni se borra; el estudiante lee el suyo', async () => { const a = g('adm', 'adm@x.com'); await assertFails(updateDoc(doc(a, 'paymentHistory/p1_1'), { status: 'rejected' })); await assertFails(deleteDoc(doc(a, 'paymentHistory/p1_1'))); await assertSucceeds(getDoc(doc(g('p1'), 'paymentHistory/p1_1'))); await assertFails(getDoc(doc(g('p14'), 'paymentHistory/p1_1'))); });
  await t('bitácora: la administradora añade; nadie edita ni borra; usuario normal no lee', async () => { const a = g('adm', 'adm@x.com'); await assertSucceeds(setDoc(doc(a, 'adminLog/l1'), { action: 'approve', by: 'adm', at: serverTimestamp() })); await assertFails(updateDoc(doc(a, 'adminLog/l1'), { action: 'x' })); await assertFails(deleteDoc(doc(a, 'adminLog/l1'))); await assertFails(getDoc(doc(g('u1'), 'adminLog/l1'))); });
  await t('mailLog: la administradora lee; NADIE escribe desde el cliente', async () => { await assertSucceeds(getDoc(doc(g('adm', 'adm@x.com'), 'mailLog/x'))); await assertFails(setDoc(doc(g('adm', 'adm@x.com'), 'mailLog/x'), { status: 'sent' })); await assertFails(getDoc(doc(g('u1'), 'mailLog/x'))); });

  console.log('Recomendaciones');
  const rec = (uid, o) => Object.assign({ uid, email: uid + '@x.com', category: 'correccion', title: 'Título válido', description: 'Descripción suficientemente larga', area: 'Cultura', status: 'received', createdAt: serverTimestamp() }, o || {});
  await t('prueba vigente envía una recomendación válida', () => assertSucceeds(addDoc(collection(g('tnew', 'tnew@x.com'), 'recommendations'), rec('tnew', { email: 'tnew@x.com' }))));
  await t('Premium vigente también', () => assertSucceeds(addDoc(collection(g('prem', 'prem@x.com'), 'recommendations'), rec('prem', { email: 'prem@x.com' }))));
  await t('visitante, prueba vencida y Premium vencido NO envían', async () => { await assertFails(addDoc(collection(nobody(), 'recommendations'), rec('x'))); await assertFails(addDoc(collection(g('told', 'told@x.com'), 'recommendations'), rec('told', { email: 'told@x.com' }))); await assertFails(addDoc(collection(g('pold', 'pold@x.com'), 'recommendations'), rec('pold', { email: 'pold@x.com' }))); });
  await t('categoría/estado/uid inválidos son rechazados', async () => { const d = g('tnew', 'tnew@x.com'); await assertFails(addDoc(collection(d, 'recommendations'), rec('tnew', { email: 'tnew@x.com', category: 'xx' }))); await assertFails(addDoc(collection(d, 'recommendations'), rec('tnew', { email: 'tnew@x.com', status: 'accepted' }))); await assertFails(addDoc(collection(d, 'recommendations'), rec('otro', { email: 'tnew@x.com' }))); });
  let rid;
  await env.withSecurityRulesDisabled(async (c) => { const r = await addDoc(collection(c.firestore(), 'recommendations'), rec('tnew', { email: 'tnew@x.com' })); rid = r.id; await setDoc(doc(c.firestore(), 'recommendationNotes', rid), { notes: 'privado', history: [] }); });
  await t('el dueño lee la suya; otro usuario NO; el estudiante no edita su estado', async () => { await assertSucceeds(getDoc(doc(g('tnew', 'tnew@x.com'), 'recommendations/' + rid))); await assertFails(getDoc(doc(g('prem', 'prem@x.com'), 'recommendations/' + rid))); await assertFails(updateDoc(doc(g('tnew', 'tnew@x.com'), 'recommendations/' + rid), { status: 'implemented' })); });
  await t('las notas privadas NUNCA las lee el estudiante; la administradora sí', async () => { await assertFails(getDoc(doc(g('tnew', 'tnew@x.com'), 'recommendationNotes/' + rid))); await assertSucceeds(getDoc(doc(g('adm', 'adm@x.com'), 'recommendationNotes/' + rid))); });
  await t('la administradora cambia SOLO el estado', async () => { const a = g('adm', 'adm@x.com'); await assertSucceeds(updateDoc(doc(a, 'recommendations/' + rid), { status: 'review', updatedAt: serverTimestamp(), updatedBy: 'adm' })); await assertFails(updateDoc(doc(a, 'recommendations/' + rid), { title: 'otro', updatedAt: serverTimestamp(), updatedBy: 'adm' })); });

  console.log('Analítica anónima');
  await t('cualquiera suma +1 a un contador del día', async () => { await assertSucceeds(setDoc(doc(nobody(), 'analytics/2026-10-15'), { visits: increment(1), updatedAt: serverTimestamp() }, { merge: true })); await assertSucceeds(setDoc(doc(nobody(), 'analytics/2026-10-15'), { visits: increment(1), updatedAt: serverTimestamp() }, { merge: true })); });
  await t('NO puede sumar de golpe, bajar, borrar ni añadir campos; NO puede leer', async () => { const d = nobody(); await assertFails(setDoc(doc(d, 'analytics/2026-10-15'), { visits: increment(500), updatedAt: serverTimestamp() }, { merge: true })); await assertFails(setDoc(doc(d, 'analytics/2026-10-15'), { visits: 0, updatedAt: serverTimestamp() }, { merge: true })); await assertFails(deleteDoc(doc(d, 'analytics/2026-10-15'))); await assertFails(setDoc(doc(d, 'analytics/2026-10-15'), { ip: '1.2.3.4', updatedAt: serverTimestamp() }, { merge: true })); await assertFails(getDoc(doc(d, 'analytics/2026-10-15'))); await assertFails(setDoc(doc(d, 'analytics/hola'), { visits: increment(1), updatedAt: serverTimestamp() }, { merge: true })); });
  await t('la administradora lee las métricas', () => assertSucceeds(getDoc(doc(g('adm', 'adm@x.com'), 'analytics/2026-10-15'))));

  console.log('Todo lo demás está denegado');
  await t('colecciones no listadas (usage, receiptsArchive para estudiantes, etc.)', async () => { await assertFails(setDoc(doc(g('u1'), 'usage/u1'), { q: 1 })); await assertFails(getDoc(doc(g('u1'), 'receiptsArchive/x'))); await assertFails(getDoc(doc(g('u1'), 'cualquier/cosa'))); });
  await t('config/public: todos leen, solo la administradora escribe', async () => { await assertSucceeds(getDoc(doc(nobody(), 'config/public'))); await assertFails(setDoc(doc(g('u1'), 'config/public'), { payment: {} })); await assertSucceeds(setDoc(doc(g('adm', 'adm@x.com'), 'config/public'), { payment: { holder: 'X' } })); });

  console.log('\nResultado:', pass, 'correctas,', fail, 'fallidas');
  await env.cleanup(); process.exit(fail ? 1 : 0);
})();
