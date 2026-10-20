// Pruebas de la lógica de acceso, prueba de 48 h, Premium de 90 días y validación del formulario de pago (sin navegador ni Firebase).
const assert = require('assert');
globalThis.PERMAR = undefined;
const A = require('../js/core/access.js');
const B = require('../js/core/billing.js');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('  ✔', name); } catch (e) { fail++; console.log('  ✘', name, '\n     ', e.message); } }
const H = 3600000, D = 86400000, NOW = Date.UTC(2026, 9, 15, 12, 0, 0);
const c = (o) => A.compute(Object.assign({ signedIn: true, nowMs: NOW, trialHours: 48 }, o));

console.log('Acceso');
t('sin sesión = visitante', () => assert.strictEqual(c({ signedIn: false }).level, 'visitor'));
t('prueba iniciada hace 1 h = trial activo', () => { const r = c({ trialStartedAt: NOW - H }); assert.strictEqual(r.level, 'trial'); assert.strictEqual(r.status, 'trial_active'); });
t('prueba a 47 h 59 min sigue activa; a 48 h exactas vence', () => { assert.strictEqual(c({ trialStartedAt: NOW - 48 * H + 60000 }).level, 'trial'); assert.strictEqual(c({ trialStartedAt: NOW - 48 * H }).level, 'locked'); });
t('prueba vencida = bloqueado con estado trial_expired', () => { const r = c({ trialStartedAt: NOW - 49 * H }); assert.strictEqual(r.level, 'locked'); assert.strictEqual(r.status, 'trial_expired'); });
t('el fin de la prueba SIEMPRE es inicio + 48 h (no depende de nada editable)', () => assert.strictEqual(c({ trialStartedAt: NOW - H }).trialEndsAt, NOW - H + 48 * H));
t('Premium activo vigente = premium', () => { const r = c({ sub: { status: 'active', expiresAt: NOW + D }, trialStartedAt: NOW - 90 * D }); assert.strictEqual(r.level, 'premium'); assert.strictEqual(r.status, 'premium_active'); });
t('Premium vencido (aunque status diga active) = bloqueado premium_expired', () => { const r = c({ sub: { status: 'active', expiresAt: NOW - 1 }, trialStartedAt: NOW - 90 * D }); assert.strictEqual(r.level, 'locked'); assert.strictEqual(r.status, 'premium_expired'); });
t('suspendido pierde acceso aunque tenga prueba o fecha futura', () => { assert.strictEqual(c({ sub: { status: 'suspended', expiresAt: NOW + D }, trialStartedAt: NOW - H }).level, 'locked'); });
t('solicitud pendiente + prueba vencida = pending; no da acceso', () => { const r = c({ hasPending: true, trialStartedAt: NOW - 60 * H }); assert.strictEqual(r.status, 'pending'); assert.strictEqual(r.level, 'locked'); });
t('solicitud rechazada se muestra como rejected', () => assert.strictEqual(c({ sub: { status: 'rejected' }, trialStartedAt: NOW - 60 * H }).status, 'rejected'));
t('pendiente NO activa Premium', () => assert.notStrictEqual(c({ hasPending: true, trialStartedAt: NOW - 60 * H }).level, 'premium'));
t('Access.init + hasAccess/isPremium según nivel', () => {
  A.init({ level: 'locked', status: 'trial_expired' }); assert.strictEqual(A.hasAccess(), false); assert.strictEqual(A.isPremium(), false);
  A.init({ level: 'trial', status: 'trial_active' }); assert.strictEqual(A.hasAccess(), true);
  A.init({ level: 'visitor', status: 'visitor' }); assert.strictEqual(A.guard('q'), false);
});

console.log('Premium 90 días');
t('primera activación: 90 días desde ahora', () => { const r = B.computeExpiry(null, 90, NOW); assert.strictEqual(r.expiresMs, NOW + 90 * D); assert.strictEqual(r.renewal, false); });
t('renovar con Premium activo SUMA al vencimiento vigente', () => { const r = B.computeExpiry({ status: 'active', expiresAt: NOW + 10 * D }, 90, NOW); assert.strictEqual(r.expiresMs, NOW + 100 * D); assert.strictEqual(r.renewal, true); assert.strictEqual(r.startMs, NOW + 10 * D); });
t('renovar con Premium vencido cuenta desde ahora', () => assert.strictEqual(B.computeExpiry({ status: 'active', expiresAt: NOW - 5 * D }, 90, NOW).expiresMs, NOW + 90 * D));
t('renovar con suscripción suspendida/rechazada cuenta desde ahora', () => { assert.strictEqual(B.computeExpiry({ status: 'suspended', expiresAt: NOW + 5 * D }, 90, NOW).expiresMs, NOW + 90 * D); });
t('id de historial determinista (una solicitud = un solo historial)', () => assert.strictEqual(B.historyId('u1', 123), B.historyId('u1', 123)));
t('solo una solicitud pendiente se puede resolver', () => { assert.ok(B.requestIsOpen({ status: 'pending' })); assert.ok(!B.requestIsOpen({ status: 'approved' })); assert.ok(!B.requestIsOpen(null)); });

console.log('Formulario de pago');
const ok = { method: 'yape', receipt: 'data:image/jpeg;base64,xx', operationCode: 'OP-12345', payerName: 'Ana Pérez', confirmed: true };
t('formulario completo es válido', () => assert.strictEqual(B.validateForm(ok), null));
t('sin comprobante → error', () => assert.ok(B.validateForm(Object.assign({}, ok, { receipt: null }))));
t('sin código de operación o inválido → error', () => { assert.ok(B.validateForm(Object.assign({}, ok, { operationCode: '' }))); assert.ok(B.validateForm(Object.assign({}, ok, { operationCode: 'a b!' }))); assert.ok(B.validateForm(Object.assign({}, ok, { operationCode: 'abc' }))); });
t('sin método o método distinto de yape/plin → error', () => { assert.ok(B.validateForm(Object.assign({}, ok, { method: '' }))); assert.ok(B.validateForm(Object.assign({}, ok, { method: 'bcp' }))); });
t('sin nombre del pagador → error', () => { assert.ok(B.validateForm(Object.assign({}, ok, { payerName: '  ' }))); assert.ok(B.validateForm(Object.assign({}, ok, { payerName: 'Al' }))); });
t('sin confirmación → error', () => assert.ok(B.validateForm(Object.assign({}, ok, { confirmed: false }))));
t('plin también es válido', () => assert.strictEqual(B.validateForm(Object.assign({}, ok, { method: 'plin' })), null));

console.log('\nResultado:', pass, 'correctas,', fail, 'fallidas');
process.exit(fail ? 1 : 0);
