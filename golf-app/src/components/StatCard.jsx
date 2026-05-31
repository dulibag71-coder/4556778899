// StatCard.jsx
// 숫자 하나를 예쁘게 카드 형태로 보여주는 컴포넌트예요.
// 예: "평균 타수 92" 처럼 제목이랑 숫자가 같이 나와요.

function StatCard({ title, value, unit }) {
  // title: 카드 제목 (예: "평균 타수")
  // value: 보여줄 숫자 (예: 92)
  // unit: 단위 (예: "타")
  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <p className="stat-value">
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </p>
    </div>
  );
}

export default StatCard;
