// Pruebas de la lógica pura de sincronización/combinación y del control de acceso (sin Firebase).
// Ejecutar:  node tests/sync.test.js
const assert = require('assert');
const { load, clock } = require('./helpers');
require('../js/core/merge.js');
let pass = 0, fail = 0;
function test(n, f) { try { f(); pass++; console.log('  ✔', n); } catch (e) { fail++; console.log('  ✘', n, '\n    ', e.message); } }
const { P } = load(); const M = require('../js/core/merge.js'); const Store = P.Store, Engine = P.Engine;
clock(P, '2026-03-02');

test('split/join: el estado se reconstruye idéntico (tras validar)', () => {
  Store.get(); Engine.answer({ id: 'cultura-001', result: 'correct', mode: 'practice', seconds: 5 });
  Engine.answer({ id: 'deberes-002', result: 'wrong', mode: 'practice', seconds: 5 });
  const s = JSON.parse(JSON.stringify(Store.get()));
  const parts = M.split(s);
  assert(parts.q_cultura && parts.q_deberes && parts.core && parts.daily);
  const back = Store.sanitize(JSON.parse(JSON.stringify(M.join(JSON.parse(JSON.stringify(parts))))));
  assert.deepStrictEqual(Object.keys(back.q).sort(), Object.keys(s.q).sort());
  assert.strictEqual(back.totals.answers, s.totals.answers);
  assert.strictEqual(back.xp.total, s.xp.total);
});
test('cada parte pesa mucho menos que el límite de 1 MiB de Firestore (100 preguntas × 10 bancos)', () => {
  const s = Store.blank();
  for (let b of ['cultura', 'deberes', 'oficinista', 'sanidad', 'policia']) for (let i = 1; i <= 100; i++) s.q[b + '-' + String(i).padStart(3, '0')] = { cat: b, n: 9, ok: 5, last: 'c', lastDate: '2026-03-01', due: '2026-03-05', step: 3, streak: 2, lapses: 1, mastered: false, indep: '2026-03-01', fd: '2026-03-01', firstSeen: '2026-01-01', hist: 'cwcwcwcwcwcw' };
  Object.values(M.split(s)).forEach(p => assert(JSON.stringify(p).length < 900000));
  assert(Math.max(...Object.values(M.split(s)).map(p => JSON.stringify(p).length)) < 60000);
});
test('merge: nunca pierde preguntas ni historiales de ninguno de los dos lados', () => {
  const a = Store.blank(), b = Store.blank();
  a.q['cultura-001'] = { cat: 'cultura', n: 2, lastDate: '2026-01-01' }; b.q['cultura-001'] = { cat: 'cultura', n: 5, lastDate: '2026-02-01' }; b.q['deberes-001'] = { cat: 'deberes', n: 1 };
  a.attempts = [{ id: 'x' }]; b.attempts = [{ id: 'x' }, { id: 'y' }]; a.totals.answers = 10; b.totals.answers = 7; a.xp.total = 50; b.xp.total = 80;
  const m = M.merge(a, b);
  assert.strictEqual(m.q['cultura-001'].n, 5); assert(m.q['deberes-001']);
  assert.strictEqual(m.attempts.length, 2); assert.strictEqual(m.totals.answers, 10); assert.strictEqual(m.xp.total, 80);
});
test('merge: respeta el tope de historial', () => {
  const a = Store.blank(), b = Store.blank();
  for (let i = 0; i < 150; i++) a.attempts.push({ id: 'a' + i }); for (let i = 0; i < 150; i++) b.attempts.push({ id: 'b' + i });
  assert.strictEqual(M.merge(a, b).attempts.length, 200);
});
test('legacyHistoryKey nulo: una cuenta NO importa por sí sola el historial antiguo del navegador', () => {
  const { P: P2, be } = load();
  be.setItem('historial', JSON.stringify([{ categoria: 'cultura', puntaje: 10, total: 20, fecha: '1/1/2026', nota: 10, fase: 1 }]));
  P2.Store.useKey('permar_v2_u_abc', null);
  assert.strictEqual(P2.Store.get().attempts.length, 0);
  P2.Store.useKey('permar_v2', 'historial'); assert.strictEqual(P2.Store.get().attempts.length, 1);
});
test('Access: por defecto (pruebas Node) hay acceso; sin acceso NO se consume nada', () => {
  const { P: P2 } = load(); require('../js/core/access.js');
  const A = P2.Access; assert(A.isPremium());
  A.init({ level: 'visitor' }); assert(!A.hasAccess()); assert(!A.consume('q', 'a')); assert(!A.guard('q'));
  A.init({ level: 'locked', status: 'trial_expired' }); assert(!A.hasAccess()); assert(!A.consume('cards', 'a'));
  A.init({ level: 'trial', status: 'trial_active' }); assert(A.hasAccess()); assert(A.consume('q', 'a'));
  A.init({ level: 'premium', status: 'premium_active' }); assert(A.hasAccess());
});
test('Engine: sin acceso (visitante o vencido) la respuesta NO se registra; con prueba/Premium sí', () => {
  const { P: P2 } = load(); require('../js/core/access.js'); const A = P2.Access; P2.Store.get();
  A.init({ level: 'locked', status: 'premium_expired' });
  const r0 = P2.Engine.answer({ id: 'cultura-001', result: 'correct', mode: 'practice', seconds: 3 });
  assert(r0.blocked); assert.strictEqual(P2.Store.get().totals.answers, 0);
  A.init({ level: 'trial', status: 'trial_active' });
  const r1 = P2.Engine.answer({ id: 'cultura-001', result: 'correct', mode: 'practice', seconds: 3 });
  assert(!r1.blocked); assert.strictEqual(P2.Store.get().totals.answers, 1);
});
console.log('\nResultado:', pass, 'correctas,', fail, 'fallidas'); process.exit(fail ? 1 : 0);
