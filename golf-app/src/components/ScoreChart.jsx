// ScoreChart.jsx
// 라운드별 타수 변화를 꺾은선 그래프로 보여주는 컴포넌트예요.
// Recharts 라이브러리를 이용해요 — 그래프를 쉽게 만들어주는 도구예요.

import {
  LineChart, Line,        // 꺾은선 그래프
  XAxis, YAxis,           // x축(가로), y축(세로)
  CartesianGrid,          // 격자 선
  Tooltip,                // 마우스 올렸을 때 뜨는 정보창
  ResponsiveContainer     // 화면 크기에 맞게 자동 조절
} from 'recharts';

function ScoreChart({ rounds }) {
  // rounds: 라운드 기록 배열 — 날짜순으로 정렬해서 보여줄 거예요

  // 날짜 오름차순(오래된 것 → 최근 것)으로 정렬
  const sorted = [...rounds].sort((a, b) => a.date.localeCompare(b.date));

  // 그래프에 쓸 데이터 형태로 변환
  const data = sorted.map(r => ({
    date: r.date.slice(5),       // "2026-05-30" → "05-30" (월-일만)
    타수: r.totalStrokes,
    course: r.course,
  }));

  // 마우스를 올렸을 때 보여줄 정보창 커스텀
  function CustomTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p>{label}</p>
          <p>{payload[0].payload.course}</p>
          <p>총 타수: <strong>{payload[0].value}</strong></p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="chart-container">
      <h2 className="section-title">타수 변화 그래프</h2>
      {/* ResponsiveContainer: 부모 크기에 맞게 그래프를 자동으로 늘이거나 줄여요 */}
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          {/* stroke: 선 색깔, dot: 점 스타일 */}
          <Line
            type="monotone"
            dataKey="타수"
            stroke="#2e7d32"
            strokeWidth={2}
            dot={{ fill: '#2e7d32', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ScoreChart;
