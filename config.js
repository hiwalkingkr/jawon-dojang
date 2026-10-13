// 설정 (카카오 키 등은 나중에 여기에 분리)
export const CFG={
  allowUnverified:new URLSearchParams(location.search).has('dev'), // 테스트 전용
  hearts:3, pts:{1:10,2:20,3:30,4:50}, hintPenalty:0.3,
  time:{1:20,2:20,3:25,4:25}, bossTime:30, perLevel:10,
  draw:{1:5,2:5,3:5,4:5}, // 단계별 출제 수(7단계: 한 번의 플레이는 5/5/5/5=20문제). 문제은행이 이보다 커도 이 수만큼만 출제
  ext:{n:5}, // 새로운 문제 도전 한 회 문제 수(4단계: 출제 로직만, 화면은 다음 단계)
  // ---- 통합 개선(시험값: 검증 전에는 확정값이 아니다) ----
  lockMs:350,        // 화면 전환 직후 입력을 무시하는 시간(ms)
  restoreCapMs:500,  // 비정상 종료 후 이어하기에서 차감할 경과 시간의 상한(ms)
  saveIntervalMs:250 // 진행 중 게임의 주기 저장·화면 갱신 간격(ms)
};
