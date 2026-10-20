// Pruebas del texto de correos manuales (aprobación / rechazo con motivo). Lógica pura, sin navegador ni Firebase.
const assert = require('assert');
const M = require('../js/core/mailtext.js');
let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('  ✔', n); } catch (e) { fail++; console.log('  ✘', n, '\n     ', e.message); } };
const ctx = { supportEmail: 'soporte@x.com', siteUrl: 'https://permar.example/app/' };

t('rechazo: incluye el motivo escrito, la operación y el enlace a planes', () => {
  const m = M.rejected({ email: 'ana@test.com', displayName: 'Ana', operationCode: 'OP-9', reason: 'El monto no coincide con S/ 5.00' }, ctx);
  assert.strictEqual(m.to, 'ana@test.com');
  assert.ok(m.subject.includes('no fue aprobada'));
  for (const x of ['Hola Ana', 'OP-9', 'Motivo: El monto no coincide con S/ 5.00', 'https://permar.example/app/planes.html', 'soporte@x.com']) assert.ok(m.body.includes(x), x);
});
t('rechazo: nunca inventa un motivo', () => assert.ok(M.rejected({ email: 'a@b.c', reason: '' }, ctx).body.includes('(sin motivo escrito)')));
t('aprobación: duración, inicio, vencimiento y enlace', () => {
  const m = M.approved({ email: 'ana@test.com', displayName: 'Ana', planName: 'PERMAR Premium — 90 días', days: 90, startMs: Date.UTC(2026, 9, 15, 17), expiresMs: Date.UTC(2027, 0, 13, 17), renewal: false }, ctx);
  assert.ok(m.subject.includes('Premium está activo'));
  for (const x of ['90 días', '2026', '2027', 'https://permar.example/app/']) assert.ok(m.body.includes(x), x);
  assert.ok(!m.body.includes('renovaste'));
});
t('aprobación por renovación lo explica', () => assert.ok(M.approved({ email: 'a@b.c', days: 90, renewal: true }, ctx).body.includes('renovaste')));
t('enlace de Gmail codifica asunto, cuerpo y destinatario', () => {
  const m = { to: 'ana@test.com', subject: 'Prueba & más', body: 'Línea 1\nLínea 2 ñ' };
  const g = M.gmailUrl(m);
  assert.ok(g.startsWith('https://mail.google.com/mail/?view=cm&fs=1&to=ana%40test.com&su=Prueba%20%26%20m%C3%A1s&body=L%C3%ADnea'));
  assert.ok(g.endsWith('&authuser=webpagepermar%40gmail.com') && g.includes('%0A'));
});
t('hay motivos de rechazo frecuentes y ninguno está vacío', () => assert.ok(M.REJECT_REASONS.length >= 5 && M.REJECT_REASONS.every((r) => r.length > 10)));
console.log('\nResultado:', pass, 'correctas,', fail, 'fallidas'); process.exit(fail ? 1 : 0);
