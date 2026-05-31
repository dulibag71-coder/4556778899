// SwingFeedback.jsx
// 입력한 스윙 지표를 분석해서 피드백 카드로 보여주는 컴포넌트예요.
// 실제 AI가 아니라 골프 표준 수치와 비교해서 자동으로 분석해요.

// 클럽별 기준값 (평균적인 아마추어 기준)
const STANDARDS = {
  '드라이버':      { carryMin: 180, carryMax: 280, spinMin: 1800, spinMax: 3200, launchMin: 9,  launchMax: 15 },
  '3번 우드':      { carryMin: 160, carryMax: 240, spinMin: 2500, spinMax: 4000, launchMin: 11, launchMax: 17 },
  '5번 우드':      { carryMin: 145, carryMax: 220, spinMin: 3000, spinMax: 4500, launchMin: 12, launchMax: 18 },
  '4번 아이언':    { carryMin: 155, carryMax: 195, spinMin: 4000, spinMax: 6000, launchMin: 14, launchMax: 20 },
  '5번 아이언':    { carryMin: 145, carryMax: 185, spinMin: 4500, spinMax: 6500, launchMin: 15, launchMax: 22 },
  '6번 아이언':    { carryMin: 135, carryMax: 175, spinMin: 5000, spinMax: 7500, launchMin: 16, launchMax: 24 },
  '7번 아이언':    { carryMin: 125, carryMax: 165, spinMin: 6000, spinMax: 8000, launchMin: 18, launchMax: 26 },
  '8번 아이언':    { carryMin: 110, carryMax: 150, spinMin: 7000, spinMax: 9000, launchMin: 20, launchMax: 28 },
  '9번 아이언':    { carryMin: 100, carryMax: 140, spinMin: 8000, spinMax: 10000, launchMin: 22, launchMax: 30 },
  '피칭 웨지':     { carryMin: 80,  carryMax: 130, spinMin: 9000, spinMax: 11000, launchMin: 24, launchMax: 34 },
  '샌드 웨지':     { carryMin: 60,  carryMax: 100, spinMin: 9500, spinMax: 12000, launchMin: 28, launchMax: 38 },
};

// 분석 결과 하나를 나타내는 카드
function FeedbackItem({ label, status, message }) {
  // status: 'good' | 'warn' | 'bad' — 색깔 결정
  const cls = `feedback-item feedback-${status}`;
  const icon = status === 'good' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  return (
    <div className={cls}>
      <span className="fb-icon">{icon}</span>
      <div>
        <strong>{label}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

function SwingFeedback({ swing }) {
  if (!swing) return null;

  const std = STANDARDS[swing.club] || STANDARDS['드라이버'];
  const items = []; // 분석 결과 목록

  // 1. 스매시 팩터 분석 (볼스피드 ÷ 클럽스피드 = 임팩트 효율)
  if (swing.clubSpeed && swing.ballSpeed) {
    const smash = (swing.ballSpeed / swing.clubSpeed).toFixed(2);
    if (smash >= 1.45) {
      items.push({ label: `스매시 팩터 ${smash}`, status: 'good', message: '임팩트 효율이 훌륭해요! 스위트스팟을 정확히 맞추고 있어요.' });
    } else if (smash >= 1.35) {
      items.push({ label: `스매시 팩터 ${smash}`, status: 'warn', message: '임팩트 효율이 보통이에요. 스위트스팟을 더 정확히 맞추면 비거리가 늘어요.' });
    } else {
      items.push({ label: `스매시 팩터 ${smash}`, status: 'bad', message: '임팩트 효율이 낮아요. 헤드업을 줄이고 공을 끝까지 보세요.' });
    }
  }

  // 2. 비거리 분석
  if (swing.carry < std.carryMin) {
    items.push({ label: `비거리 ${swing.carry}m (기준 ${std.carryMin}~${std.carryMax}m)`, status: 'bad', message: '비거리가 평균보다 짧아요. 체중 이동과 팔로우스루를 충분히 해보세요.' });
  } else if (swing.carry > std.carryMax) {
    items.push({ label: `비거리 ${swing.carry}m (기준 ${std.carryMin}~${std.carryMax}m)`, status: 'good', message: '비거리가 평균보다 길어요. 훌륭한 파워를 갖고 있어요!' });
  } else {
    items.push({ label: `비거리 ${swing.carry}m (기준 ${std.carryMin}~${std.carryMax}m)`, status: 'good', message: '비거리가 평균 범위 안에 있어요. 좋아요!' });
  }

  // 3. 런치 앵글 분석
  if (swing.launchAngle != null) {
    if (swing.launchAngle < std.launchMin) {
      items.push({ label: `런치 앵글 ${swing.launchAngle}° (기준 ${std.launchMin}~${std.launchMax}°)`, status: 'bad', message: '공이 너무 낮게 뜨고 있어요. 티를 높이거나 공 위치를 왼발 쪽으로 이동해보세요.' });
    } else if (swing.launchAngle > std.launchMax) {
      items.push({ label: `런치 앵글 ${swing.launchAngle}° (기준 ${std.launchMin}~${std.launchMax}°)`, status: 'warn', message: '공이 너무 높이 뜨고 있어요. 다운블로우를 줄이고 어퍼블로우로 스윙해보세요.' });
    } else {
      items.push({ label: `런치 앵글 ${swing.launchAngle}° (기준 ${std.launchMin}~${std.launchMax}°)`, status: 'good', message: '런치 앵글이 이상적이에요! 탄도가 완벽해요.' });
    }
  }

  // 4. 스핀량 분석
  if (swing.spinRate != null) {
    if (swing.spinRate < std.spinMin) {
      items.push({ label: `스핀량 ${swing.spinRate.toLocaleString()}rpm (기준 ${std.spinMin.toLocaleString()}~${std.spinMax.toLocaleString()}rpm)`, status: 'warn', message: '스핀이 부족해요. 공이 낙하할 때 드랍이 심할 수 있어요. 로프트를 살짝 높여보세요.' });
    } else if (swing.spinRate > std.spinMax) {
      items.push({ label: `스핀량 ${swing.spinRate.toLocaleString()}rpm (기준 ${std.spinMin.toLocaleString()}~${std.spinMax.toLocaleString()}rpm)`, status: 'bad', message: '스핀이 너무 많아요. 훅이나 슬라이스가 날 수 있어요. 임팩트 각도를 체크해보세요.' });
    } else {
      items.push({ label: `스핀량 ${swing.spinRate.toLocaleString()}rpm (기준 ${std.spinMin.toLocaleString()}~${std.spinMax.toLocaleString()}rpm)`, status: 'good', message: '스핀량이 적절해요. 직구성 탄도를 만들 수 있어요!' });
    }
  }

  // 분석 항목이 하나도 없으면 (비거리만 입력한 경우)
  if (items.length === 0) return null;

  // 종합 평가: good 개수 비율로 결정
  const goodCount = items.filter(i => i.status === 'good').length;
  const total = items.length;
  const overall =
    goodCount === total ? '완벽한 스윙이에요! 계속 이 상태를 유지하세요.' :
    goodCount >= total * 0.6 ? '전체적으로 좋아요. 몇 가지만 개선하면 더 좋아질 거예요.' :
    '개선할 부분이 있어요. 하나씩 천천히 고쳐나가요.';

  return (
    <div className="swing-feedback">
      <h3 className="fb-title">📊 스윙 분석 결과 — {swing.club} ({swing.date})</h3>
      {swing.memo && <p className="fb-memo">메모: {swing.memo}</p>}
      <div className="fb-list">
        {items.map((item, i) => <FeedbackItem key={i} {...item} />)}
      </div>
      <div className="fb-overall">
        <strong>종합 평가:</strong> {overall}
      </div>
    </div>
  );
}

export default SwingFeedback;
