// =============================================
// 윷놀이 게임 상수 및 보드 레이아웃
// =============================================

// 보드 크기 (canvas 기준)
const BOARD_SIZE = 500;
const BOARD_PADDING = 40;
const EFFECTIVE = BOARD_SIZE - BOARD_PADDING * 2; // 420
const STEP = EFFECTIVE / 5; // 84px per step

const CX = BOARD_PADDING + EFFECTIVE / 2; // center x = 250
const CY = BOARD_PADDING + EFFECTIVE / 2; // center y = 250

// 25개 노드 좌표 (0-19: 외곽, 20-24: 대각선 단축로)
// 시작점(0)은 우하단 → 반시계 방향으로 이동
const NODE_POSITIONS = [
  // 외곽 링 (0-19) - 반시계 방향
  { x: BOARD_PADDING + EFFECTIVE,     y: BOARD_PADDING + EFFECTIVE },     // 0: 출발 (우하)
  { x: BOARD_PADDING + EFFECTIVE * 4/5, y: BOARD_PADDING + EFFECTIVE },   // 1
  { x: BOARD_PADDING + EFFECTIVE * 3/5, y: BOARD_PADDING + EFFECTIVE },   // 2
  { x: BOARD_PADDING + EFFECTIVE * 2/5, y: BOARD_PADDING + EFFECTIVE },   // 3
  { x: BOARD_PADDING + EFFECTIVE * 1/5, y: BOARD_PADDING + EFFECTIVE },   // 4
  { x: BOARD_PADDING,                   y: BOARD_PADDING + EFFECTIVE },   // 5: 좌하 모서리
  { x: BOARD_PADDING,                   y: BOARD_PADDING + EFFECTIVE * 4/5 }, // 6
  { x: BOARD_PADDING,                   y: BOARD_PADDING + EFFECTIVE * 3/5 }, // 7
  { x: BOARD_PADDING,                   y: BOARD_PADDING + EFFECTIVE * 2/5 }, // 8
  { x: BOARD_PADDING,                   y: BOARD_PADDING + EFFECTIVE * 1/5 }, // 9
  { x: BOARD_PADDING,                   y: BOARD_PADDING },               // 10: 좌상 모서리
  { x: BOARD_PADDING + EFFECTIVE * 1/5, y: BOARD_PADDING },               // 11
  { x: BOARD_PADDING + EFFECTIVE * 2/5, y: BOARD_PADDING },               // 12
  { x: BOARD_PADDING + EFFECTIVE * 3/5, y: BOARD_PADDING },               // 13
  { x: BOARD_PADDING + EFFECTIVE * 4/5, y: BOARD_PADDING },               // 14
  { x: BOARD_PADDING + EFFECTIVE,       y: BOARD_PADDING },               // 15: 우상 모서리
  { x: BOARD_PADDING + EFFECTIVE,       y: BOARD_PADDING + EFFECTIVE * 1/5 }, // 16
  { x: BOARD_PADDING + EFFECTIVE,       y: BOARD_PADDING + EFFECTIVE * 2/5 }, // 17
  { x: BOARD_PADDING + EFFECTIVE,       y: BOARD_PADDING + EFFECTIVE * 3/5 }, // 18
  { x: BOARD_PADDING + EFFECTIVE,       y: BOARD_PADDING + EFFECTIVE * 4/5 }, // 19

  // 대각선 단축로 (20-24)
  { x: BOARD_PADDING + EFFECTIVE * 1/4, y: BOARD_PADDING + EFFECTIVE * 3/4 }, // 20: 좌하↔중심 사이
  { x: BOARD_PADDING + EFFECTIVE * 1/4, y: BOARD_PADDING + EFFECTIVE * 1/4 }, // 21: 좌상↔중심 사이
  { x: BOARD_PADDING + EFFECTIVE * 3/4, y: BOARD_PADDING + EFFECTIVE * 1/4 }, // 22: 우상↔중심 사이
  { x: CX,                              y: CY },                              // 23: 중심 (가운데)
  { x: BOARD_PADDING + EFFECTIVE * 3/4, y: BOARD_PADDING + EFFECTIVE * 3/4 }, // 24: 중심↔출발 사이
];

// 모서리 노드 인덱스
const CORNER_NODES = { BL: 5, TL: 10, TR: 15, BR: 0 };

// 외곽 경로: 인덱스 0→1→...→19→(종료)
const OUTER_PATH_NEXT = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,'finish'];

// 단축로 경로 정의
// pathType: 'outer', 'bl', 'tl', 'tr'
// 각 단축로에서 다음 노드 맵
const SHORTCUT_NEXT = {
  bl: { 5: 20, 20: 23, 23: 24, 24: 'finish' },
  tl: { 10: 21, 21: 23, 23: 24, 24: 'finish' },
  tr: { 15: 22, 22: 23, 23: 24, 24: 'finish' },
};

// 어떤 단축로 노드인지 확인
const SHORTCUT_NODES = new Set([20, 21, 22, 23, 24]);

// 특수 타일 (가속/후퇴/순간이동)
const SPECIAL_TILES = {
  2:  { type: 'speed',    label: '가속', desc: '+1 추가 이동' },
  7:  { type: 'slow',     label: '후퇴', desc: '1칸 후퇴' },
  12: { type: 'teleport', label: '이동', desc: '중심으로 이동' },
  17: { type: 'speed',    label: '가속', desc: '+1 추가 이동' },
};

// 윷 결과
const YUT_RESULTS = [
  { name: '도', steps: 1, emoji: '🟤' },
  { name: '개', steps: 2, emoji: '🟡' },
  { name: '걸', steps: 3, emoji: '🟠' },
  { name: '윷', steps: 4, emoji: '⚪' },
  { name: '모', steps: 5, emoji: '⚫' },
];

// 윷 확률 (배면 개수: 0=모, 1=도, 2=개, 3=걸, 4=윷)
// 각 막대 앞면(볼록) 확률 = 0.5
function rollYut() {
  let backs = 0;
  const stickResults = [];
  for (let i = 0; i < 4; i++) {
    // 앞면(볼록)=0, 뒷면(평평)=1
    const r = Math.random() < 0.5 ? 1 : 0;
    stickResults.push(r);
    backs += r;
  }
  // 0뒷면=모(5), 1=도(1), 2=개(2), 3=걸(3), 4=윷(4)
  const steps = backs === 0 ? 5 : backs;
  const nameIdx = backs === 0 ? 4 : backs - 1; // 도=0,개=1,걸=2,윷=3,모=4
  return {
    stickResults,   // 각 막대 결과 배열 (0=앞, 1=뒤)
    backs,
    steps,
    name: YUT_RESULTS[nameIdx].name,
    isBonus: backs === 0 || backs === 4, // 윷 또는 모
  };
}

// 색상 팔레트 (한국 전통)
const COLORS = {
  boardBg:     '#F5E6C8',   // 한지 색
  boardBorder: '#8B4513',   // 나무 갈색
  boardLine:   '#8B4513',
  outerNode:   '#DEB887',
  cornerNode:  '#CD853F',
  innerNode:   '#DAA520',
  centerNode:  '#FF8C00',
  p1Color:     '#C0392B',   // 빨강
  p2Color:     '#2471A3',   // 파랑
  p1Light:     '#F1948A',
  p2Light:     '#7FB3D3',
  highlight:   '#2ECC71',
  capture:     '#E74C3C',
  text:        '#4A2C0A',
  gold:        '#FFD700',
  shortcut:    '#FF6B35',
  specialSpeed:'#27AE60',
  specialSlow: '#8E44AD',
  specialTele: '#2980B9',
};

// 플레이어 이름
const PLAYER_NAMES = ['플레이어 1 (빨강)', '플레이어 2 (파랑)'];
const PIECE_COUNT = 4;
