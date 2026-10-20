// Pruebas del módulo de correo (sin Firebase ni red): Firestore en memoria + transporte simulado.
const assert = require('assert');
const { sendOnce, safeError } = require('../lib/mail');
const { BUILD } = require('../lib/templates');
let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; console.log('  ✔', name); } catch (e) { fail++; console.log('  ✘', name, '\n     ', e.message); } }

function memDb() {
  const store = {};
  const ref = (col, id) => ({ get: async () => ({ exists: store[col + '/' + id] !== undefined, data: () => store[col + '/' + id] }),
    set: async (d, o) => { store[col + '/' + id] = o && o.merge ? Object.assign({}, store[col + '/' + id] || {}, d) : d; }, _p: col + '/' + id });
  return { store, collection: (c) => ({ doc: (id) => ref(c, id) }),
    runTransaction: async (fn) => fn({ get: async (r) => r.get(), set: (r, d, o) => { store[r._p] = o && o.merge ? Object.assign({}, store[r._p] || {}, d) : d; } }) };
}
const ctx = { supportEmail: 'soporte@x.com', siteUrl: 'https://permar.example', verifyHours: 24 };
const opts = (n) => ({ from: 'webpagepermar@gmail.com', ctx, nowMs: () => n || 1000000 });
const mkTransport = (failTimes) => { const sent = []; let f = failTimes || 0; return { sent, sendMail: async (m) => { if (f > 0) { f--; throw new Error('Invalid login: 535 pass=abcd1234efgh5678'); } sent.push(m); } }; };
const recvJob = (over) => Object.assign({ key: 'received_u1_1', type: 'received', to: 'ana@test.com', uid: 'u1', sourceId: 'u1_1', payload: { displayName: 'Ana', planName: 'PERMAR Premium — 90 días', amount: 5, method: 'yape', operationCode: 'OP-123', createdMs: 1760000000000 } }, over || {});

(async () => {
  console.log('Plantillas');
  await t('solicitud recibida: plan, precio, método, código, estado, plazo y aviso de Premium no activo', () => {
    const m = BUILD.received(recvJob().payload, ctx);
    for (const x of ['PERMAR Premium — 90 días', 'S/ 5.00', 'Yape', 'OP-123', 'Pendiente de revisión', 'hasta 24 horas', 'Todavía no tienes Premium activado', 'soporte@x.com']) assert.ok(m.html.includes(x) || m.text.includes(x), x);
  });
  await t('aprobación: duración, inicio y vencimiento exacto', () => {
    const m = BUILD.approved({ displayName: 'Ana', planName: 'PERMAR Premium — 90 días', days: 90, startMs: Date.UTC(2026, 9, 15, 17), expiresMs: Date.UTC(2027, 0, 13, 17), renewal: false }, ctx);
    assert.ok(m.html.includes('90 días') && m.html.includes('2026') && m.html.includes('2027') && m.html.includes('https://permar.example'));
  });
  await t('rechazo: muestra el motivo dado y enlace a pagos; no inventa motivo', () => {
    const m = BUILD.rejected({ displayName: 'Ana', operationCode: 'OP-9', reason: 'No encontré el pago' }, ctx);
    assert.ok(m.html.includes('No encontré el pago') && m.html.includes('/planes.html') && m.text.includes('No encontré el pago'));
  });
  await t('rechazo: el motivo va destacado en su propio recuadro y el logo sale si hay URL del sitio', () => {
    const m = BUILD.rejected({ displayName: 'Ana', operationCode: 'OP-9', reason: 'El monto no coincide' }, ctx);
    assert.ok(m.html.includes('<strong>Motivo:</strong> El monto no coincide') && m.html.includes('https://permar.example/assets/img/logo.png'));
    assert.ok(!BUILD.rejected({ displayName: 'Ana', operationCode: 'OP-9', reason: 'x' }, { supportEmail: 's@x.com', siteUrl: '' }).html.includes('<img'));
  });
  await t('los datos del usuario se escapan (sin inyección HTML)', () => {
    const m = BUILD.rejected({ displayName: '<script>x</script>', operationCode: '"><img src=x>', reason: '<b>hola</b>' }, ctx);
    assert.ok(!m.html.includes('<script>') && !m.html.includes('<img src=x>') && !m.html.includes('<b>hola</b>'));
  });

  console.log('Envío con estado e idempotencia');
  await t('envía una vez y registra estado sent con intentos', async () => {
    const db = memDb(), tr = mkTransport(); const r = await sendOnce(db, tr, recvJob(), opts());
    assert.strictEqual(r.status, 'sent'); assert.strictEqual(tr.sent.length, 1);
    assert.strictEqual(tr.sent[0].from, '"Simulacro PERMAR" <webpagepermar@gmail.com>');
    assert.strictEqual(db.store['mailLog/received_u1_1'].status, 'sent'); assert.strictEqual(db.store['mailLog/received_u1_1'].attempts, 1);
  });
  await t('un reenvío del mismo evento NO duplica el correo', async () => {
    const db = memDb(), tr = mkTransport(); await sendOnce(db, tr, recvJob(), opts()); const r = await sendOnce(db, tr, recvJob(), opts());
    assert.strictEqual(tr.sent.length, 1); assert.ok(r.skipped);
  });
  await t('un error de correo queda registrado SIN credenciales y no lanza excepción', async () => {
    const db = memDb(), tr = mkTransport(1); const r = await sendOnce(db, tr, recvJob(), opts());
    assert.strictEqual(r.status, 'error'); const row = db.store['mailLog/received_u1_1'];
    assert.strictEqual(row.status, 'error'); assert.ok(!/abcd1234efgh5678/.test(row.lastError), row.lastError);
  });
  await t('el reintento tras un error envía y deja estado sent (intentos = 2)', async () => {
    const db = memDb(), tr = mkTransport(1); await sendOnce(db, tr, recvJob(), opts(1000000)); const r = await sendOnce(db, tr, recvJob(), opts(1000000));
    assert.strictEqual(r.status, 'sent'); assert.strictEqual(tr.sent.length, 1); assert.strictEqual(db.store['mailLog/received_u1_1'].attempts, 2);
  });
  await t('un envío en curso reciente (otro proceso) se omite; uno vencido se retoma', async () => {
    const db = memDb(), tr = mkTransport(); db.store['mailLog/received_u1_1'] = { status: 'sending', lockedAt: 1000000 };
    assert.ok((await sendOnce(db, tr, recvJob(), opts(1000000 + 30000))).skipped);
    assert.strictEqual((await sendOnce(db, tr, recvJob(), opts(1000000 + 10 * 60000))).status, 'sent');
  });
  await t('sin destinatario → estado error (no se envía)', async () => {
    const db = memDb(), tr = mkTransport(); const r = await sendOnce(db, tr, recvJob({ to: '' }), opts());
    assert.strictEqual(r.status, 'error'); assert.strictEqual(tr.sent.length, 0);
  });
  await t('el módulo de correo solo escribe en mailLog (nunca toca suscripciones)', async () => {
    const db = memDb(), tr = mkTransport(1); await sendOnce(db, tr, recvJob(), opts());
    assert.ok(Object.keys(db.store).every((k) => k.startsWith('mailLog/')));
  });
  await t('safeError recorta y oculta secretos largos', () => assert.ok(safeError(new Error('x'.repeat(500) + ' pass=hunter2')).length <= 300 && !/hunter2/.test(safeError(new Error('pass=hunter2')))));

  console.log('\nResultado:', pass, 'correctas,', fail, 'fallidas'); process.exit(fail ? 1 : 0);
})();
