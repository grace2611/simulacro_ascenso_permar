/*
  Motor central: registra respuestas, sesiones, intentos y simulacros UNA sola vez,
  y calcula XP, niveles, meta diaria, desafíos y medallas.
  Todas las pantallas de estudio pasan por aquí (no hay lógica de puntuación duplicada).
*/
(function (root) {
  "use strict";
  var P = (root.PERMAR = root.PERMAR || {});
  var C = P.CONFIG, U = P.Util, S = P.SRS, G = P.Gamify, Store = P.Store, Stats = P.Stats;

  function ensureDay(state, today) {
    var d = state.daily[today];
    if (!d) {
      d = state.daily[today] = { a: 0, c: 0, r: 0, s: 0, t: 0, x: 0, xa: 0, xq: {} };
      Object.keys(state.daily).forEach(function (k) { if (k !== today) state.daily[k].xq = {}; });
      var keys = Object.keys(state.daily).sort();
      while (keys.length > C.limits.dailyDays) delete state.daily[keys.shift()];
    }
    return d;
  }
  function addXp(state, day, n) {
    n = Math.max(0, U.int(n));
    state.xp.total += n; day.x += n;
    return n;
  }
  function newResult(state) {
    return { xp: 0, levelBefore: G.levelFor(state.xp.total), levelUp: null, flags: null,
             newBadges: [], goalReached: false, milestones: [], challenges: [] };
  }
  function bonusOnce(state, day, key, amount, res) {
    if (state.xp.awarded[key]) return false;
    state.xp.awarded[key] = 1;
    res.xp += addXp(state, day, amount);
    return true;
  }

  // metas, hitos de dominio, desafíos semanales, medallas y subida de nivel
  function settle(state, today, day, res) {
    var gp = G.goalProgress(state, today);
    if (gp.done && bonusOnce(state, day, "goal:" + today, C.xp.dailyGoal, res)) res.goalReached = true;

    C.catKeys.forEach(function (cat) {
      var st = Stats.catStats(state, cat, today);
      Object.keys(C.xp.categoryMilestones).forEach(function (th) {
        if (st.total > 0 && st.masteredPct >= +th &&
            bonusOnce(state, day, "mile:" + cat + ":" + th, C.xp.categoryMilestones[th], res)) {
          res.milestones.push({ cat: cat, pct: +th });
        }
      });
    });

    var ws = U.weekStart(today);
    G.challenges(state, today).forEach(function (ch) {
      if (ch.value >= ch.target && bonusOnce(state, day, "week:" + ws + ":" + ch.id, C.xp.weeklyChallenge, res)) {
        res.challenges.push(ch.title);
      }
    });

    res.newBadges = G.evaluateBadges(state, today);
    var after = G.levelFor(state.xp.total);
    if (after.level > res.levelBefore.level) res.levelUp = { from: res.levelBefore.level, to: after.level, name: after.name };
    state.bestStreak = Math.max(state.bestStreak || 0, G.streak(state, today).best);
  }

  /* ---------- una respuesta (sin guardar todavía) ---------- */
  function applyAnswer(state, o, today, res) {
    // o: { id, result:'correct'|'wrong'|'doubt', assisted, mode:'practice'|'review'|'card'|'exam', seconds }
    var info = Stats.find(o.id);
    if (!info) return null;                         // id desconocido: se ignora, nunca se inventa
    var cat = info.cat;
    var day = ensureDay(state, today);
    var step = S.next(state.q[o.id] || null, cat, { result: o.result, assisted: !!o.assisted }, today);
    state.q[o.id] = step.q;
    var f = step.flags;
    res.flags = f;

    var secs = U.clamp(U.int(o.seconds), 0, C.session.maxSecondsPerAnswer);
    var correct = o.result === "correct";
    day.a++; if (correct) day.c++;
    if (!f.first && f.wasDue) day.r++;
    day.t += secs;
    var t = state.totals;
    t.answers++; if (correct) t.correct++; t.seconds += secs;
    if (o.mode === "card") t.cards++;
    var bc = t.byCat[cat] || (t.byCat[cat] = { answers: 0, correct: 0, seconds: 0 });
    bc.answers++; if (correct) bc.correct++; bc.seconds += secs;
    if (f.recovered) t.recovered++;

    // ----- XP (solo la primera respuesta de la pregunta cada día, sin ayuda, con tope diario) -----
    var firstToday = !day.xq[o.id];
    day.xq[o.id] = 1;
    var xp = 0;
    var noXp = f.wasMastered && !f.wasDue;          // dominada y aún no vencida: no da XP
    if (firstToday && !noXp && day.xa < C.xp.dailyAnswerCap) {
      if (o.mode === "card") {
        if (o.result === "correct") xp += C.xp.cardRemembered;
        else if (o.result === "doubt") xp += C.xp.cardDoubt;
      }
      if (correct && !o.assisted) {
        if (o.mode !== "card") xp += f.first ? C.xp.correctNew : (f.wasDue ? C.xp.correctReview : C.xp.correctPractice);
        if (f.wasError && f.progressed) xp += C.xp.relearned;
        if (f.recovered) xp += C.xp.recoveredBonus;
        if (f.newlyMastered) xp += C.xp.mastered;
      }
      xp = Math.min(xp, C.xp.dailyAnswerCap - day.xa);
      day.xa += xp;
      res.xp += addXp(state, day, xp);
    }
    return step;
  }

  function trim(arr, max) { while (arr.length > max) arr.shift(); }

  var Engine = {
    /* Respuesta individual (guarda). */
    answer: function (o) {
      var state = Store.get(), today = U.today();
      var res = newResult(state);
      // Uso gratuito: cada pregunta/tarjeta distinta cuenta UNA vez; si el límite ya se agotó no se registra nada.
      var A = P.Access;
      if (A && !A.isPremium() && !A.consume(o.mode === "card" ? "cards" : "q", o.id)) { res.blocked = true; return res; }
      var step = applyAnswer(state, o, today, res);
      if (!step) return res;
      settle(state, today, ensureDay(state, today), res);
      Store.save();
      return res;
    },

    /* Cierra una sesión (errores, repaso de hoy, rápida, tarjetas). Guarda UNA sola vez por id. */
    finishSession: function (rec) {
      var state = Store.get(), today = U.today();
      var res = newResult(state);
      if (state.sessions.some(function (s) { return s.id === rec.id; })) { res.duplicate = true; return res; }
      var day = ensureDay(state, today);
      var counted = rec.status !== "interrumpida" && rec.answered >= C.session.minAnswersToCount;
      state.sessions.push({
        id: rec.id, type: rec.type, mode: rec.mode || null, cats: rec.cats || [],
        ts: rec.startedAt || U.nowISO(), end: U.nowISO(),
        answered: rec.answered, correct: rec.correct, seconds: rec.seconds,
        status: rec.status, counted: counted,
        wrong: (rec.wrong || []).slice(0, C.limits.wrongPerSession)
      });
      trim(state.sessions, C.limits.sessions);
      if (counted) {
        day.s++;
        bonusOnce(state, day, "sess:" + rec.id, C.xp.sessionComplete, res);
      }
      settle(state, today, day, res);
      Store.save();
      return res;
    },

    /* Guarda un intento de la práctica clásica (por fases). Nunca duplica (mismo id). */
    saveAttempt: function (att) {
      var state = Store.get(), today = U.today();
      var res = newResult(state);
      if (state.attempts.some(function (a) { return a.id === att.id; })) { res.duplicate = true; return res; }
      var day = ensureDay(state, today);
      att.counted = att.answered >= C.session.minAnswersToCount;
      att.source = "quiz";
      state.attempts.push(att);
      trim(state.attempts, C.limits.attempts);
      if (att.counted) {
        day.s++;
        bonusOnce(state, day, "att:" + att.id, C.xp.sessionComplete, res);
      }
      settle(state, today, day, res);
      Store.save();
      return res;
    },

    /* Cierra un simulacro: registra respuestas contestadas (solo si no fue interrumpido) y el resultado. */
    completeExam: function (ex) {
      var state = Store.get(), today = U.today();   // (el uso de simulacro gratuito se cuenta al iniciar: ver simulacro.js)
      var res = newResult(state);
      if (state.exams.some(function (e) { return e.id === ex.id; })) { res.duplicate = true; return res; }
      var day = ensureDay(state, today);
      var interrupted = ex.status === "interrumpido";
      if (!interrupted) {
        var perQ = ex.answered > 0 ? Math.round(ex.seconds / ex.answered) : 0;
        ex.items.forEach(function (it) {
          if (it.sel < 0) return;                     // sin contestar: no se registra
          var info = Stats.find(it.id);
          if (!info) return;
          applyAnswer(state, { id: it.id, result: it.sel === info.q.correcta ? "correct" : "wrong",
                               assisted: false, mode: "exam", seconds: perQ }, today, res);
        });
      }
      var rec = {
        id: ex.id, cat: ex.cat, ts: ex.ts, end: U.nowISO(), minutes: ex.minutes, seconds: ex.seconds,
        total: ex.total, answered: ex.answered, correct: ex.correct, wrong: ex.wrong,
        unanswered: ex.unanswered, marked: ex.marked, grade: ex.grade, pct: ex.pct,
        status: ex.status, counted: !interrupted,
        items: ex.items.map(function (it) { return [it.id, it.sel, it.mark ? 1 : 0]; })
      };
      state.exams.push(rec);
      trim(state.exams, C.limits.exams);
      if (!interrupted) {
        day.s++;
        bonusOnce(state, day, "exam:" + ex.id, C.xp.examComplete, res);
      }
      settle(state, today, day, res);
      Store.save();
      return res;
    },

    /* Configuración */
    setGoal: function (type, target) {
      var state = Store.get();
      var def = C.goals.types[type];
      if (!def) return false;
      target = U.int(target);
      if (!(target > 0 && target <= 500)) target = def.def;
      state.goal = { type: type, target: target };
      Store.save();
      return true;
    },
    setReduceMotion: function (on) {
      var state = Store.get();
      state.prefs.reduceMotion = !!on;
      Store.save();
    },

    ensureDay: ensureDay
  };

  P.Engine = Engine;
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
})(typeof window !== "undefined" ? window : globalThis);
