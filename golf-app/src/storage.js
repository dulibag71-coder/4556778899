// storage.js
// localStorage에서 라운드 기록을 저장하고 불러오는 함수 모음이에요.
// localStorage는 브라우저 안에 있는 작은 저장소예요 — 새로고침해도 사라지지 않아요!

const KEY = 'golf_rounds'; // localStorage에 저장할 때 쓰는 이름표

// 모든 라운드 기록 불러오기
export function getRounds() {
  const data = localStorage.getItem(KEY); // 저장소에서 꺼내기
  return data ? JSON.parse(data) : [];    // 있으면 파싱, 없으면 빈 배열
}

// 새 라운드 저장하기
export function saveRound(round) {
  const rounds = getRounds();
  rounds.push(round); // 배열 끝에 추가
  localStorage.setItem(KEY, JSON.stringify(rounds)); // 다시 저장
}

// 특정 라운드 삭제하기 (id로 구분)
export function deleteRound(id) {
  const rounds = getRounds().filter(r => r.id !== id); // 해당 id만 빼고 남기기
  localStorage.setItem(KEY, JSON.stringify(rounds));
}
