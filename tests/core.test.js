// Pruebas automáticas del núcleo (repetición espaciada, XP, racha, persistencia, migración).
// Ejecutar:  node tests/core.test.js
const assert = require('assert');
const { load, clock } = require('./helpers');

let pass = 0, fail = 0; const failures = [];
function test(name, fn) {
  try { fn(); pass++; console.log('  ✔', name); }
  catch (e) { fail++; failures.push(name); console.log('  ✘', name, '\n     ', e.message); }
}
const ID = 'cultura-001', ID2 = 'cultura-002', ID3 = 'deberes-001';

console.log('\n▶ Datos del banco');
test('300 preguntas con id único y estable (cultura/deberes/oficinista)', () => {
  const { P } = load(); const seen = new Set();
  ['cultura', 'deberes', 'oficinista'].forEach(k => {
    assert.strictEqual(P.DATA[k].length, 100);
    P.DATA[k].forEach((q, i) => {
      assert.strictEqual(q.id, k + '-' + String(i + 1).padStart(3, '0'));
      assert(!seen.has(q.id)); seen.add(q.id);
      assert.strictEqual(q.opciones.length, 4);
      assert(q.correcta >= 0 && q.correcta <= 3);
    });
  });
});

test('especialidades: 8 bancos de 100 preguntas con ids únicos, 4 opciones y respuesta válida', () => {
  const path = require('path'), { ROOT, dataFile } = require('./helpers');
  const { P } = load(); const seen = new Set();
  assert.strictEqual(P.ESP.lista.length, 8);
  P.ESP.lista.forEach(e => {
    if (!P.DATA[e.key]) require(dataFile(e.key));
    const bank = P.DATA[e.key];
    assert.strictEqual(bank.length, 100, e.key);
    bank.forEach((q, i) => {
      assert.strictEqual(q.id, e.key + '-' + String(i + 1).padStart(3, '0'));
      assert(!seen.has(q.id)); seen.add(q.id);
      assert.strictEqual(q.opciones.length, 4);
      assert(q.opciones.every(o => typeof o === 'string' && o.trim().length > 0), q.id);
      assert(q.pregunta.trim().length > 5, q.id);
      assert(q.correcta >= 0 && q.correcta <= 3);
    });
    assert(P.CONFIG.catByKey[e.key], 'catByKey incluye ' + e.key);
  });
});
test('la especialidad activa es la 3ª categoría visible; las demás siguen siendo válidas para el progreso guardado', () => {
  const { P } = load();
  assert.deepStrictEqual(P.CONFIG.catKeys, ['cultura', 'deberes', 'oficinista']);
  assert.strictEqual(P.CONFIG.catByKey.sanidad.oculta, true);
});

console.log('\n▶ Repetición espaciada');
test('acierto independiente: intervalos 1 → 3 → 7 días y dominio a la 3ª revisión', () => {
  const { P } = load(); const E = P.Engine, st = () => P.Store.get();
  clock(P, '2026-01-01'); E.answer({ id: ID, result: 'correct', mode: 'practice' });
  assert.strictEqual(st().q[ID].due, '2026-01-02'); assert(!st().q[ID].mastered);
  clock(P, '2026-01-02'); E.answer({ id: ID, result: 'correct', mode: 'review' });
  assert.strictEqual(st().q[ID].due, '2026-01-05'); assert(!st().q[ID].mastered);
  clock(P, '2026-01-05'); const r = E.answer({ id: ID, result: 'correct', mode: 'review' });
  assert.strictEqual(st().q[ID].due, '2026-01-12'); assert(st().q[ID].mastered);
  assert(r.flags.newlyMastered);
});
test('responder bien 3 veces el MISMO día no domina la pregunta', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  for (let i = 0; i < 5; i++) E.answer({ id: ID, result: 'correct', mode: 'practice' });
  const q = P.Store.get().q[ID]; assert.strictEqual(q.streak, 1); assert(!q.mastered);
});
test('acertar con ayuda (explicación vista antes) no avanza el calendario', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  E.answer({ id: ID, result: 'correct', assisted: true, mode: 'practice' });
  const q = P.Store.get().q[ID]; assert.strictEqual(q.streak, 0); assert.strictEqual(q.step, 0);
});
test('fallar devuelve la pregunta a repaso (vence hoy) y quita el dominio', () => {
  const { P } = load(); const E = P.Engine, st = () => P.Store.get();
  clock(P, '2026-01-01'); E.answer({ id: ID, result: 'correct' });
  clock(P, '2026-01-02'); E.answer({ id: ID, result: 'correct' });
  clock(P, '2026-01-05'); E.answer({ id: ID, result: 'correct' });
  assert(st().q[ID].mastered);
  clock(P, '2026-01-12'); E.answer({ id: ID, result: 'wrong' });
  const q = st().q[ID]; assert(!q.mastered); assert.strictEqual(q.due, '2026-01-12'); assert.strictEqual(q.lapses, 1);
  assert(P.Stats.dueIds(st(), ['cultura'], '2026-01-12').includes(ID));
});
test('fallar y acertar el mismo día NO cuenta como acierto independiente', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  E.answer({ id: ID, result: 'wrong' }); E.answer({ id: ID, result: 'correct' });
  const q = P.Store.get().q[ID]; assert.strictEqual(q.streak, 0); assert(!q.mastered);
});
test('"nunca estudiada" ≠ "fallada": las nuevas no aparecen en errores ni en pendientes', () => {
  const { P } = load(); const E = P.Engine, st = () => P.Store.get(); clock(P, '2026-01-01');
  E.answer({ id: ID, result: 'wrong' });
  assert.deepStrictEqual(P.Stats.errorIds(st(), 'todas'), [ID]);
  assert(!P.Stats.unseenIds(st(), ['cultura']).includes(ID));
  assert(P.Stats.unseenIds(st(), ['cultura']).includes(ID2));
  assert(!P.Stats.dueIds(st(), ['cultura'], '2026-01-01').includes(ID2));
});
test('"Tuve dudas" se repite al día siguiente sin subir de paso', () => {
  const { P } = load(); clock(P, '2026-01-01');
  P.Engine.answer({ id: ID, result: 'doubt', mode: 'card' });
  const q = P.Store.get().q[ID]; assert.strictEqual(q.due, '2026-01-02'); assert.strictEqual(q.step, 0);
});
test('cambio de horario / medianoche: las fechas usan días de calendario local', () => {
  const { P } = load(); const U = P.Util;
  assert.strictEqual(U.addDays('2026-03-07', 1), '2026-03-08');
  assert.strictEqual(U.addDays('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(U.diffDays('2026-03-01', '2026-04-01'), 31);
  clock(P, '2026-01-01', '23:59'); assert.strictEqual(U.today(), '2026-01-01');
  clock(P, '2026-01-02', '00:01'); assert.strictEqual(U.today(), '2026-01-02');
});

console.log('\n▶ XP, niveles y medallas');
test('XP: una pregunta solo da XP la primera vez que se responde cada día', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  const a = E.answer({ id: ID, result: 'correct' }); const b = E.answer({ id: ID, result: 'correct' });
  assert.strictEqual(a.xp, P.CONFIG.xp.correctNew); assert.strictEqual(b.xp, 0);
});
test('XP: fallar y repetir acertando el mismo día no da XP extra', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  const a = E.answer({ id: ID, result: 'wrong' }); const b = E.answer({ id: ID, result: 'correct' });
  assert.strictEqual(a.xp, 0); assert.strictEqual(b.xp, 0);
});
test('XP: acertar con ayuda no da XP', () => {
  const { P } = load(); clock(P, '2026-01-01');
  assert.strictEqual(P.Engine.answer({ id: ID, result: 'correct', assisted: true }).xp, 0);
});
test('XP: tope diario de XP por respuestas', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  P.CONFIG.xp.dailyAnswerCap = 25;
  let total = 0;
  for (let i = 1; i <= 10; i++) total += E.answer({ id: 'cultura-' + String(i).padStart(3, '0'), result: 'correct' }).xp;
  assert.strictEqual(P.Store.get().daily['2026-01-01'].xa, 25); assert(total >= 25);
});
test('niveles: fórmula 50·(L−1)·L y subida de nivel avisada una vez', () => {
  const { P } = load(); const G = P.Gamify;
  assert.strictEqual(G.levelFor(0).level, 1); assert.strictEqual(G.levelFor(99).level, 1);
  assert.strictEqual(G.levelFor(100).level, 2); assert.strictEqual(G.levelFor(300).level, 3);
  assert.strictEqual(G.levelFor(100).into, 0); assert.strictEqual(G.levelFor(150).pct, 25);
  clock(P, '2026-01-01');
  let ups = 0;
  for (let i = 1; i <= 12; i++) { const r = P.Engine.answer({ id: 'cultura-' + String(i).padStart(3, '0'), result: 'correct' }); if (r.levelUp) ups++; }
  assert.strictEqual(ups, 1); assert.strictEqual(G.levelFor(P.Store.get().xp.total).level, 2);
});
test('racha: días consecutivos con actividad real; abrir la página no cuenta', () => {
  const { P } = load(); const G = P.Gamify, st = () => P.Store.get();
  for (let d = 1; d <= 3; d++) {
    clock(P, '2026-02-0' + d);
    for (let i = 1; i <= 5; i++) P.Engine.answer({ id: 'cultura-' + String(i).padStart(3, '0'), result: 'correct' });
  }
  assert.strictEqual(G.streak(st(), '2026-02-03').current, 3);
  assert.strictEqual(G.streak(st(), '2026-02-04').current, 3, 'sigue viva hasta el final del día siguiente');
  assert.strictEqual(G.streak(st(), '2026-02-05').current, 0, 'se pierde tras un día sin estudiar');
  assert.strictEqual(G.streak(st(), '2026-02-05').best, 3);
  clock(P, '2026-02-04'); P.Engine.answer({ id: 'cultura-001', result: 'correct' }); // solo 1 respuesta: no es día de estudio
  assert.strictEqual(G.streak(st(), '2026-02-04').doneToday, false);
});
test('racha: 7 días seguidos desbloquea la medalla "una semana"', () => {
  const { P } = load();
  for (let d = 1; d <= 7; d++) {
    clock(P, '2026-03-0' + d);
    for (let i = 1; i <= 5; i++) P.Engine.answer({ id: 'cultura-' + String(i).padStart(3, '0'), result: 'correct' });
  }
  assert(P.Store.get().badges.semana);
});
test('meta diaria: se completa una sola vez y da XP una sola vez', () => {
  const { P } = load(); clock(P, '2026-01-01'); P.Engine.setGoal('respuestas', 10);
  let goalXp = 0, hits = 0;
  for (let i = 1; i <= 14; i++) {
    const r = P.Engine.answer({ id: 'cultura-' + String(i).padStart(3, '0'), result: 'correct' });
    if (r.goalReached) { hits++; goalXp += P.CONFIG.xp.dailyGoal; }
  }
  assert.strictEqual(hits, 1); assert.strictEqual(P.Gamify.goalProgress(P.Store.get(), '2026-01-01').pct, 100);
  assert.strictEqual(P.Store.get().xp.awarded['goal:2026-01-01'], 1);
});
test('medallas: solo se desbloquean con la condición real (no por mostrarlas)', () => {
  const { P } = load(); const st = P.Store.get();
  assert.deepStrictEqual(Object.keys(st.badges), []);
  clock(P, '2026-01-01');
  const rec = (n) => ({ id: 's' + n, type: 'rapida', cats: ['cultura'], answered: 6, correct: 4, seconds: 60, status: 'completada', wrong: [] });
  P.Engine.finishSession(rec(1));
  assert(P.Store.get().badges.primera); assert(!P.Store.get().badges.cinco);
  for (let n = 2; n <= 5; n++) P.Engine.finishSession(rec(n));
  assert(P.Store.get().badges.cinco);
  const again = P.Engine.finishSession(rec(5)); // repetir NO duplica ni celebra otra vez
  assert(again.duplicate); assert.strictEqual(again.newBadges.length, 0);
});
test('sesión con menos de 5 respuestas o interrumpida no cuenta ni da XP', () => {
  const { P } = load(); clock(P, '2026-01-01');
  const r = P.Engine.finishSession({ id: 'x1', type: 'rapida', cats: ['cultura'], answered: 3, correct: 3, seconds: 20, status: 'completada', wrong: [] });
  const r2 = P.Engine.finishSession({ id: 'x2', type: 'rapida', cats: ['cultura'], answered: 20, correct: 20, seconds: 20, status: 'interrumpida', wrong: [] });
  assert.strictEqual(r.xp, 0); assert.strictEqual(r2.xp, 0); assert.strictEqual(P.Gamify.sessionsDone(P.Store.get()), 0);
});
test('medalla "Remontada": 5 preguntas falladas y luego dominadas', () => {
  const { P } = load(); const E = P.Engine;
  const ids = [1, 2, 3, 4, 5].map(i => 'cultura-' + String(i).padStart(3, '0'));
  clock(P, '2026-01-01'); ids.forEach(id => E.answer({ id, result: 'wrong' }));
  ['2026-01-02', '2026-01-03', '2026-01-06'].forEach(d => { clock(P, d); ids.forEach(id => E.answer({ id, result: 'correct', mode: 'review' })); });
  assert.strictEqual(P.Store.get().totals.recovered, 5); assert(P.Store.get().badges.recupera);
});
test('hito de dominio por categoría da XP una sola vez', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  const ids = []; for (let i = 1; i <= 25; i++) ids.push('cultura-' + String(i).padStart(3, '0'));
  ['2026-01-01', '2026-01-02', '2026-01-05'].forEach(d => { clock(P, d); ids.forEach(id => E.answer({ id, result: 'correct' })); });
  assert.strictEqual(P.Stats.catStats(P.Store.get(), 'cultura', '2026-01-05').masteredPct, 25);
  assert.strictEqual(P.Store.get().xp.awarded['mile:cultura:25'], 1);
});

console.log('\n▶ Estadísticas');
test('únicas ≠ totales ≠ dominio', () => {
  const { P } = load(); clock(P, '2026-01-01');
  for (let i = 0; i < 4; i++) P.Engine.answer({ id: ID, result: i === 0 ? 'wrong' : 'correct' });
  P.Engine.answer({ id: ID2, result: 'correct' });
  const c = P.Stats.catStats(P.Store.get(), 'cultura', '2026-01-01');
  assert.strictEqual(c.seen, 2); assert.strictEqual(c.answers, 5); assert.strictEqual(c.correct, 4);
  assert.strictEqual(c.accuracy, 80); assert.strictEqual(c.mastered, 0); assert.strictEqual(c.masteredPct, 0);
});
test('sin muestra suficiente no se muestra tendencia (null)', () => {
  const { P } = load(); clock(P, '2026-01-01'); P.Engine.answer({ id: ID, result: 'correct' });
  assert.strictEqual(P.Stats.overview(P.Store.get(), '2026-01-01').recentAccuracy, null);
});
test('cola de sesión: sin repetidas, pendientes primero, respeta categorías', () => {
  const { P } = load(); const E = P.Engine; clock(P, '2026-01-01');
  E.answer({ id: ID, result: 'wrong' });
  const q = P.Stats.buildQueue(P.Store.get(), ['cultura', 'deberes'], 50, '2026-01-01');
  assert.strictEqual(q[0], ID); assert.strictEqual(new Set(q).size, q.length); assert.strictEqual(q.length, 50);
  const only = P.Stats.buildQueue(P.Store.get(), ['deberes'], 300, '2026-01-01');
  assert(only.every(i => i.startsWith('deberes-'))); assert.strictEqual(only.length, 100);
});

console.log('\n▶ Persistencia y migración');
test('el progreso sobrevive a "recargar" (releer desde localStorage)', () => {
  const { P } = load(); clock(P, '2026-01-01');
  P.Engine.answer({ id: ID, result: 'wrong' });
  const xp = P.Store.get().xp.total; P.Store.invalidate();
  const s = P.Store.get(); assert.strictEqual(s.q[ID].lapses, 1); assert.strictEqual(s.xp.total, xp);
});
test('migración: el historial anterior se importa sin perder nada y sin duplicarse', () => {
  const { P, be } = load();
  const old = [
    { categoria: 'cultura', puntaje: 20, total: 25, nota: '16.00', fase: 1, fecha: '1/9/2026, 10:00:00' },
    { categoria: 'deberes', puntaje: 40, total: 50, nota: '16.00', fase: 2, fecha: '2/9/2026, 10:00:00' },
    { categoria: 'zzz', puntaje: 1, total: 1, nota: '20', fase: 1, fecha: 'x' },   // inválido: se ignora
    'basura'
  ];
  be.setItem('historial', JSON.stringify(old)); P.Store.invalidate();
  const s = P.Store.get();
  assert.strictEqual(s.attempts.length, 2); assert.strictEqual(s.attempts[0].grade, 16); assert.strictEqual(s.attempts[1].phase, 2);
  assert(be.getItem('historial'), 'el historial original sigue en su sitio');
  P.Store.invalidate(); assert.strictEqual(P.Store.get().attempts.length, 2, 'no se reimporta');
});
test('datos corruptos o incompatibles no rompen la app (se conserva copia)', () => {
  const { P, be } = load(); be.setItem('permar_v2', '{esto no es json');
  P.Store.invalidate(); const s = P.Store.get();
  assert.deepStrictEqual(s.q, {}); assert(be.getItem('permar_v2_corrupt'));
  be.setItem('permar_v2', JSON.stringify({ v: 1, q: { 'cultura-001': 'x', 'zzz-001': {}, 'cultura-002': { n: -5, step: 99, due: 'mañana' } }, xp: { total: 'abc' }, goal: { type: '??', target: -1 } }));
  P.Store.invalidate(); const s2 = P.Store.get();
  assert.strictEqual(s2.q['cultura-001'], undefined); assert.strictEqual(s2.q['cultura-002'].n, 0);
  assert.strictEqual(s2.q['cultura-002'].due, null); assert.strictEqual(s2.xp.total, 0); assert.strictEqual(s2.goal.type, 'respuestas');
});
test('id de pregunta desconocido se ignora (no se inventan datos)', () => {
  const { P } = load(); const r = P.Engine.answer({ id: 'cultura-999', result: 'correct' });
  assert.strictEqual(r.xp, 0); assert.deepStrictEqual(P.Store.get().q, {});
});
test('borrar progreso elimina todo (incluido el historial antiguo) y no reimporta', () => {
  const { P, be } = load(); be.setItem('historial', JSON.stringify([{ categoria: 'cultura', puntaje: 1, total: 2, nota: '10', fase: 1, fecha: 'a' }]));
  P.Store.invalidate(); P.Store.get(); P.Engine.answer({ id: ID, result: 'correct' });
  P.Store.reset(); P.Store.invalidate();
  const s = P.Store.get(); assert.deepStrictEqual(s.q, {}); assert.strictEqual(s.attempts.length, 0); assert.strictEqual(be.getItem('historial'), null);
  assert.strictEqual(P.DATA.cultura.length, 100, 'el banco de preguntas no se toca');
});

console.log('\n▶ Intentos y simulacros se guardan una sola vez');
test('saveAttempt: mismo id dos veces → un solo registro', () => {
  const { P } = load(); clock(P, '2026-01-01');
  const att = () => ({ id: 'a1', cat: 'cultura', correct: 20, total: 25, answered: 25, grade: 16, phase: 1, when: 'x', ts: new Date().toISOString(), status: 'completo', phases: [], wrong: [] });
  P.Engine.saveAttempt(att()); const r = P.Engine.saveAttempt(att());
  assert(r.duplicate); assert.strictEqual(P.Store.get().attempts.length, 1); assert.strictEqual(P.Store.get().daily['2026-01-01'].s, 1);
});
test('completeExam: no se duplica; solo registra las contestadas; interrumpido no registra respuestas', () => {
  const { P } = load(); clock(P, '2026-01-01');
  const q1 = P.DATA.cultura[0], q2 = P.DATA.cultura[1];
  const ex = (status, id) => ({ id, cat: 'cultura', ts: new Date().toISOString(), minutes: 10, seconds: 120, total: 3, answered: 2, correct: 1, wrong: 1, unanswered: 1, marked: 0,
    grade: 6.67, pct: 33, status, items: [{ id: q1.id, sel: q1.correcta, mark: false }, { id: q2.id, sel: (q2.correcta + 1) % 4, mark: false }, { id: 'cultura-003', sel: -1, mark: false }] });
  P.Engine.completeExam(ex('interrumpido', 'e0'));
  assert.deepStrictEqual(P.Store.get().q, {}); assert(!P.Store.get().exams[0].counted);
  P.Engine.completeExam(ex('finalizado voluntariamente', 'e1'));
  const dup = P.Engine.completeExam(ex('finalizado voluntariamente', 'e1'));
  assert(dup.duplicate); assert.strictEqual(P.Store.get().exams.length, 2);
  const s = P.Store.get(); assert.strictEqual(Object.keys(s.q).length, 2); assert(!s.q['cultura-003']);
  assert.strictEqual(s.q[q2.id].lapses, 1); assert(s.badges.simulacro);
});

console.log(`\nResultado: ${pass} correctas, ${fail} fallidas`);
if (fail) { console.log('Fallaron:', failures.join(' | ')); process.exit(1); }
