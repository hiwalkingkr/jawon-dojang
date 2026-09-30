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
const V0={itemVerified:false,disposalVerified:false,similarItemsVerified:false,questionVerified:false,verifiedDate:null};
// 검증 안 된(또는 필드 없는) 문제는 출제 풀에서 제외
const ok=q=>CFG.allowUnverified||q.verification.questionVerified===true;
export async function loadData(){
  const [items,qs]=await Promise.all(['data/items.json','data/questions.json'].map(u=>fetch(u).then(r=>r.json())));
  qs.forEach(q=>q.verification={...V0,...q.verification});
  return {byId:Object.fromEntries(items.map(i=>[i.itemId,i])),all:qs,qs:qs.filter(ok)};
}
export const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
export function pickLevel(qs,level){
  const pool=qs.filter(q=>q.level===level),boss=shuffle(pool.filter(q=>q.isBoss))[0];
  const rest=shuffle(pool.filter(q=>q!==boss)).slice(0,CFG.perLevel-(boss?1:0));
  return boss?[...rest,boss]:rest;
}
export function shuffleChoices(q){
  const idx=shuffle(q.choices.map((_,i)=>i));
  return {...q,choices:idx.map(i=>q.choices[i]),answer:idx.indexOf(q.answer)};
}
