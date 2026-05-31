// SwingHistory.jsx
// 스윙 기록 목록 표 + 비거리 추이 꺾은선 그래프를 보여주는 컴포넌트예요.

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// 마우스 올렸을 때 보여줄 정보창
function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: <strong>{p.value}</strong>
            {p.name === '비거리' ? 'm' : p.name === '클럽스피드' ? 'km/h' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function SwingHistory({ swings, onDelete, onSelect, selectedId }) {
  // 날짜순 정렬 (오래된 것 → 최근)
  const sorted = [...swings].sort((a, b) => a.date.localeCompare(b.date));

  // 그래프 데이터 — 가장 많이 사용한 클럽 기준으로 필터
  const chartData = sorted.map(s => ({
    date: s.date.slice(5),
    비거리: s.carry,
    클럽스피드: s.clubSpeed ?? undefined,
    club: s.club,
  }));

  // 표에서는 최신순
  const tableRows = [...swings].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      {/* 비거리 추이 그래프 */}
      {swings.length >= 2 && (
        <div className="chart-container">
          <h2 className="section-title">비거리 & 클럽 스피드 추이</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="비거리" stroke="#2e7d32" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line yAxisId="right" type="monotone" dataKey="클럽스피드" stroke="#ff8f00" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="5 3" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 기록 표 */}
      <div className="table-container" style={{ marginTop: 20 }}>
        <h2 className="section-title">스윙 기록 목록</h2>
        <div className="table-scroll">
          <table className="round-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>클럽</th>
                <th>비거리</th>
                <th>클럽스피드</th>
                <th>스핀</th>
                <th>메모</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(s => (
                <tr
                  key={s.id}
                  className={selectedId === s.id ? 'row-selected' : ''}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelect(s)}
                >
                  <td>{s.date}</td>
                  <td>{s.club}</td>
                  <td className="score-cell">{s.carry}m</td>
                  <td>{s.clubSpeed ? `${s.clubSpeed}km/h` : '-'}</td>
                  <td>{s.spinRate ? `${s.spinRate.toLocaleString()}rpm` : '-'}</td>
                  <td className="memo-cell">{s.memo || '-'}</td>
                  <td>
                    <button
                      className="btn-delete"
                      onClick={e => {
                        e.stopPropagation(); // 행 클릭 이벤트가 같이 실행되지 않게
                        if (window.confirm('이 스윙 기록을 삭제할까요?')) onDelete(s.id);
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="table-hint">👆 행을 클릭하면 해당 스윙의 분석 결과를 볼 수 있어요</p>
      </div>
    </div>
  );
}

export default SwingHistory;
