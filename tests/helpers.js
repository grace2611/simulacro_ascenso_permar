// Carga los módulos del proyecto en Node (sin navegador) con un almacenamiento en memoria.
const path = require('path');
const ROOT = path.resolve(__dirname, '../simulacro_ascenso_permar');
function mem(){ const m={}; return {getItem:k=>(k in m?m[k]:null), setItem:(k,v)=>{m[k]=String(v)}, removeItem:k=>{delete m[k]}, _m:m}; }
function load(){
  Object.keys(require.cache).forEach(k=>{ if(k.startsWith(ROOT)) delete require.cache[k]; });
  globalThis.PERMAR = undefined;
  ['data/cultura','data/deberes','data/oficinista','data/especialidades','core/util','core/config','core/storage','core/srs','core/gamify','core/stats','core/engine']
    .forEach(f=>require(path.join(ROOT,'js',f+'.js')));
  const P = globalThis.PERMAR; const be = mem(); P.Store.setBackend(be); P.Stats.resetIndex();
  return {P, be};
}
function clock(P, dateStr, hh){ const d=new Date(dateStr+'T'+(hh||'10:00')+':00'); P.Util.setClock(()=>d.getTime()); }
module.exports = {load, clock, mem, ROOT};
