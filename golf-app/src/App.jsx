// App.jsx
// 모든 컴포넌트를 하나로 합치는 메인 파일이에요.
// 탭 2개: 라운드 기록 / 스윙 분석

import { useState, useEffect } from 'react';
import StatCard from './components/StatCard';
import RoundForm from './components/RoundForm';
import RoundTable from './components/RoundTable';
import ScoreChart from './components/ScoreChart';
import SwingForm from './components/SwingForm';
import SwingFeedback from './components/SwingFeedback';
import SwingHistory from './components/SwingHistory';
import { getRounds, saveRound, deleteRound, getSwings, saveSwing, deleteSwing } from './storage';
import './App.css';

function App() {
  const [tab, setTab] = useState('round');          // 현재 탭: 'round' 또는 'swing'
  const [rounds, setRounds] = useState([]);
  const [showRoundForm, setShowRoundForm] = useState(false);

  const [swings, setSwings] = useState([]);
  const [showSwingForm, setShowSwingForm] = useState(false);
  const [selectedSwing, setSelectedSwing] = useState(null); // 분석 결과를 보여줄 스윙

  useEffect(() => {
    setRounds(getRounds());
    setSwings(getSwings());
  }, []);

  // --- 라운드 ---
  function handleRoundSave(r) {
    saveRound(r);
    setRounds(getRounds());
    setShowRoundForm(false);
  }
  function handleRoundDelete(id) {
    deleteRound(id);
    setRounds(getRounds());
  }

  // --- 스윙 ---
  function handleSwingSave(s) {
    saveSwing(s);
    const updated = getSwings();
    setSwings(updated);
    setShowSwingForm(false);
    // 저장하자마자 방금 기록한 스윙의 분석 결과 바로 보여주기
    setSelectedSwing(s);
  }
  function handleSwingDelete(id) {
    deleteSwing(id);
    setSwings(getSwings());
    if (selectedSwing?.id === id) setSelectedSwing(null);
  }

  // --- 라운드 통계 ---
  const count = rounds.length;
  const avgStrokes = count > 0
    ? (rounds.reduce((sum, r) => sum + r.totalStrokes, 0) / count).toFixed(1) : '-';
  const bestScore = count > 0 ? Math.min(...rounds.map(r => r.totalStrokes)) : '-';
  const puttsData = rounds.filter(r => r.putts != null);
  const avgPutts = puttsData.length > 0
    ? (puttsData.reduce((sum, r) => sum + r.putts, 0) / puttsData.length).toFixed(1) : '-';

  // --- 스윙 통계 ---
  const swingCount = swings.length;
  const avgCarry = swingCount > 0
    ? (swings.reduce((sum, s) => sum + s.carry, 0) / swingCount).toFixed(0) : '-';
  const bestCarry = swingCount > 0 ? Math.max(...swings.map(s => s.carry)) : '-';
  const speedData = swings.filter(s => s.clubSpeed != null);
  const avgSpeed = speedData.length > 0
    ? (speedData.reduce((sum, s) => sum + s.clubSpeed, 0) / speedData.length).toFixed(0) : '-';

  return (
    <div className="app">
      <header className="header">
        <h1>⛳ 내 골프 분석</h1>
        <p className="header-sub">라운드와 스윙을 기록하고 실력 향상을 확인해보세요</p>
      </header>

      {/* 탭 메뉴 */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === 'round' ? 'tab-active' : ''}`}
          onClick={() => setTab('round')}
        >
          🏌️ 라운드 기록
        </button>
        <button
          className={`tab-btn ${tab === 'swing' ? 'tab-active' : ''}`}
          onClick={() => setTab('swing')}
        >
          🏹 스윙 분석
        </button>
      </div>

      <main className="main">

        {/* ===== 라운드 기록 탭 ===== */}
        {tab === 'round' && (
          <>
            <section className="stats-section">
              <StatCard title="평균 타수" value={avgStrokes} unit={count > 0 ? '타' : ''} />
              <StatCard title="베스트 스코어" value={bestScore} unit={count > 0 ? '타' : ''} />
              <StatCard title="평균 퍼팅" value={avgPutts} unit={puttsData.length > 0 ? '개' : ''} />
            </section>

            {rounds.length >= 2 && <ScoreChart rounds={rounds} />}

            <div className="add-button-wrap">
              <button className="btn-add" onClick={() => setShowRoundForm(true)}>
                + 새 라운드 입력
              </button>
            </div>

            {rounds.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">🏌️</p>
                <p>첫 라운드를 입력해보세요!</p>
                <p className="empty-sub">기록을 쌓으면 실력 변화를 그래프로 볼 수 있어요.</p>
              </div>
            ) : (
              <RoundTable rounds={rounds} onDelete={handleRoundDelete} />
            )}
          </>
        )}

        {/* ===== 스윙 분석 탭 ===== */}
        {tab === 'swing' && (
          <>
            <section className="stats-section">
              <StatCard title="평균 비거리" value={avgCarry} unit={swingCount > 0 ? 'm' : ''} />
              <StatCard title="최장 비거리" value={bestCarry} unit={swingCount > 0 ? 'm' : ''} />
              <StatCard title="평균 클럽스피드" value={avgSpeed} unit={speedData.length > 0 ? 'km/h' : ''} />
            </section>

            <div className="add-button-wrap">
              <button className="btn-add" onClick={() => setShowSwingForm(true)}>
                + 스윙 기록 입력
              </button>
            </div>

            {/* 분석 결과 패널 */}
            {selectedSwing && (
              <SwingFeedback swing={selectedSwing} />
            )}

            {swings.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">🏹</p>
                <p>첫 스윙 기록을 입력해보세요!</p>
                <p className="empty-sub">클럽 스피드, 비거리, 스핀량을 입력하면 자동으로 분석해줘요.</p>
              </div>
            ) : (
              <SwingHistory
                swings={swings}
                onDelete={handleSwingDelete}
                onSelect={setSelectedSwing}
                selectedId={selectedSwing?.id}
              />
            )}
          </>
        )}

      </main>

      {showRoundForm && (
        <RoundForm onSave={handleRoundSave} onCancel={() => setShowRoundForm(false)} />
      )}
      {showSwingForm && (
        <SwingForm onSave={handleSwingSave} onCancel={() => setShowSwingForm(false)} />
      )}
    </div>
  );
}

export default App;
