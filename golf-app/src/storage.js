// storage.js
// localStorage에서 라운드 기록과 스윙 기록을 저장하고 불러오는 함수 모음이에요.

const ROUND_KEY = 'golf_rounds'; // 라운드 기록 저장 이름표
const SWING_KEY = 'golf_swings'; // 스윙 기록 저장 이름표

// ===== 라운드 기록 =====

export function getRounds() {
  const data = localStorage.getItem(ROUND_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveRound(round) {
  const rounds = getRounds();
  rounds.push(round);
  localStorage.setItem(ROUND_KEY, JSON.stringify(rounds));
}

export function deleteRound(id) {
  const rounds = getRounds().filter(r => r.id !== id);
  localStorage.setItem(ROUND_KEY, JSON.stringify(rounds));
}

// ===== 스윙 기록 =====

export function getSwings() {
  const data = localStorage.getItem(SWING_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveSwing(swing) {
  const swings = getSwings();
  swings.push(swing);
  localStorage.setItem(SWING_KEY, JSON.stringify(swings));
}

export function deleteSwing(id) {
  const swings = getSwings().filter(s => s.id !== id);
  localStorage.setItem(SWING_KEY, JSON.stringify(swings));
}
