// SDK de Firebase SIMULADO (solo para pruebas en navegador sin red). Guarda "la nube" en localStorage (__fakedb) para sobrevivir recargas.
// NO valida reglas de seguridad: eso se prueba con el emulador (tests/rules.test.js).
const DB_KEY = "__fakedb", AUTH_KEY = "__fakeauth", LOG_KEY = "__fakelog";
const load = () => { try { return JSON.parse(localStorage.getItem(DB_KEY) || "{}"); } catch (e) { return {}; } };
const save = (d) => localStorage.setItem(DB_KEY, JSON.stringify(d));
const log = (op, path) => { try { const l = JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); l.push([op, path]); localStorage.setItem(LOG_KEY, JSON.stringify(l.slice(-400))); } catch (e) { /* nada */ } };

export class Timestamp {
  constructor(ms) { this._ms = ms; }
  toMillis() { return this._ms; }
  toDate() { return new Date(this._ms); }
  static fromMillis(ms) { return new Timestamp(ms); }
  static fromDate(d) { return new Timestamp(d.getTime()); }
  static now() { return new Timestamp(Date.now()); }
}
const enc = (v) => {
  if (v instanceof Timestamp) return { __ts: v._ms };
  if (Array.isArray(v)) return v.map(enc);
  if (v && typeof v === "object") { if (v.__sentinel) return v; const o = {}; Object.keys(v).forEach((k) => { o[k] = enc(v[k]); }); return o; }
  return v;
};
const dec = (v) => {
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { if ("__ts" in v) return new Timestamp(v.__ts); const o = {}; Object.keys(v).forEach((k) => { o[k] = dec(v[k]); }); return o; }
  return v;
};
export const serverTimestamp = () => ({ __sentinel: "ts" });
export const increment = (n) => ({ __sentinel: "inc", n });
const resolve = (incoming, existing) => {
  const out = {};
  Object.keys(incoming).forEach((k) => {
    const v = incoming[k];
    if (v && v.__sentinel === "ts") out[k] = { __ts: Date.now() };
    else if (v && v.__sentinel === "inc") out[k] = ((existing && existing[k]) || 0) + v.n;
    else out[k] = v;
  });
  return out;
};

export const getFirestore = () => ({ __db: true });
export const doc = (first, ...segs) => {
  if (first && first.__col && segs.length === 0) { const id = Math.random().toString(36).slice(2, 12); return { __doc: true, path: first.path + "/" + id, id }; }
  const p = segs.join("/"); return { __doc: true, path: p, id: p.split("/").pop() };
};
export const collection = (db, ...segs) => ({ __col: true, path: segs.join("/") });
const mkSnap = (path, data) => ({ id: path.split("/").pop(), exists: () => data !== undefined, data: () => (data === undefined ? undefined : dec(JSON.parse(JSON.stringify(data)))) });

export async function getDoc(ref) { log("get", ref.path); const d = load(); return mkSnap(ref.path, d[ref.path]); }
export async function setDoc(ref, data, opts) {
  log("set", ref.path);
  const d = load(), ex = d[ref.path];
  if (/^trials\//.test(ref.path) && ex) throw Object.assign(new Error("permission-denied"), { code: "permission-denied" });
  const r = resolve(enc(data), ex);
  d[ref.path] = opts && opts.merge ? Object.assign({}, ex || {}, r) : r; save(d);
}
export async function updateDoc(ref, data) {
  log("update", ref.path);
  const d = load(); if (!d[ref.path]) throw Object.assign(new Error("not-found"), { code: "not-found" });
  d[ref.path] = Object.assign({}, d[ref.path], resolve(enc(data), d[ref.path])); save(d);
}
export async function deleteDoc(ref) { log("delete", ref.path); const d = load(); delete d[ref.path]; save(d); }
export function writeBatch() {
  const ops = [];
  return {
    set: (ref, data, opts) => ops.push(["set", ref, data, opts]),
    update: (ref, data) => ops.push(["update", ref, data]),
    delete: (ref) => ops.push(["delete", ref]),
    commit: async () => { for (const o of ops) { if (o[0] === "set") await setDoc(o[1], o[2], o[3]); else if (o[0] === "update") await updateDoc(o[1], o[2]); else await deleteDoc(o[1]); } }
  };
}
export const where = (f, op, v) => ({ t: "where", f, op, v });
export const orderBy = (f, dir) => ({ t: "order", f, dir: dir || "asc" });
export const limit = (n) => ({ t: "limit", n });
export const startAt = (v) => ({ t: "startAt", v });
export const endAt = (v) => ({ t: "endAt", v });
export const query = (c, ...parts) => ({ __q: true, col: c, parts });
function run(qq) {
  const c = qq.__q ? qq.col : qq, parts = qq.__q ? qq.parts : [];
  const d = load();
  let rows = Object.keys(d).filter((k) => k.indexOf(c.path + "/") === 0 && k.slice(c.path.length + 1).indexOf("/") < 0).map((k) => ({ path: k, data: d[k] }));
  const val = (x) => (x && typeof x === "object" && "__ts" in x ? x.__ts : x);
  const pv = (x) => (x && typeof x.toMillis === "function" ? x.toMillis() : x);
  parts.filter((p) => p.t === "where").forEach((p) => { rows = rows.filter((r) => { const a = val(r.data[p.f]), b = pv(p.v); return p.op === "==" ? a === b : p.op === ">" ? a > b : p.op === ">=" ? a >= b : p.op === "<" ? a < b : p.op === "<=" ? a <= b : true; }); });
  const ob = parts.find((p) => p.t === "order");
  if (ob && ob.f === "__id__") { rows.sort((a, b) => (a.path > b.path ? 1 : -1) * (ob.dir === "desc" ? -1 : 1)); }
  else if (ob) { rows = rows.filter((r) => r.data[ob.f] !== undefined); rows.sort((a, b) => (val(a.data[ob.f]) > val(b.data[ob.f]) ? 1 : -1) * (ob.dir === "desc" ? -1 : 1)); }
  const sa = parts.find((p) => p.t === "startAt"), ea = parts.find((p) => p.t === "endAt");
  if (ob && sa) rows = rows.filter((r) => val(r.data[ob.f]) >= sa.v);
  if (ob && ea) rows = rows.filter((r) => val(r.data[ob.f]) <= ea.v);
  const lm = parts.find((p) => p.t === "limit"); if (lm) rows = rows.slice(0, lm.n);
  return rows;
}
export async function getDocs(q) {
  log("list", (q.__q ? q.col : q).path);
  const rows = run(q).map((r) => mkSnap(r.path, r.data));
  return { docs: rows, size: rows.length, empty: !rows.length, forEach: (fn) => rows.forEach(fn) };
}
export async function getCountFromServer(q) { return { data: () => ({ count: run(q).length }) }; }

/* ---------- auth ---------- */
const readAuth = () => { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) { return null; } };
const mkUser = (u) => u && Object.assign({}, u);
export const getAuth = () => {
  const a = { get currentUser() { return mkUser(readAuth()); }, authStateReady: async () => {} };
  return a;
};
export const signInAnonymously = async () => {
  const u = { uid: "anon" + Math.random().toString(36).slice(2, 10), isAnonymous: true, email: null, displayName: null, photoURL: null };
  localStorage.setItem(AUTH_KEY, JSON.stringify(u)); return { user: u };
};
export class GoogleAuthProvider { setCustomParameters() {} static credentialFromError(e) { return e.cred; } }
const nextGoogle = () => {
  const g = JSON.parse(localStorage.getItem("__nextGoogle") || "null");
  if (!g) throw Object.assign(new Error("closed"), { code: "auth/popup-closed-by-user" });
  return g;
};
export const linkWithPopup = async (cur) => {
  const g = nextGoogle();
  if (g.existing) throw Object.assign(new Error("exists"), { code: "auth/credential-already-in-use", cred: { g } });
  const u = { uid: cur.uid, isAnonymous: false, email: g.email, displayName: g.displayName, photoURL: null };
  localStorage.setItem(AUTH_KEY, JSON.stringify(u)); return { user: u };
};
export const signInWithCredential = async (auth, cred) => {
  const g = cred.g; const u = { uid: g.uid, isAnonymous: false, email: g.email, displayName: g.displayName, photoURL: null };
  localStorage.setItem(AUTH_KEY, JSON.stringify(u)); return { user: u };
};
export const signInWithPopup = async () => { const g = nextGoogle(); const u = { uid: g.uid || "g" + Math.random().toString(36).slice(2, 8), isAnonymous: false, email: g.email, displayName: g.displayName, photoURL: null }; localStorage.setItem(AUTH_KEY, JSON.stringify(u)); return { user: u }; };
export const signOut = async () => { localStorage.removeItem(AUTH_KEY); };
export const initializeApp = (c) => ({ cfg: c });

export const documentId = () => "__id__";
export const sum = (f) => ({ agg: "sum", f });
export async function getAggregateFromServer(q, spec) {
  const rows = run(q); const out = {};
  Object.keys(spec).forEach((k) => { out[k] = rows.reduce((a, r) => a + (+r.data[spec[k].f] || 0), 0); });
  return { data: () => out };
}
export async function addDoc(col, data) { const ref = doc(col); await setDoc(ref, data); return ref; }
/* Transacción simulada: lecturas primero; las escrituras se aplican juntas al final (como la real). */
export async function runTransaction(db, fn) {
  const ops = [];
  const tx = {
    get: async (ref) => getDoc(ref),
    set: (ref, data, o) => ops.push(["set", ref, data, o]),
    update: (ref, data) => ops.push(["update", ref, data]),
    delete: (ref) => ops.push(["delete", ref])
  };
  const res = await fn(tx);
  for (const o of ops) { if (o[0] === "set") await setDoc(o[1], o[2], o[3]); else if (o[0] === "update") await updateDoc(o[1], o[2]); else await deleteDoc(o[1]); }
  return res;
}
