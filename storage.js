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
export const save=s=>{try{localStorage.setItem(K,JSON.stringify(s));return true}catch{return false}}; // true=쓰기 예외 없음(기록 확인은 saveChecked)
// 확장 도장: 신규 문제를 처음 정답으로 해결했을 때 문제당 1개. 기본 도장(stamps 배열)과 별도로 관리한다.
export const extHas=(s,id)=>Object.prototype.hasOwnProperty.call(s.ext.solved,String(id));
export const extAdd=(s,id)=>{if(extHas(s,id))return false;s.ext.solved[String(id)]=1;return true}; // true=새로 지급, false=이미 받음(중복 지급 안 함)
export const extCount=s=>Object.keys(s.ext.solved).length;
export const totalStamps=s=>s.stamps.filter(Boolean).length+extCount(s);

// ===== 저장 확인: 쓰기가 예외 없이 끝나도 실제로 기록됐는지, 저장 후 다시 읽어 같은 값인지 확인한다 =====
export const saveChecked=s=>{try{const str=JSON.stringify(s);localStorage.setItem(K,str);return localStorage.getItem(K)===str}catch{return false}};
const PROT=['stamps','ext','hist','wrongByAud','wrongMig','age','run'];
export const diffStored=s=>{try{const j=JSON.parse(localStorage.getItem(K));return PROT.filter(k=>JSON.stringify(j?.[k])!==JSON.stringify(s[k]))}catch{return PROT}}; // 불일치 원인 기록용

// ===== 대상별 오답(wrongByAud) · 이전 표식(wrongMig) =====
// 기존 wrong(원본)은 이 파일의 어떤 함수도 수정·삭제하지 않는다. DEF·보정 함수는 두 필드를 만들지 않는다(키 존재 여부로 이전 필요 상태를 판정).
export const MIG_V=1;
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const nat=n=>Number.isInteger(n)&&n>=0;
const okByAud=b=>isObj(b)&&AUDK.every(a=>Array.isArray(b[a]));
const okMig=m=>isObj(m)&&Number.isInteger(m.v)&&m.v>=1&&nat(m.moved)&&nat(m.b)&&nat(m.c)&&(!hasOwn(m,'n')||nat(m.n))&&(!hasOwn(m,'dup')||nat(m.dup));
// 상태 판정(위에서부터): S0 키 둘 다 없음 / S1 정상 / S2a·S2b 표식 없음+대상별 오답 유효·무효 / S3 낮은 버전(미구현·도달 불가) /
// S4a·S4b 표식 무효+대상별 오답 유효·없음/무효 / S4c 상위 버전 / S5 표식 유효+대상별 오답 없음·무효
export const wrongState=s=>{
  const hm=hasOwn(s,'wrongMig'),hb=hasOwn(s,'wrongByAud'),bOk=hb&&okByAud(s.wrongByAud);let code;
  if(!hm)code=!hb?'S0':bOk?'S2a':'S2b';
  else if(!okMig(s.wrongMig))code=bOk?'S4a':'S4b';
  else if(!bOk)code='S5';
  else code=s.wrongMig.v===MIG_V?'S1':s.wrongMig.v<MIG_V?'S3':'S4c';
  const rw=code==='S1'||code==='S2a'||code==='S4a'; // 읽기·추가·수정은 이 세 상태에서만 허용. 나머지는 차단(값은 그대로 둔다)
  return{code,canRead:rw,canWrite:rw}};
// 오답 기록 한 건의 구조·자료형 검사: 객체, id(숫자 또는 문자열), pick·answer·e는 문자열(빈 문자열 허용), item은 문자열이거나 키 없음
const recOk=w=>isObj(w)&&hasOwn(w,'id')&&(typeof w.id==='number'||typeof w.id==='string')&&typeof w.pick==='string'&&typeof w.answer==='string'&&typeof w.e==='string'&&(!hasOwn(w,'item')||typeof w.item==='string');
const knownId=id=>(typeof id==='number'&&Number.isInteger(id)&&id>=1)||(typeof id==='string'&&/^ext-[ETUA]-\d{3}$/.test(id)); // 관측된 ID 형식
// 분류: 구조 검사 → ID 형식 → 현재 문항과 자료형·값이 모두 일치(A) / 일치하지 않음(B). 구조·형식 문제는 C. 어떤 값도 변환하지 않는다.
export const classifyWrong=(w,lookup)=>{if(!recOk(w)||!knownId(w.id))return{k:'C'};const q=lookup(w.id);return q?{k:'A',q}:{k:'B'}};
// 이전(S0에서만): 원본 wrong은 읽기만 한다. 같은 (대상·자료형·ID) A 기록은 원본에서 가장 뒤의 기록을 대표로 한다.
// 모든 수치의 단위는 '원본 배열의 원소 수': n=moved+dup+b+c. 불변식이 어긋나면 아무것도 반영하지 않고 중단한다.
export const migrateWrong=(s,lookup)=>{
  const src=Array.isArray(s.wrong)?s.wrong:[],n=src.length,cur=AUDK.includes(s.age)?s.age:null;
  if(!cur)return{ok:false,why:'대상 미선택'};
  let a=0,b=0,c=0;const reps=new Map();
  src.forEach((w,idx)=>{const r=classifyWrong(w,lookup);if(r.k==='B'){b++;return}if(r.k==='C'){c++;return}
    const aud=r.q.audience&&r.q.audience!=='all'?r.q.audience:cur; // ext는 문항의 대상, 기본(core) 문항은 이전 시점의 선택 대상
    if(!AUDK.includes(aud)){c++;return}
    a++;reps.set(aud+'|'+typeof w.id+'|'+w.id,{aud,idx})}); // 같은 키는 뒤의 기록이 대표
  const list=[...reps.values()].sort((x,y)=>x.idx-y.idx),by={elementary:[],teen:[],college:[],adult:[]};
  list.forEach(({aud,idx})=>{const w=src[idx],o={id:w.id};if(hasOwn(w,'item'))o.item=w.item;o.pick=w.pick;o.answer=w.answer;o.e=w.e;by[aud].push(o)});
  const moved=list.length,dup=a-moved,total=AUDK.reduce((t,k)=>t+by[k].length,0);
  if(n!==moved+dup+b+c||total!==moved)return{ok:false,why:'집계 불변식 불일치',n,a,moved,dup,b,c,total};
  s.wrongByAud=by;s.wrongMig={v:MIG_V,moved,b,c,n,dup};
  return{ok:true,n,a,moved,dup,b,c}};
// 읽기: 현재 대상의 기록만(구조가 불량한 원소는 화면에서만 제외하고 삭제하지 않는다). 상태가 허용하지 않으면 빈 목록.
export const wrongList=(s,age)=>{if(!wrongState(s).canRead)return[];const a=AUDK.includes(age)?age:'adult';return s.wrongByAud[a].filter(recOk)};
// 쓰기: 같은 대상·같은 문항(자료형까지 같은 ID)의 기록만 제거하고, 오답이면 끝에 추가한다. 상태가 허용하지 않으면 아무것도 바꾸지 않고 false.
export const wrongPut=(s,aud,id,rec)=>{if(!wrongState(s).canWrite)return false;const a=AUDK.includes(aud)?aud:'adult';
  s.wrongByAud[a]=s.wrongByAud[a].filter(w=>!(isObj(w)&&w.id===id));
  if(rec){const o={id:rec.id};if(typeof rec.item==='string')o.item=rec.item;o.pick=rec.pick;o.answer=rec.answer;o.e=rec.e;s.wrongByAud[a].push(o)}return true};
