import {loadData,pickLevel,shuffle} from './questions.js';
import * as G from './game.js';
import {load,save} from './storage.js';
import {CFG} from './config.js';
const $=document.getElementById('app');
const N=[['🟢','분리배출 탐험가','초급'],['🔵','분리배출 해결사','중급'],['🟠','자원순환 탐정','고급'],['🔴','자원순환 마스터','전문가']];
// 대상별: 아이콘, 이름, 시간배율, 캐릭터 크기 클래스 (엔진·문제는 공통)
const AGE={elementary:['👦','초등학생',1.5,'big'],teen:['🧑','청소년',1.2,'mid'],college:['🎓','대학생',.9,'sm'],adult:['👨','성인',1,'sm']};
const ICON={'pet-clear':'🧴','paper-pack':'🧃','paper-cup':'🥤','soju-bottle':'🍾','power-bank':'🔋','delivery-box':'📦','beverage-can':'🥫','shampoo-pump':'🧴','ramen-bag':'🍜','pizza-box':'🍕','old-phone':'📱','device-battery':'🔋','vinyl-pack':'🛍️','heat-glass':'🥛','broken-glass':'🥛'};
const CREDIT='<p class="credit">제작 · 박원영 | 숲친구 들꽃<br>숲해설가 · 환경교육사</p>';
const nm=l=>N[l-1]||['📕','오답 복습','오답 복습'];
let D,S=load(),g,t;
const A=()=>AGE[S.age]||AGE.adult;
const ask=q=>q.questionByAge?.[S.age]?.question||q.question;   // 연령별 표현이 없으면 기본 question
const char=m=>`<div class="charrow"><span class="char ${A()[3]}">🌼</span><span>${m}</span></div>`;
const stamps=()=>`<div class="stamps">${S.stamps.map((s,i)=>`<span class="${s?'on':''}">${s?N[i][0]:'○'}</span>`).join('')}</div>`;
const cnt=l=>D.qs.filter(q=>q.level===l).length;
const persist=()=>{S.run=g;save(S)};
const home=()=>{clearInterval(t);$.innerHTML=`<section class="c"><div class="big">♻️</div><h1>우리동네 자원순환 도장깨기</h1><h2>알고 버리면 쓰레기가 아니라 자원입니다.</h2><p>우리 집에서 매일 나오는 물건들,<br>제대로 버리고 있을까요?</p>${S.age?`<button class="pri" data-a="levels">▶ 게임 시작 (${A()[0]} ${A()[1]})</button>`:''}<p><b>♻️ 나에게 맞는 게임으로 시작하기</b></p>${Object.entries(AGE).map(([k,v])=>`<button data-a="age" data-v="${k}">${v[0]} ${v[1]}</button>`).join('')}<small>환경부 생활폐기물 분리배출 누리집 기준</small>${CFG.allowUnverified?'<div class="dev">⚠ 테스트 모드: 검증 전 문제 포함</div>':''}${CREDIT}</section>`};
const levels=()=>{clearInterval(t);$.innerHTML=`<section class="c">${stamps()}${S.run&&!S.run.over?'<button class="pri" data-a="resume">♻️ 이어서 하기</button>':''}${N.map((n,i)=>{const l=i+1,open=l===1||S.stamps[i-1],c=cnt(l);return`<button class="card" data-a="play" data-l="${l}" ${open&&c?'':'disabled'}>${n[0]} ${n[1]} · ${n[2]}<small>${!open?'🔒 잠김':c?`문제 ${c}개`:'검증된 문제 준비 중'}</small></button>`}).join('')}<button data-a="notes">📒 나의 오답노트 (${S.wrong.length})</button><button data-a="home">⚙ 대상 변경 (${A()[1]})</button>${S.stamps.every(Boolean)?'<button data-a="final">🏆 마스터 화면</button>':''}</section>`};
const play=(l,list,mode)=>{list=list||pickLevel(D.qs,l);if(!list.length)return levels();g=G.start(list,l,mode);if(mode==='retry')g.ids=list.map(q=>q.id);quiz()};
const quiz=()=>{clearInterval(t);const q=g.list[g.i],sec=Math.round((q.timeLimit||(q.isBoss?CFG.bossTime:CFG.time[q.level]))*A()[2]),n=nm(g.level);g.phase='ask';persist();
  $.innerHTML=`<section><div class="top"><span>${n[0]} ${n[1]}</span><span>문제 ${g.i+1} / ${g.list.length}</span></div><div class="top"><span>${'❤️'.repeat(g.hearts)+'🖤'.repeat(CFG.hearts-g.hearts)}</span><span>${g.score}점</span><span>⏱️ <b id="tm">${sec}</b>초</span></div><div class="bar"><i id="bar"></i></div>${q.isBoss&&!g.retry?'<p class="boss">👑 마지막 도전입니다!</p>':''}<div class="ico">${ICON[q.itemId]||'♻️'}</div><h3>${ask(q)}</h3>${q.choices.map((c,i)=>`<button class="ch" data-a="pick" data-i="${i}">${'①②③④'[i]} ${c}</button>`).join('')}<div class="row"><button class="hint" data-a="hint">💡 힌트</button><button class="pz" data-a="pause">⏸️</button></div><p id="hint"></p></section>`;
  const st=Date.now();t=setInterval(()=>{const r=sec-(Date.now()-st)/1000;document.getElementById('bar').style.width=Math.max(0,r/sec*100)+'%';document.getElementById('tm').textContent=Math.max(0,Math.ceil(r));if(r<=0)pick(-1)},250)};
const pause=()=>{clearInterval(t);persist();$.innerHTML=`<section class="c"><h2>⏸️ 게임을 잠시 멈췄어요</h2><button class="pri" data-a="cont">계속하기</button><button data-a="restart">처음부터</button><button data-a="leave">게임 나가기</button></section>`};
const pick=i=>{clearInterval(t);const q=g.list[g.i],ok=G.answer(g,i),it=D.byId[q.itemId]||{},e=q.educationalMessage;
  S.wrong=S.wrong.filter(w=>w.id!==q.id);if(!ok)S.wrong.push(g.wrong.at(-1));g.phase='explained';persist();
  $.innerHTML=`<section class="c"><h2>${ok?'🎉 정답!':i<0?'⏰ 시간이 지났어요':'❌ 아쉽습니다.'}</h2>${ok?'':`<p>정답: <b>${q.choices[q.answer]}</b></p>`}${char(ok?'😊 정답이에요!':'🤔 조금 헷갈렸네요.')}<h4>왜 그럴까요?</h4><p>${q.explanation}</p>${e?`<p class="edu">🌱 자원순환 한마디<br><small>(환경부 공식 배출방법이 아닌 교육 메시지)</small><br>${e}</p>`:''}${q.localVariation||q.localRuleNote?'<p class="note">※ 배출방법은 지역에 따라 다를 수 있습니다. 거주 지역의 지자체 기준을 확인하세요.</p>':''}<small>출처: ${it.source?.name||'생활폐기물 분리배출 누리집'}${q.verification.questionVerified?'':' · ⚠ 검증 전 문제'}</small><button class="pri" data-a="next">다음</button></section>`};
const result=()=>{const ok=g.over==='clear',n=nm(g.level);if(ok&&!g.retry){S.stamps[g.level-1]=true}S.run=null;save(S);
  $.innerHTML=`<section class="c"><h2>${ok?(g.retry?'📒 오답 복습 완료!':'🎉 도장깨기 완료!'):'💪 다시 도전해 볼까요?'}</h2>${ok&&!g.retry?`<div class="stamp pop">${n[0]}</div>`:''}<h3>${n[1]}</h3><p>${g.list.length}문제 중 <b>${g.correct}개</b> 정답<br>점수 ${g.score}점 · 최고 연속 ${g.best}${g.retry?'':`<br>🏅 획득 도장 ${S.stamps.filter(Boolean).length}개`}<br>📒 오답 ${g.wrong.length}개</p>${g.wrong.length?'<button data-a="notes">오답 다시 보기</button>':''}${ok&&!g.retry&&g.level<4?`<button class="pri" data-a="play" data-l="${g.level+1}">${N[g.level][0]} ${N[g.level][2]} 도전하기</button>`:''}<button data-a="${g.retry?'retry':'play'}" data-l="${g.level}">다시 도전</button><button data-a="share">친구에게 공유하기</button><button data-a="levels">레벨 선택</button>${CREDIT}</section>`};
const share=async()=>{const url=location.href.split('?')[0],n=nm(g.level),text=`♻️ 우리동네 자원순환 도장깨기\n\n나는 ${n[1]}에 도전했어요!\n${g.list.length}문제 중 ${g.correct}개 정답 🏅\n\n여러분도 도전해 보세요!`;
  try{if(navigator.share)await navigator.share({text,url});else{await navigator.clipboard.writeText(text+'\n'+url);alert('공유 문구와 링크를 복사했어요.')}}catch{}};
const notes=()=>{$.innerHTML=`<section><h2>📒 나의 오답노트</h2>${S.wrong.map(w=>`<p><b>${D.byId[w.item]?.itemName||w.item}</b><br>내 답: ${w.pick}<br>정답: ${w.answer}<br><small>${w.e}</small></p><hr>`).join('')||'<p>아직 틀린 문제가 없어요 👍</p>'}${S.wrong.length?'<button class="pri" data-a="retry">틀린 문제 다시 도전하기</button>':''}<button data-a="levels">돌아가기</button></section>`};
const final=()=>{$.innerHTML=`<section class="c"><div class="stamp pop">🏆</div><h1>자원순환 마스터</h1>${stamps()}<p>이제 버리기 전에 한 번 더 생각하는 사람이 되었습니다.</p><button data-a="levels">돌아가기</button>${CREDIT}</section>`};
const resumePrompt=()=>{const r=S.run;$.innerHTML=`<section class="c"><h2>♻️ 이어서 할까요?</h2><p>${nm(r.level)[2]} · ${(c=>c?c+'번 문제까지 진행했습니다.':'아직 첫 문제를 풀기 전입니다.')(r.phase==='explained'?r.i+1:r.i)}</p><button class="pri" data-a="resume">이어서 하기</button><button data-a="drop">처음부터</button></section>`};
const act={home,levels,notes,final,share,
  age:b=>{S.age=b.dataset.v;save(S);levels()},
  play:b=>play(+b.dataset.l),pick:b=>pick(+b.dataset.i),
  next:()=>{G.next(g);g.over?result():quiz()},
  hint:()=>{g.hint=true;document.getElementById('hint').innerHTML=char('💡 '+(g.list[g.i].hint||'힌트가 없어요.'))},
  pause,cont:()=>quiz(),
  restart:()=>g.retry?act.retry(g.ids):play(g.level),
  leave:()=>{persist();levels()},
  resume:()=>{g=S.run;if(g.phase==='explained'){G.next(g);if(g.over)return result()}quiz()},drop:()=>{S.run=null;save(S);home()},
  retry:x=>{const ids=Array.isArray(x)?x:S.wrong.map(w=>w.id);play(0,shuffle(D.qs.filter(q=>ids.includes(q.id))),'retry')}};
$.onclick=e=>{const b=e.target.closest('[data-a]');b&&act[b.dataset.a]?.(b)};
// 전화·메시지 등으로 화면을 벗어나면 문제 중이던 게임을 자동으로 일시정지(타이머 오답 방지)
document.addEventListener('visibilitychange',()=>{if(document.hidden&&g&&!g.over&&document.getElementById('bar'))pause()});
loadData().then(d=>{D=d;S.run&&!S.run.over&&S.run.list?.length?resumePrompt():home()}).catch(()=>{$.textContent='데이터를 불러오지 못했습니다. 웹서버(HTTPS)에서 열어 주세요.'});
