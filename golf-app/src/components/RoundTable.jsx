// RoundTable.jsx
// 저장된 모든 라운드 기록을 표로 보여주는 컴포넌트예요.
// 각 줄 오른쪽에 삭제 버튼이 있어요.

function RoundTable({ rounds, onDelete }) {
  // rounds: 라운드 기록 배열
  // onDelete: 삭제 버튼 눌렀을 때 실행할 함수

  // 최신 날짜순(내림차순)으로 정렬
  const sorted = [...rounds].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="table-container">
      <h2 className="section-title">라운드 기록</h2>
      <div className="table-scroll"> {/* 모바일에서 가로 스크롤 가능하게 */}
        <table className="round-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>골프장</th>
              <th>총 타수</th>
              <th>퍼팅</th>
              <th>페어웨이</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(round => (
              <tr key={round.id}>
                <td>{round.date}</td>
                <td>{round.course}</td>
                <td className="score-cell">{round.totalStrokes}타</td>
                {/* null이면 '-' 표시 */}
                <td>{round.putts ?? '-'}</td>
                <td>{round.fairwaysHit != null ? `${round.fairwaysHit}/14` : '-'}</td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => {
                      // 실수로 눌렀을 때를 대비한 확인창
                      if (window.confirm('이 기록을 삭제할까요?')) {
                        onDelete(round.id);
                      }
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
    </div>
  );
}

export default RoundTable;
