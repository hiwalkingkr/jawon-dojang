import {loadData,pickPlay,bankInfo,shuffle,audOf,AUD} from './questions.js';
import * as G from './game.js';
import {load,save,saveChecked,diffStored,extAdd,histAdd,wrongState,wrongList,wrongPut,migrateWrong} from './storage.js';
import {CFG} from './config.js';
const $=document.getElementById('app');
const N=[['🟢','분리배출 탐험가','초급'],['🔵','분리배출 해결사','중급'],['🟠','자원순환 탐정','고급'],['🔴','자원순환 마스터','전문가']];
// 대상별: 아이콘, 이름, 시간배율, 캐릭터 크기 클래스 (엔진·문제는 공통)
const AGE={elementary:['👦','초등학생',1.5,'big'],teen:['🧑','청소년',1.2,'mid'],college:['🎓','대학생',.9,'sm'],adult:['👨','성인',1,'sm']};
const ICON={'pet-clear':'🧴','paper-pack':'🧃','paper-cup':'🥤','soju-bottle':'🍾','power-bank':'🔋','delivery-box':'📦','beverage-can':'🥫','shampoo-pump':'🧴','ramen-bag':'🍜','pizza-box':'🍕','old-phone':'📱','device-battery':'🔋','vinyl-pack':'🛍️','heat-glass':'🥛','broken-glass':'🥛'};
const CREDIT='<p class="credit">제작 · 박원영 | 숲친구 들꽃<br>산림교육전문가 · 환경교육사</p>';
const nm=l=>N[l-1]||['📕','오답 복습','오답 복습'];
const lab=x=>nm(x.level);                                    // 게임 객체(g, S.run)의 이름
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qById=id=>D.qs.find(q=>q.id===id)||D.ext.find(q=>q.id===id);
let D,S=load(),g;
const T={t:null,tt:null,t0:0,rem0:0,run:false};      // 타이머(메모리 전용): 표시·주기 저장 틱 / 만료용 타이머 / 구간 시작 시각 / 구간 시작 시 남은 시간(ms)
const fm={on:false,shown:false,verifyNext:false,prev:''}; // 저장 실패 모드(메모리 전용)
let cur='m',lockUntil=0,lastEx=null;                      // 현재 화면(m 메뉴·q 문제·p 일시정지·x 해설·r 결과·n 저장 실패 안내) · 입력 잠금 해제 시각 · 마지막 해설 정보
const A=()=>AGE[S.age]||AGE.adult;
const ask=q=>q.questionByAge?.[S.age]?.question||q.question;   // 연령별 표현이 없으면 기본 question
const char=m=>`<div class="charrow"><span class="char ${A()[3]}">🌼</span><span>${m}</span></div>`;
const stamps=()=>`<div class="stamps">${S.stamps.map((s,i)=>`<span class="${s?'on':''}">${s?N[i][0]:'○'}</span>`).join('')}</div>`;
const bankLine=()=>{const b=bankInfo(D,S.age,S);return `<p class="extcount">기본 도장 ${S.stamps.filter(Boolean).length} / 4 · 📚 문제은행 ${b.total}문제 중 ${b.seen}문제를 만났어요</p>`};
const cnt=l=>Math.min(CFG.draw?.[l]??CFG.perLevel,bankInfo(D,S.age,S).byLevel[l]);
const stopTimers=()=>{clearInterval(T.t);clearTimeout(T.tt);T.t=T.tt=null;T.run=false};
const remainNow=()=>T.rem0-(performance.now()-T.t0);                // 경과 시간은 시스템 시계가 아니라 단조 시계로 계산한다
const clampMs=x=>Math.max(0,Math.min(g.limitMs,Math.round(x)));
const bump=()=>{g.seq=(g.seq|0)+1;lockUntil=performance.now()+CFG.lockMs}; // 화면마다 turn 표식을 올리고 입력 잠금(시험값)을 건다
// ===== 저장: 쓰기 반환값만 믿지 않고 저장 후 다시 읽어 값이 같은지 확인한다 =====
const tryFull=()=>{const ok=saveChecked(S);if(!ok)console.warn('[저장 확인 실패] 저장값과 메모리가 다른 항목:',diffStored(S));return ok};
const tryDegraded=()=>{const {run,...rest}=S;return saveChecked(rest)};   // 강등 저장: 진행 중 게임(S.run)만 뺀다. 다른 기록은 그대로 저장
const commit=light=>{
  if(fm.on){if(light)return false;                         // 저장 실패 모드: 주기 저장은 중단하고 이벤트마다 1회만 시도
    if(tryFull()){fm.on=false;fm.verifyNext=true;return true}  // 복구: 최신 메모리 상태를 저장하고 읽기 대조가 일치해야만 정상 모드로 복귀
    if(g&&!g.over)tryDegraded();maybeNotice();return false}
  const ok=light&&!fm.verifyNext?save(S):tryFull();
  if(ok)fm.verifyNext=false;else onFail();
  return ok};
const persist=light=>{S.run=g;return commit(light)};
const inGame=()=>g&&!g.over&&(cur==='q'||cur==='p'||cur==='x');
const maybeNotice=()=>{if(fm.shown||!inGame())return;fm.shown=true;fm.prev=cur;failView()};
const onFail=()=>{fm.on=true;
  if(g&&!g.over&&cur==='q'&&T.run){const r=remainNow();stopTimers();g.remainMs=clampMs(r);if(r<=0){g.phase='ask';pick(-1)}} // 1) 시계 정지(남은 시간은 메모리에 유지). 0 이하이면 정지 대신 시간 초과 처리
  if(g&&!g.over)tryDegraded();                                                                                          // 2) 강등 저장
  maybeNotice()};                                                                                                        // 3) 안내(최초 1회, 게임 화면일 때만)
const failView=()=>{stopTimers();cur='n';lockUntil=performance.now()+CFG.lockMs;
  $.innerHTML=`<section class="c"><div class="big">⚠️</div><p class="warn">진행 상태를 저장하지 못했어요. 지금부터의 기록은 저장되지 않을 수 있고, 새로고침하거나 종료하면 사라질 수 있어요. 이 안내는 저장을 보장하는 기능이 아니에요.</p><button class="pri" data-a="failgo">저장 없이 계속하기</button><button data-a="failhome">홈으로</button></section>`};
const failgo=()=>{if(cur!=='n'||performance.now()<lockUntil)return;const k=fm.prev;if(k==='q'){renderQ();startTimer()}else if(k==='p')pauseView();else if(k==='x')explain();else levels()};
const failhome=()=>{if(cur!=='n'||performance.now()<lockUntil)return;stopTimers();S.run=null;g=undefined;commit(false);home()};
// ===== 진행 중 게임 저장값 판정: ok(정상) / legacy(구버전: 타이머 필드가 전혀 없음) / corrupt(손상) =====
const PH=['ask','paused','explained'],TF=['remainMs','limitMs','savedAt','seq'],isNum=n=>typeof n==='number'&&Number.isFinite(n);
const judgeRun=r=>{if(!r||typeof r!=='object'||Array.isArray(r))return{k:'corrupt'};const has=k=>Object.prototype.hasOwnProperty.call(r,k);
  const st=Array.isArray(r.list)&&r.list.length>0&&r.list.every(q=>q&&typeof q==='object'&&Array.isArray(q.choices)&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.choices.length&&Number.isInteger(q.level))
    &&Number.isInteger(r.i)&&r.i>=0&&r.i<r.list.length&&PH.includes(r.phase)&&Number.isInteger(r.level)&&r.level>=0&&r.level<=4
    &&isNum(r.hearts)&&r.hearts>=0&&r.hearts<=CFG.hearts&&isNum(r.score)&&isNum(r.streak)&&isNum(r.best)&&isNum(r.correct)&&Array.isArray(r.wrong);
  if(!st)return{k:'corrupt'};
  if(!has('tv'))return TF.some(has)?{k:'corrupt'}:{k:'legacy'};          // 타이머 필드가 일부만 있으면 구버전이 아니라 손상
  if(r.tv!==1)return{k:'corrupt'};
  if(r.phase==='explained')return{k:'ok'};
  const t=isNum(r.limitMs)&&r.limitMs>0&&isNum(r.remainMs)&&r.remainMs>=0&&r.remainMs<=r.limitMs&&Number.isInteger(r.seq)&&r.seq>=0&&(r.phase!=='ask'||isNum(r.savedAt));
  return t?{k:'ok'}:{k:'corrupt'}};
const corruptView=()=>{S.run=null;commit(false);cur='m';stopTimers();   // 진행 중 게임만 중단한다. 점수·도장·오답·이력 등 다른 기록은 건드리지 않는다
  $.innerHTML=`<section class="c"><div class="big">⚠️</div><p class="warn">저장된 진행 상태를 읽을 수 없어 이어서 할 수 없어요. 다른 기록은 이 과정에서 지우지 않아요.</p><button class="pri" data-a="levels">레벨 선택</button></section>`};
// ===== 오답 이전: 상태가 S0(두 키 없음)이고 대상이 선택된 경우에만 1회 =====
const migrateIfNeeded=()=>{if(wrongState(S).code!=='S0'||!AUD.includes(S.age))return false;const r=migrateWrong(S,qById);if(!r.ok){console.error('[오답 이전 중단]',r);return false}console.info('[오답 이전]',r);return true};
const home=()=>{stopTimers();cur='m';$.innerHTML=`<section class="c"><div class="big">♻️</div><h1>우리동네 자원순환 도장깨기</h1><h2>알고 버리면 쓰레기가 아니라 자원입니다.</h2><p>우리 집에서 매일 나오는 물건들,<br>제대로 버리고 있을까요?</p>${S.age?`<button class="pri" data-a="levels">▶ 게임 시작 (${A()[0]} ${A()[1]})</button>`:''}<p><b>♻️ 나에게 맞는 게임으로 시작하기</b></p>${Object.entries(AGE).map(([k,v])=>`<button data-a="age" data-v="${k}">${v[0]} ${v[1]}</button>`).join('')}<small>환경부 생활폐기물 분리배출 누리집 기준</small>${CFG.allowUnverified?'<div class="dev">⚠ 테스트 모드: 검증 전 문제 포함</div>':''}${CREDIT}</section>`};
const levels=()=>{stopTimers();cur='m';$.innerHTML=`<section class="c">${stamps()}${S.run&&!S.run.over?'<button class="pri" data-a="resume">♻️ 이어서 하기</button>':''}${N.map((n,i)=>{const l=i+1,open=l===1||S.stamps[i-1],c=cnt(l);return`<button class="card" data-a="play" data-l="${l}" ${open&&c?'':'disabled'}>${n[0]} ${n[1]} · ${n[2]}<small>${!open?'🔒 잠김':c?`문제 ${c}개 · 문제은행 ${bankInfo(D,S.age,S).byLevel[l]}개`:'검증된 문제 준비 중'}</small></button>`}).join('')}${bankLine()}<button data-a="notes">📒 나의 오답노트 (${wrongList(S,S.age).length})</button><button data-a="home">⚙ 대상 변경 (${A()[1]})</button>${S.stamps.every(Boolean)?'<button data-a="final">🏆 마스터 화면</button>':''}</section>`};
const play=(l,list,mode)=>{list=list||pickPlay(D,S.age,l,S);if(!list.length)return levels();g=G.start(list,l,mode);if(mode==='retry')g.ids=list.map(q=>q.id);quiz()};
const renderQ=()=>{const q=g.list[g.i],n=lab(g);bump();cur='q';const s=g.seq,sec=Math.ceil(g.remainMs/1000);
  $.innerHTML=`<section><div class="top"><span>${n[0]} ${n[1]}</span><span>문제 ${g.i+1} / ${g.list.length}</span></div><div class="top"><span>${'❤️'.repeat(g.hearts)+'🖤'.repeat(CFG.hearts-g.hearts)}</span><span>${g.score}점</span><span>⏱️ <b id="tm">${sec}</b>초</span></div><div class="bar"><i id="bar" style="width:${Math.max(0,g.remainMs/g.limitMs*100)}%"></i></div>${q.isBoss&&!g.retry?'<p class="boss">👑 마지막 도전입니다!</p>':''}<div class="ico">${ICON[q.itemId]||'♻️'}</div><h3>${ask(q)}</h3>${q.choices.map((c,i)=>`<button class="ch" data-a="pick" data-i="${i}" data-s="${s}">${'①②③④'[i]} ${c}</button>`).join('')}<div class="row"><button class="hint" data-a="hint" data-s="${s}">💡 힌트</button><button class="pz" data-a="pause" data-s="${s}">⏸️</button></div><p id="hint">${g.hint?char('💡 '+(q.hint||'힌트가 없어요.')):''}</p></section>`};
const startTimer=()=>{stopTimers();const s=g.seq;T.t0=performance.now();T.rem0=g.remainMs;T.run=true;
  T.tt=setTimeout(()=>{if(g&&g.seq===s&&g.phase==='ask'&&T.run)pick(-1)},Math.max(0,T.rem0)); // 만료는 남은 시간에 맞춘 타이머로 판정
  T.t=setInterval(()=>tick(s),CFG.saveIntervalMs)};
const tick=s=>{if(!g||g.seq!==s||g.phase!=='ask'||!T.run)return;const r=remainNow(),bar=document.getElementById('bar'),tm=document.getElementById('tm');
  if(bar&&tm){bar.style.width=Math.max(0,r/g.limitMs*100)+'%';tm.textContent=Math.max(0,Math.ceil(r/1000))}
  if(r<=0){pick(-1);return}
  g.remainMs=clampMs(r);g.savedAt=Date.now();persist(true)};                                  // 남은 시간을 주기적으로 저장
const quiz=resume=>{stopTimers();const q=g.list[g.i];
  if(!resume){const sec=Math.round((q.timeLimit||(q.isBoss?CFG.bossTime:CFG.time[q.level]))*A()[2]);g.tv=1;g.limitMs=sec*1000;g.remainMs=g.limitMs}  // 새 문항은 전체 시간, 이어하기는 저장된 남은 시간 그대로
  g.phase='ask';
  if(g.remainMs<=0){pick(-1);return}                    // 남은 시간이 0 이하이면 문제 화면 없이 즉시 시간 초과
  g.savedAt=Date.now();renderQ();persist(false);
  if(cur==='q')startTimer()};                           // 저장 실패 안내가 떴으면(cur!=='q') 타이머는 「저장 없이 계속하기」에서 시작한다
const pauseView=()=>{bump();cur='p';const s=g.seq;$.innerHTML=`<section class="c"><h2>⏸️ 게임을 잠시 멈췄어요</h2><button class="pri" data-a="cont" data-s="${s}">계속하기</button><button data-a="restart" data-s="${s}">처음부터</button><button data-a="leave" data-s="${s}">게임 나가기</button></section>`};
const pause=()=>{if(!g||g.over||g.phase!=='ask'||!T.run)return;const r=remainNow();if(r<=0){pick(-1);return}
  stopTimers();g.remainMs=clampMs(r);g.phase='paused';g.savedAt=Date.now();pauseView();persist(false)};   // 일시정지 때 실제 남은 시간을 저장
const explain=()=>{const {ok,i,q}=lastEx,it=D.byId[q.itemId]||{},e=q.educationalMessage;bump();cur='x';
  $.innerHTML=`<section class="c"><h2>${ok?'🎉 정답!':i<0?'⏰ 시간이 지났어요':'❌ 아쉽습니다.'}</h2>${ok?'':`<p>정답: <b>${q.choices[q.answer]}</b></p>`}${char(ok?'😊 정답이에요!':'🤔 조금 헷갈렸네요.')}<h4>왜 그럴까요?</h4><p>${q.explanation}</p>${e?`<p class="edu">🌱 자원순환 한마디<br><small>(환경부 공식 배출방법이 아닌 교육 메시지)</small><br>${e}</p>`:''}<p class="note">※ 지역별 폐기물 배출 기준 및 수거 방법은 지자체에 따라 다를 수 있습니다. 실제 배출 시에는 거주 지역의 안내를 함께 확인하세요.</p><small>출처: ${q.sourceLabel?esc(q.sourceLabel):it.source?.name||'생활폐기물 분리배출 누리집'}${q.verification.questionVerified?'':' · ⚠ 검증 전 문제'}</small><button class="pri" data-a="next" data-s="${g.seq}">다음</button></section>`};
const pick=i0=>{if(!g||g.over||g.phase!=='ask')return;
  const i=i0>=0&&T.run&&remainNow()<=0?-1:i0;                    // 입력 시점에 남은 시간이 0 이하이면 시간 초과로 처리
  stopTimers();g.phase='explained';                              // 'ask'→'explained' 전환을 먼저 한 호출만 채점한다(중복 입력·중복 타이머 방지)
  const q=g.list[g.i],ok=G.answer(g,i),aud=q.audience&&q.audience!=='all'?q.audience:audOf(S.age);
  if(!wrongPut(S,aud,q.id,ok?null:g.wrong.at(-1)))console.warn('[오답 기록 차단] 대상별 오답 상태:',wrongState(S).code); // 정답이면 해당 대상·해당 문항 기록만 제거, 오답이면 교체 후 끝에 추가(상태가 허용할 때만)
  if(!g.retry)histAdd(S,aud,q.id);if(ok&&q.series==='ext')extAdd(S,q.id); // 재도전은 일반 출제 이력에 더하지 않는다 · 해결 기록 문제를 처음 맞힌 경우에만 확장 도장 1개(기본 stamps와 별개)
  lastEx={ok,i,q};explain();persist(false)};
const result=()=>{stopTimers();const ok=g.over==='clear',n=nm(g.level);if(ok&&!g.retry){S.stamps[g.level-1]=true}S.run=null;commit(false);bump();cur='r';
  $.innerHTML=`<section class="c"><h2>${ok?(g.retry?'📒 오답 복습 완료!':'🎉 도장깨기 완료!'):'💪 다시 도전해 볼까요?'}</h2>${ok&&!g.retry?`<div class="stamp pop">${n[0]}</div>`:''}<h3>${n[1]}</h3><p>${g.list.length}문제 중 <b>${g.correct}개</b> 정답<br>점수 ${g.score}점 · 최고 연속 ${g.best}${g.retry?'':`<br>🏅 획득 도장 ${S.stamps.filter(Boolean).length}개`}<br>📒 오답 ${g.wrong.length}개</p>${fm.on?'<p class="note">기록이 저장되지 않았을 수 있어요.</p>':''}${g.retry?'':bankLine()}${g.wrong.length?`<button data-a="notes" data-s="${g.seq}">오답 다시 보기</button>`:''}${ok&&!g.retry&&g.level<4?`<button class="pri" data-a="play" data-l="${g.level+1}" data-s="${g.seq}">${N[g.level][0]} ${N[g.level][2]} 도전하기</button>`:''}<button data-a="${g.retry?'retry':'play'}" data-l="${g.level}" data-s="${g.seq}">다시 도전</button><button data-a="share" data-s="${g.seq}">친구에게 공유하기</button><button data-a="levels" data-s="${g.seq}">레벨 선택</button>${CREDIT}</section>`};
const share=async()=>{const url=location.href.split('?')[0],n=lab(g),text=`♻️ 우리동네 자원순환 도장깨기\n\n나는 ${n[1]}에 도전했어요!\n${g.list.length}문제 중 ${g.correct}개 정답 🏅\n\n여러분도 도전해 보세요!`;
  const full=text+'\n'+url,done=()=>alert('공유 문구와 링크를 복사했어요.');
  try{if(navigator.share){await navigator.share({text,url});return}await copyText(full);done();return}
  catch(e){if(e&&e.name==='AbortError')return}              // 사용자가 공유창을 닫은 경우는 실패로 보지 않는다
  try{await copyText(full);done();return}catch{}            // 공유 실패 → 기존 대체 동작(클립보드 복사)
  showCopy(full)};                                           // 복사도 실패하면 직접 복사할 수 있게 문구를 보여 준다
const copyText=async t=>{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(t);return}
  const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;left:0;opacity:0';document.body.appendChild(ta);ta.select();
  let ok=false;try{ok=document.execCommand('copy')}catch{}ta.remove();if(!ok)throw new Error('copy failed')};
const showCopy=t=>{if(cur!=='r')return;document.getElementById('cpbox')?.remove();const d=document.createElement('div');d.id='cpbox';d.className='cpbox';
  d.innerHTML='<p>자동 복사에 실패했어요. 아래 문구를 길게 눌러 복사해서 공유해 주세요.</p><textarea readonly rows="6"></textarea>';d.querySelector('textarea').value=t;
  const sec=$.querySelector('section');sec.insertBefore(d,sec.querySelector('[data-a="levels"]'));d.querySelector('textarea').select()};
const notes=()=>{cur='m';const st=wrongState(S),list=wrongList(S,S.age);
  $.innerHTML=`<section><h2>📒 나의 오답노트</h2>${!st.canRead?'<p class="note">오답 기록을 불러오지 못해서 지금은 오답노트와 다시 도전하기를 사용할 수 없어요.</p>':list.map(w=>`<p><b>${D.byId[w.item]?.itemName||qById(w.id)?.itemName||w.item}</b><br>내 답: ${w.pick}<br>정답: ${w.answer}<br><small>${w.e}</small></p><hr>`).join('')||'<p>아직 틀린 문제가 없어요 👍</p>'}${list.length?'<button class="pri" data-a="retry">틀린 문제 다시 도전하기</button>':''}<button data-a="levels">돌아가기</button></section>`};
const final=()=>{cur='m';$.innerHTML=`<section class="c"><div class="stamp pop">🏆</div><h1>자원순환 마스터</h1>${stamps()}${bankLine()}<p>이제 버리기 전에 한 번 더 생각하는 사람이 되었습니다.</p><button class="pri" data-a="levels">문제은행으로 계속 도전하기</button>${CREDIT}</section>`};
const resumePrompt=()=>{cur='m';const r=S.run;$.innerHTML=`<section class="c"><h2>♻️ 이어서 할까요?</h2><p>${lab(r)[2]} · ${(c=>c?c+'번 문제까지 진행했습니다.':'아직 첫 문제를 풀기 전입니다.')(r.phase==='explained'?r.i+1:r.i)}</p><button class="pri" data-a="resume">이어서 하기</button><button data-a="drop">처음부터</button></section>`};
const act={home,levels,notes,final,share,failgo,failhome,
  age:b=>{S.age=b.dataset.v;migrateIfNeeded();commit(false);levels()},
  play:b=>play(+b.dataset.l),pick:b=>pick(+b.dataset.i),
  next:()=>{if(!g||g.over||g.phase!=='explained')return;G.next(g);g.over?result():quiz()},
  hint:()=>{if(!g||g.phase!=='ask'||!T.run)return;g.hint=true;document.getElementById('hint').innerHTML=char('💡 '+(g.list[g.i].hint||'힌트가 없어요.'))},
  pause,cont:()=>{if(g&&g.phase==='paused')quiz(true)},
  restart:()=>{if(g&&g.phase==='paused')g.retry?act.retry(g.ids):play(g.level)},
  leave:()=>{if(g&&g.phase==='paused'){S.run=g;levels();commit(false)}},
  resume:()=>{if(!S.run||S.run.over)return levels();const v=judgeRun(S.run);if(v.k==='corrupt')return corruptView();g=S.run;
    if(g.phase==='explained'){G.next(g);if(g.over)return result();return quiz()}
    if(v.k==='ok'&&g.phase==='ask')g.remainMs=Math.max(0,g.remainMs-Math.min(Math.max(Date.now()-g.savedAt,0),CFG.restoreCapMs)); // 비정상 종료 후 복원: 마지막 저장 이후 경과분만 상한 이내로 차감(닫혀 있던 시간은 반영하지 않음)
    quiz(v.k==='ok')},                                  // ok: 저장된 남은 시간부터 · legacy(구버전): 현행처럼 전체 시간으로 1회
  drop:()=>{S.run=null;commit(false);home()},
  retry:x=>{const ids=Array.isArray(x)?x:wrongList(S,S.age).map(w=>w.id);play(0,shuffle([...D.qs,...D.ext].filter(q=>ids.includes(q.id))),'retry')}};
$.onclick=e=>{const b=e.target.closest('[data-a]');if(!b)return;
  if(b.dataset.s!==undefined&&(!g||+b.dataset.s!==g.seq||performance.now()<lockUntil))return; // 오래된 화면의 입력, 화면 전환 직후의 입력은 무시
  act[b.dataset.a]?.(b)};
// 전화·메시지 등으로 화면을 벗어나면 문제 중이던 게임을 자동으로 일시정지(타이머 오답 방지)
const leaveGame=()=>{if(g&&!g.over&&g.phase==='ask'&&T.run&&cur==='q')pause()};   // 문제 풀이 중에만 일시정지(남은 시간 저장)
document.addEventListener('visibilitychange',()=>{if(document.hidden)leaveGame()});
addEventListener('pagehide',leaveGame);
loadData().then(d=>{D=d;if(S.run?.mode==='ext'){S.run=null;save(S)} /* 이전 버전의 새로운 도전 진행분은 폐기 */
  if(migrateIfNeeded())commit(false);
  const r=S.run;r&&!r.over?(judgeRun(r).k==='corrupt'?corruptView():resumePrompt()):home()}).catch(()=>{$.textContent='데이터를 불러오지 못했습니다. 웹서버(HTTPS)에서 열어 주세요.'});
