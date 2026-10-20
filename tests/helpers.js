// Carga los módulos del proyecto en Node (sin navegador) con un almacenamiento en memoria.
// Los bancos COMPLETOS ya no están en el sitio público: se leen de ../banco_privado_NO_SUBIR/js_data_originales
// (o de la carpeta indicada en la variable PERMAR_DATA_DIR).
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const PRIV = process.env.PERMAR_DATA_DIR || path.resolve(ROOT, '..', 'banco_privado_NO_SUBIR', 'js_data_originales');
function mem(){ const m={}; return {getItem:k=>(k in m?m[k]:null), setItem:(k,v)=>{m[k]=String(v)}, removeItem:k=>{delete m[k]}, _m:m}; }
function dataFile(n){ const p = path.join(PRIV, n + '.js'); return fs.existsSync(p) ? p : path.join(ROOT, 'js', 'data', n + '.js'); }
function load(){
  Object.keys(require.cache).forEach(k=>{ if(k.startsWith(ROOT) || k.startsWith(PRIV)) delete require.cache[k]; });
  globalThis.PERMAR = undefined;
  ['cultura','deberes','oficinista','especialidades'].forEach(n=>require(dataFile(n)));
  ['core/util','core/config','core/storage','core/srs','core/gamify','core/stats','core/engine'].forEach(f=>require(path.join(ROOT,'js',f+'.js')));
  const P = globalThis.PERMAR; const be = mem(); P.Store.setBackend(be); P.Stats.resetIndex();
  return {P, be};
}
function clock(P, dateStr, hh){ const d=new Date(dateStr+'T'+(hh||'10:00')+':00'); P.Util.setClock(()=>d.getTime()); }
module.exports = {load, clock, mem, ROOT, dataFile};
