/* questionType 정의
 where     : 이 물건은 어디에 배출하나? (분류·수거함 판단)
 before    : 배출 전에 해야 할 행동은? (비우기·헹구기·분리 등)
 situation : 생활 속 구체적 상황에서 어떻게 할까?
 diff      : 여러 품목 중 다르게 배출해야 하는 것은?
 compare   : 비슷한 두 품목의 차이를 비교
 trap      : 그럴듯하지만 틀린 상식을 걸러내는 함정 문제
 composite : 재질이 하나가 아닌 제품의 처리방법을 판단하는 문제 (신규)
 condition : 같은 품목이라도 오염·내용물·분리 가능 여부 등 조건에 따라 처리방법이 달라지는 문제 (신규)
*/
import {CFG} from './config.js';
import {extHas} from './storage.js';
const V0={itemVerified:false,disposalVerified:false,similarItemsVerified:false,questionVerified:false,verifiedDate:null};
// 검증 안 된(또는 필드 없는) 문제는 출제 풀에서 제외
const ok=q=>CFG.allowUnverified||q.verification.questionVerified===true;

/* ===== 4단계: 대상(audience)·묶음(series) 구조 =====
 audience : all | elementary | teen | college | adult  (대상 키는 S.age와 동일)
 series   : core(기본 4단계 문제, audience는 반드시 all) | ext(새로운 문제 도전용, audience는 개별 대상 1개)
 기존 문항에는 이 필드가 없으므로 불러올 때 메모리에서만 audience:'all', series:'core'를 보완한다(JSON 파일은 수정하지 않음).
 ID 규칙: core는 숫자 1~22(10·12는 폐기, 재사용 금지), ext는 ext-E|T|U|A-001 형식(E=elementary, T=teen, U=college, A=adult). 전체에서 고유. */
export const AUD=['elementary','teen','college','adult'];
export const AUDS=['all',...AUD];
export const SER=['core','ext'];
const LETTER={elementary:'E',teen:'T',college:'U',adult:'A'};
const RETIRED=[10,12];
const isStr=s=>typeof s==='string'&&s.trim().length>0;
// 문항 한 개의 구조 점검. 오류 문구 배열을 돌려준다(빈 배열이면 정상). origin: 'base'(questions.json) | 'ext'(questions_ext.json). seen: 이미 사용된 ID 집합
export function checkQuestion(q,origin='base',seen=new Set()){
  const e=[];if(!q||typeof q!=='object'||Array.isArray(q))return['문항이 객체가 아님'];
  const {id,audience,series}=q;
  if(!SER.includes(series))e.push(`허용되지 않은 series: ${series}`);
  if(!AUDS.includes(audience))e.push(`허용되지 않은 audience: ${audience}`);
  if(origin==='base'&&series!=='core')e.push('questions.json의 문항은 series:core여야 함');
  if(origin==='ext'&&series!=='ext')e.push('questions_ext.json의 문항은 series:ext여야 함');
  if(series==='core'&&audience!=='all')e.push('core의 audience는 all이어야 함');
  if(series==='ext'&&!AUD.includes(audience))e.push('ext의 audience는 elementary/teen/college/adult 중 하나의 개별 대상이어야 함');
  if(id===undefined||id===null||id==='')e.push('id 없음');
  else{
    if(seen.has(String(id)))e.push(`ID 중복: ${id}`);
    if(series==='core'&&!(Number.isInteger(id)&&id>=1&&id<=22&&!RETIRED.includes(id)))e.push(`core ID는 숫자 1~22(10·12 제외)여야 함: ${id}`);
    if(series==='ext'){const m=typeof id==='string'&&/^ext-([ETUA])-\d{3}$/.exec(id);
      if(!m)e.push(`ext ID 형식 오류(ext-E-001 형식): ${id}`);else if(AUD.includes(audience)&&LETTER[audience]!==m[1])e.push(`ID의 대상 글자(${m[1]})와 audience(${audience})가 다름`)}
  }
  if(!(Number.isInteger(q.level)&&q.level>=1&&q.level<=4))e.push(`level은 1~4 정수여야 함: ${q.level}`);
  if(series==='ext'&&q.isBoss!==false)e.push('ext의 isBoss는 false여야 함');
  if(series==='core'&&q.isBoss!==undefined&&typeof q.isBoss!=='boolean')e.push('isBoss는 true/false여야 함');
  if(!isStr(q.question))e.push('question이 비어 있음');
  if(!isStr(q.explanation))e.push('explanation이 비어 있음');
  if(!Array.isArray(q.choices)||q.choices.length!==4||!q.choices.every(isStr)||new Set(q.choices).size!==4)e.push('choices는 서로 다른 문자열 4개여야 함');
  if(!(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<=3))e.push(`answer는 0~3 정수여야 함: ${q.answer}`);
  const v=q.verification;
  if(!v||typeof v!=='object'||typeof v.questionVerified!=='boolean')e.push('verification.questionVerified(true/false)가 없음');
  else if(v.questionVerified===true&&!/^\d{4}-\d{2}-\d{2}$/.test(String(v.verifiedDate)))e.push('검증 완료 문항에 verifiedDate(YYYY-MM-DD)가 없음');
  if(q.sourceLabel!==undefined&&!isStr(q.sourceLabel))e.push('sourceLabel은 비어 있지 않은 문자열이어야 함');
  return e;
}
const norm=s=>String(s).toLowerCase().replace(/[\s·.,!?"'「」『』()（）\-~:：;]/g,'');
const bg=s=>{s=norm(s);const o=new Set();for(let i=0;i<s.length-1;i++)o.add(s.slice(i,i+2));return o};
const jac=(a,b)=>{const A=bg(a),B=bg(b);if(!A.size||!B.size)return 0;let n=0;A.forEach(x=>B.has(x)&&n++);return n/(A.size+B.size-n)};
// 중복 점검: 같은 문제 반복, 문장만 살짝 바꾼 문제를 찾아낸다. severity 'error'=사실상 같은 문제, 'review'=사람이 확인할 것
export function auditDuplicates(list,{simQ=0.8,simA=0.5}={}){
  // 7단계 보완: 중복 판단 기준은 품목이 아니라 「대상·품목·교육 목적(유형)·정답·질문의 실질적 동일성」이다.
  //  - 서로 다른 대상(audience)의 문제는 같은 품목·같은 정답이어도 중복으로 보지 않는다(기본 문제 'all'은 모든 대상과 같은 문제은행에 속한다).
  //  - 같은 문제은행 안에서만: 질문·보기·정답이 모두 같으면 'same-question', 같은 품목이고 같은 유형·같은 정답이면 'same-item-same-purpose',
  //    같은 품목이고 질문이 비슷하면서 정답이 같으면 'near-question', 같은 품목(또는 품목 정보 없음)이고 보기 세트가 같으면 'same-choices'.
  //  - 같은 품목·같은 정답이지만 유형(교육 목적)이 다르면 오류가 아니라 'review'(사람이 확인) 로 둔다.
  const out=[],ans=x=>norm(x.choices[x.answer]);
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const a=list[i],b=list[j];
    if(a.audience!==b.audience&&a.audience!=='all'&&b.audience!=='all')continue;
    const ca=a.choices.map(norm).sort().join('|'),cb=b.choices.map(norm).sort().join('|');
    const sq=jac(a.question,b.question),sameAns=ans(a)===ans(b),sameItem=!!a.itemId&&a.itemId===b.itemId,otherFact=!!a.itemId&&!!b.itemId&&a.itemId!==b.itemId;
    let type=null,severity='error';
    if(ca===cb&&norm(a.question)===norm(b.question)&&sameAns)type='same-question';
    else if(otherFact)type=null;
    else if(sameItem&&a.questionType&&a.questionType===b.questionType&&sameAns)type='same-item-same-purpose';
    else if(sameItem&&sq>=simQ&&sameAns)type='near-question';
    else if(ca===cb)type='same-choices';
    else if(sameItem&&sameAns){type='same-item-same-answer';severity='review'}
    if(type)out.push({a:a.id,b:b.id,type,severity,sim:+sq.toFixed(2)});
  }
  return out;
}
// 필수 파일(items, questions)은 예전과 똑같이 읽고, 신규 파일(questions_ext.json)은 없거나 깨져 있어도 빈 목록으로 처리한다
const optional=u=>fetch(u).then(r=>r.ok?r.json():[]).then(x=>Array.isArray(x)?x:[]).catch(()=>[]);
export async function loadData(){
  const [items,qs]=await Promise.all(['data/items.json','data/questions.json'].map(u=>fetch(u).then(r=>r.json())));
  const extRaw=await optional('data/questions_ext.json');
  qs.forEach(q=>{q.verification={...V0,...q.verification};q.audience=q.audience??'all';q.series=q.series??'core'}); // 메모리에서만 보완
  extRaw.forEach(q=>{if(q&&typeof q==='object'){q.verification={...V0,...q.verification};q.audience=q.audience??'all';q.series=q.series??'core'}});
  const seen=new Set(),issues=[],valid=[];
  const take=(list,origin)=>list.forEach(q=>{const e=checkQuestion(q,origin,seen);
    if(e.length){issues.push({id:q?.id,origin,errors:e});console.warn('[문항 제외]',origin,q?.id,e.join(' / '));return}
    seen.add(String(q.id));valid.push(q)});
  take(qs,'base');const nBase=valid.length;take(extRaw,'ext');
  const base=valid.slice(0,nBase),ext=valid.slice(nBase);
  return {byId:Object.fromEntries(items.map(i=>[i.itemId,i])),all:qs,qs:base.filter(ok),ext:ext.filter(ok),issues};
}
export const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
export function pickLevel(qs,level){
  const pool=qs.filter(q=>q.level===level),boss=shuffle(pool.filter(q=>q.isBoss))[0];
  const n=CFG.draw?.[level]??CFG.perLevel,rest=shuffle(pool.filter(q=>q!==boss)).slice(0,n-(boss?1:0));
  return boss?[...rest,boss]:rest;
}
export function shuffleChoices(q){
  const idx=shuffle(q.choices.map((_,i)=>i));
  return {...q,choices:idx.map(i=>q.choices[i]),answer:idx.indexOf(q.answer)};
}
// ===== 새로운 문제 도전(ext) 출제 =====
// 대상 키가 없거나 올바르지 않으면 앱의 대상 표시와 같이 adult로 본다
export const audOf=a=>AUD.includes(a)?a:'adult';
// 대상·단계별 문제 수 집계(점검·보고용)
export function extCounts(ext){const r={};AUD.forEach(a=>r[a]={total:0,1:0,2:0,3:0,4:0});ext.forEach(q=>{const c=r[q.audience];if(c){c.total++;c[q.level]++}});return r}
/* 한 회분 선택. ext: 검증 통과한 ext 문항 목록(D.ext), age: S.age, S: 저장 상태(S.ext.solved로 해결 여부 판단)
 규칙: ① 현재 대상(audience) 문제만 ② 미해결 우선(이미 푼 문제는 후순위로 부족분만 채움) ③ 미해결은 level 오름차순(같은 level은 무작위) ④ 최대 n문제, 부족하면 다른 대상 문제를 가져오지 않음
 반환: {audience, status, list, n, poolSize, unsolved, solved, newCount, fillCount, missing}
  status: empty(이 대상의 신규 문제 없음) | exhausted(전부 해결함) | partial(미해결이 n개보다 적음) | full(미해결이 n개 이상)
  missing: n - list.length (0보다 크면 이 대상의 문제가 n개에도 못 미침) */
export function pickExt(ext,age,S,{n=CFG.ext?.n??5,fillSolved=true}={}){
  const audience=audOf(age),pool=(ext||[]).filter(q=>q.series==='ext'&&q.audience===audience);
  const done=q=>!!S?.ext?.solved&&extHas(S,q.id),byLevel=a=>shuffle(a).sort((x,y)=>x.level-y.level);
  const un=byLevel(pool.filter(q=>!done(q))),so=byLevel(pool.filter(done));
  const list=(fillSolved?[...un,...so]:un).slice(0,n),newCount=Math.min(un.length,n);
  const status=!pool.length?'empty':!un.length?'exhausted':un.length<n?'partial':'full';
  return {audience,status,list,n,poolSize:pool.length,unsolved:un.length,solved:so.length,newCount,fillCount:list.length-newCount,missing:n-list.length};
}

// ===== 7단계: 문제은행 출제(대상·단계·출제 이력 기반) =====
/* 문제은행 = 기본 문제(core, 모든 대상 공통) + 검증된 신규 문제(ext, 대상별). 현재 대상(audience)에 해당하는 문제만 쓴다. */
export const bankPool=(D,age)=>{const a=audOf(age);return [...D.qs,...D.ext].filter(q=>q.audience==='all'||q.audience===a)};
// 대상의 문제은행 규모·단계별 문제 수·만난 문제 수(그 대상의 출제 이력 기준)
const seenMap=(S,age)=>S?.hist?.byAud?.[audOf(age)]||{};
export function bankInfo(D,age,S){
  const pool=bankPool(D,age),byLevel={1:0,2:0,3:0,4:0},sm=seenMap(S,age);let seen=0;
  pool.forEach(q=>{byLevel[q.level]++;if((sm[String(q.id)]||0)>0)seen++});
  return {total:pool.length,byLevel,seen};
}
// 문항이 다루는 품목 전체(정답 품목 + 보기·설명에 쓰인 품목). 기본 문제는 itemId 하나.
const involvedOf=q=>new Set(q.evidence?.records?.length?q.evidence.records.map(r=>r.itemId):String(q.itemId||'').split('+'));
/* 한 단계 한 회분 선택(기본 5문제). 규칙:
 ① 현재 대상의 문제만, 해당 단계 문제만 ② 보스 문제가 있으면 1문제를 마지막에 둔다
 ③ 그 대상에서 아직 못 만난(출제 횟수가 적은) 문제를 우선 — 모두 만났으면 출제 횟수가 가장 적은 문제부터, 같은 횟수 안에서는 무작위(문제은행을 한 바퀴 돌면 전체가 다시 섞여 순서가 달라진다)
 ④ 한 회분 안에서 같은 품목은 한 번만(정답 품목이 다른 문항의 보기에 나오는 것도 가능하면 피함), 같은 질문 문구는 한 번만, 같은 정답 문구는 가능하면 2번까지
 — ④는 문제은행 전체의 중복 제한이 아니라 한 회차의 다양성 제한이며, 남은 문제가 부족하면 완화한다. 대상이 다르면 같은 품목의 문제도 각자의 문제은행에서 따로 출제된다 */
export function pickPlay(D,age,level,S,{n}={}){
  const N=n??CFG.draw?.[level]??CFG.perLevel,pool=bankPool(D,age).filter(q=>q.level===level),sm=seenMap(S,age);
  const seenOf=q=>sm[String(q.id)]||0;
  const byLeast=a=>shuffle(a).sort((x,y)=>seenOf(x)-seenOf(y));
  const boss=byLeast(pool.filter(q=>q.isBoss))[0],normal=pool.filter(q=>!q.isBoss),need=N-(boss?1:0);
  const tiers=[...new Set(normal.map(seenOf))].sort((x,y)=>x-y);
  const out=[],targets=new Set(),touched=new Set(),stems=new Set(),ans={},ansText=x=>norm(x.choices[x.answer]);
  const tid=x=>String(x.itemId||'');
  for(const tv of tiers){
    const grp=shuffle(normal.filter(x=>seenOf(x)===tv));
    for(const strict of [true,false])for(const x of grp){
      if(out.length>=need)break;if(out.includes(x))continue;
      const inv=involvedOf(x);
      if(strict&&(targets.has(tid(x))||touched.has(tid(x))||[...inv].some(i=>targets.has(i))||stems.has(norm(x.question))||(ans[ansText(x)]||0)>=2))continue;
      out.push(x);targets.add(tid(x));inv.forEach(i=>touched.add(i));stems.add(norm(x.question));ans[ansText(x)]=(ans[ansText(x)]||0)+1;
    }
    if(out.length>=need)break;
  }
  return boss?[...shuffle(out),boss]:shuffle(out);
}
