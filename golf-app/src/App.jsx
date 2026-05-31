// App.jsx
// 모든 컴포넌트를 하나로 합치는 메인 파일이에요.
// 여기서 데이터를 관리하고, 각 컴포넌트에 나눠줘요.

import { useState, useEffect } from 'react';
import StatCard from './components/StatCard';
import RoundForm from './components/RoundForm';
import RoundTable from './components/RoundTable';
import ScoreChart from './components/ScoreChart';
import { getRounds, saveRound, deleteRound } from './storage';
import './App.css';

function App() {
  const [rounds, setRounds] = useState([]);        // 전체 라운드 기록
  const [showForm, setShowForm] = useState(false); // 입력 폼 보여줄지 여부

  // 앱이 처음 켜질 때 localStorage에서 데이터 불러오기
  useEffect(() => {
    setRounds(getRounds());
  }, []); // [] 안이 비어있으면 "딱 한 번만 실행"이라는 뜻

  // 새 라운드 저장
  function handleSave(newRound) {
    saveRound(newRound);    // localStorage에 저장
    setRounds(getRounds()); // 화면 업데이트
    setShowForm(false);     // 폼 닫기
  }

  // 라운드 삭제
  function handleDelete(id) {
    deleteRound(id);        // localStorage에서 삭제
    setRounds(getRounds()); // 화면 업데이트
  }

  // --- 통계 계산 ---
  const count = rounds.length;

  // 평균 타수 (소수점 1자리)
  const avgStrokes = count > 0
    ? (rounds.reduce((sum, r) => sum + r.totalStrokes, 0) / count).toFixed(1)
    : '-';

  // 베스트 스코어 (가장 적은 타수)
  const bestScore = count > 0
    ? Math.min(...rounds.map(r => r.totalStrokes))
    : '-';

  // 평균 퍼팅 (퍼팅 데이터가 있는 것만)
  const puttsData = rounds.filter(r => r.putts != null);
  const avgPutts = puttsData.length > 0
    ? (puttsData.reduce((sum, r) => sum + r.putts, 0) / puttsData.length).toFixed(1)
    : '-';

  return (
    <div className="app">
      {/* 상단 헤더 */}
      <header className="header">
        <h1>⛳ 내 골프 분석</h1>
        <p className="header-sub">라운드를 기록하고 실력 향상을 확인해보세요</p>
      </header>

      <main className="main">

        {/* 통계 카드 3개 */}
        <section className="stats-section">
          <StatCard title="평균 타수" value={avgStrokes} unit={count > 0 ? '타' : ''} />
          <StatCard title="베스트 스코어" value={bestScore} unit={count > 0 ? '타' : ''} />
          <StatCard title="평균 퍼팅" value={avgPutts} unit={puttsData.length > 0 ? '개' : ''} />
        </section>

        {/* 그래프 — 기록이 2개 이상일 때만 보여줌 */}
        {rounds.length >= 2 && <ScoreChart rounds={rounds} />}

        {/* 새 라운드 추가 버튼 */}
        <div className="add-button-wrap">
          <button className="btn-add" onClick={() => setShowForm(true)}>
            + 새 라운드 입력
          </button>
        </div>

        {/* 기록이 없을 때 안내 메시지 */}
        {rounds.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">🏌️</p>
            <p>첫 라운드를 입력해보세요!</p>
            <p className="empty-sub">기록을 쌓으면 실력 변화를 그래프로 볼 수 있어요.</p>
          </div>
        ) : (
          <RoundTable rounds={rounds} onDelete={handleDelete} />
        )}

      </main>

      {/* 입력 폼 — showForm이 true일 때만 보여줌 */}
      {showForm && (
        <RoundForm
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default App;
