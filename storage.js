const K='jawon-doljang-v1'; // 저장 키는 바꾸지 않는다(기존 이용자 기록 보존)
// 기본값은 불러올 때마다 새로 만든다(배열·객체를 여러 번 공유하지 않기 위해)
const DEF=()=>({stamps:[false,false,false,false],wrong:[],ext:{solved:{}},hist:{byAud:{elementary:{},teen:{},college:{},adult:{}}}});
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
// 확장 도장 기록(ext): 이전 버전 저장값에는 없으므로 불러올 때 항상 보완한다. 알 수 없는 값이 들어 있어도 안전하게 복구
const fixExt=e=>({...(isObj(e)?e:{}),solved:isObj(e?.solved)?{...e.solved}:{}});
// 출제 이력(hist.byAud): 대상(초등·청소년·대학생·성인)별로 문제 ID별 출제 횟수를 따로 기록한다.
// 한 대상의 이력이 다른 대상의 출제에 영향을 주지 않는다(기본 문제처럼 모든 대상이 공유하는 문제도 대상별로 따로 센다).
// 이전 버전 저장값에는 없으므로 불러올 때 항상 보완하고, 대상 구분 없이 저장된 옛 이력(hist.seen)은 저장 당시 대상으로 옮긴다.
const AUDK=['elementary','teen','college','adult'];
const cleanMap=m=>{const o={};if(isObj(m))for(const[k,v]of Object.entries(m))if(Number.isFinite(v)&&v>0)o[k]=Math.floor(v);return o};
const fixHist=(h,age)=>{const byAud={};AUDK.forEach(a=>byAud[a]=cleanMap(h?.byAud?.[a]));
  const legacy=cleanMap(h?.seen);if(Object.keys(legacy).length){const a=AUDK.includes(age)?age:'adult';for(const[k,v]of Object.entries(legacy))byAud[a][k]=(byAud[a][k]||0)+v}
  return{byAud}};
export const load=()=>{let s={};try{const j=JSON.parse(localStorage.getItem(K));if(isObj(j))s=j}catch{}return{...DEF(),...s,ext:fixExt(s.ext),hist:fixHist(s.hist,s.age)}};
export const histAdd=(s,aud,id)=>{const m=s.hist.byAud[aud]||(s.hist.byAud[aud]={}),k=String(id);m[k]=(m[k]||0)+1};
export const histCount=(s,aud,id)=>s.hist?.byAud?.[aud]?.[String(id)]||0;
export const save=s=>{try{localStorage.setItem(K,JSON.stringify(s))}catch{}};
// 확장 도장: 신규 문제를 처음 정답으로 해결했을 때 문제당 1개. 기본 도장(stamps 배열)과 별도로 관리한다.
export const extHas=(s,id)=>Object.prototype.hasOwnProperty.call(s.ext.solved,String(id));
export const extAdd=(s,id)=>{if(extHas(s,id))return false;s.ext.solved[String(id)]=1;return true}; // true=새로 지급, false=이미 받음(중복 지급 안 함)
export const extCount=s=>Object.keys(s.ext.solved).length;
export const totalStamps=s=>s.stamps.filter(Boolean).length+extCount(s);
