// 설정 (카카오 키 등은 나중에 여기에 분리)
export const CFG={
  allowUnverified:new URLSearchParams(location.search).has('dev'), // 테스트 전용
  hearts:3, pts:{1:10,2:20,3:30,4:50}, hintPenalty:0.3,
  time:{1:20,2:20,3:25,4:25}, bossTime:30, perLevel:10
};
