import {CFG} from './config.js';
import {shuffleChoices} from './questions.js';
export const start=(list,level,mode='level')=>({mode,level,retry:mode==='retry',list:list.map(shuffleChoices),i:0,hearts:CFG.hearts,
  score:0,streak:0,best:0,correct:0,hint:false,over:false,bossOk:null,wrong:[]});
export function answer(g,pick){ // pick -1 = 시간 초과
  const q=g.list[g.i],ok=pick===q.answer;
  if(ok){g.correct++;g.streak++;g.best=Math.max(g.best,g.streak);
    let p=CFG.pts[q.level];if(g.hint)p=Math.round(p*(1-CFG.hintPenalty));
    if(g.streak===3)p+=10;if(g.streak===5)p+=20;g.score+=p;}
  else{g.hearts--;g.streak=0;
    g.wrong.push({id:q.id,item:q.itemId,pick:pick<0?'(시간 초과)':q.choices[pick],answer:q.choices[q.answer],e:q.explanation});}
  if(q.isBoss&&!g.retry)g.bossOk=ok;g.hint=false;return ok;
}
export function next(g){
  if(g.hearts<=0){g.over='fail';return}
  if(++g.i>=g.list.length)g.over=g.bossOk===false?'fail':'clear';
}
