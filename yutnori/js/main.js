// =============================================
// 윷놀이 메인 게임 컨트롤러
// =============================================

class YutnoriGame {
  constructor() {
    this.canvas = document.getElementById('boardCanvas');
    this.renderer = new BoardRenderer(this.canvas);
    this.yutContainer = document.getElementById('yutContainer');
    this.animator = new YutAnimator(this.yutContainer);
    this.audio = new AudioManager();
    this.gameState = null;
    this.hoveredNode = -1;
    this.renderLoop = null;
    this.shortcutPending = null; // 단축로 선택 대기 중인 말 정보
    this._setupUI();
    this._setupEventListeners();
    this._showScreen('title');
    this._startRenderLoop();
  }

  // ==================
  // 화면 전환
  // ==================
  _showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${name}`);
    if (el) el.classList.add('active');
  }

  // ==================
  // UI 설정
  // ==================
  _setupUI() {
    // 타이틀 화면 버튼
    document.getElementById('btn-2p').addEventListener('click', () => {
      this.audio.playClick();
      this._startGame('2p');
    });
    document.getElementById('btn-cpu').addEventListener('click', () => {
      this.audio.playClick();
      this._startGame('cpu');
    });
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.audio.playClick();
      const saved = GameState.load();
      if (saved) {
        this.gameState = saved;
        this._showScreen('game');
        this._updateUI();
      }
    });

    // 게임 화면 버튼
    document.getElementById('btn-throw').addEventListener('click', () => {
      this._handleThrow();
    });
    document.getElementById('btn-menu').addEventListener('click', () => {
      this.audio.playClick();
      this._showScreen('title');
    });
    document.getElementById('btn-sound').addEventListener('click', () => {
      const on = this.audio.toggle();
      document.getElementById('btn-sound').textContent = on ? '🔊' : '🔇';
    });

    // 단축로 선택 버튼
    document.getElementById('btn-shortcut-yes').addEventListener('click', () => {
      this._handleShortcutChoice(true);
    });
    document.getElementById('btn-shortcut-no').addEventListener('click', () => {
      this._handleShortcutChoice(false);
    });

    // 윷 결과 선택 (여러 개 있을 때)
    document.getElementById('roll-list').addEventListener('click', (e) => {
      const item = e.target.closest('.roll-item');
      if (!item) return;
      const idx = parseInt(item.dataset.idx);
      this._selectRoll(idx);
    });

    // 게임 화면 재시작 버튼
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.audio.playClick();
      if (confirm('현재 게임을 종료하고 다시 시작하시겠습니까?')) {
        this._startGame(this.gameState?.mode || '2p');
      }
    });

    // 게임오버 화면
    document.getElementById('btn-gameover-menu').addEventListener('click', () => {
      this.audio.playClick();
      this._showScreen('title');
    });
    document.getElementById('btn-gameover-restart').addEventListener('click', () => {
      this.audio.playClick();
      this._startGame(this.gameState?.mode || '2p');
    });

    // 저장된 게임 확인
    const saved = GameState.load();
    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) resumeBtn.style.display = saved ? 'block' : 'none';

    // 규칙 가이드 (타이틀 + 게임 화면)
    ['btn-rules-title', 'btn-rules-game'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        this.audio.playClick();
        this._toggleRules();
      });
    });
    document.getElementById('btn-close-rules').addEventListener('click', () => {
      document.getElementById('rules-modal').classList.remove('active');
    });
  }

  _toggleRules() {
    const modal = document.getElementById('rules-modal');
    modal.classList.toggle('active');
  }

  // ==================
  // 이벤트 리스너
  // ==================
  _setupEventListeners() {
    // 캔버스 클릭 (말 선택)
    this.canvas.addEventListener('click', (e) => this._handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this._handleCanvasHover(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this._handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
    }, { passive: false });

    // 리사이즈
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
    this.renderer.resize();
  }

  // ==================
  // 게임 시작
  // ==================
  _startGame(mode) {
    this.gameState = new GameState(mode);
    this.shortcutPending = null;
    this.animator.reset();
    this._showScreen('game');
    this._updateUI();
    this._updateTurnIndicator();

    // CPU 모드면 P2를 CPU로
    if (mode === 'cpu') {
      document.getElementById('p2-name').textContent = 'AI (파랑)';
    }
  }

  // ==================
  // 렌더 루프
  // ==================
  _startRenderLoop() {
    const loop = () => {
      if (this.gameState) {
        this.renderer.render(this.gameState, this.hoveredNode);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ==================
  // 윷 던지기 처리
  // ==================
  async _handleThrow() {
    if (!this.gameState) return;
    if (this.gameState.phase !== 'throw') return;
    if (this.animator.isAnimating) return;

    this.audio.playThrow();
    vibrate([50, 30, 50]);

    document.getElementById('btn-throw').disabled = true;

    const result = await this.animator.throw();
    this.gameState.addRoll(result);

    this.audio.playClick();

    if (result.isBonus) {
      this.audio.playBonus();
      vibrate([100, 50, 100, 50, 100]);
      this._showMessage(`${result.name}! 추가 던지기 기회!`, 'bonus');
    } else {
      this._showMessage(`${result.name} - ${result.steps}칸 이동`, 'normal');
    }

    this._updateRollList();

    // 이동 가능한 말이 있으면 선택 단계로
    if (result.isBonus) {
      // 추가 던지기 가능, 단 먼저 이동할 수도 있음
      this.gameState.phase = 'select_piece';
      document.getElementById('btn-throw').disabled = false;
      document.getElementById('btn-throw').textContent = '추가 던지기 🎲';
    } else {
      this.gameState.phase = 'select_piece';
      document.getElementById('btn-throw').disabled = true;
      document.getElementById('btn-throw').textContent = '던지기 🎲';
    }

    this._highlightMovablePieces();
    this._updateUI();

    // CPU 모드에서 P2 턴이면 자동 플레이
    if (this.gameState.mode === 'cpu' && this.gameState.currentPlayer === 1) {
      setTimeout(() => this._cpuPlay(), 1200);
    }
  }

  // ==================
  // 캔버스 클릭 처리
  // ==================
  _handleCanvasClick(e) {
    if (!this.gameState) return;
    if (this.gameState.phase !== 'select_piece') return;
    if (this.gameState.pendingRolls.length === 0) return;

    const nodeIdx = this.renderer.getNodeAtPoint(e.clientX, e.clientY);
    if (nodeIdx === -1) return;

    // 해당 노드에 있는 현재 플레이어 말 찾기
    const gs = this.gameState;
    let targetPiece = null;

    // 클릭한 노드의 말 찾기
    for (const piece of gs.getCurrentPieces()) {
      if (piece.finished) continue;
      // 출발 전 말은 출발점(0)에 클릭하면 선택
      if (piece.isHome() && nodeIdx === 0) {
        targetPiece = piece;
        break;
      }
      if (piece.nodeIdx === nodeIdx) {
        targetPiece = piece;
        break;
      }
    }

    if (!targetPiece) return;
    this.audio.playClick();
    this._movePieceWithRoll(targetPiece);
  }

  _handleCanvasHover(e) {
    if (!this.gameState) return;
    const nodeIdx = this.renderer.getNodeAtPoint(e.clientX, e.clientY);
    this.hoveredNode = nodeIdx;
    this.canvas.style.cursor = nodeIdx !== -1 ? 'pointer' : 'default';
  }

  // ==================
  // 말 이동
  // ==================
  _movePieceWithRoll(piece) {
    const gs = this.gameState;
    if (gs.pendingRolls.length === 0) return;

    // 선택된 윷 결과 사용 (첫 번째 또는 선택된 것)
    const rollIdx = gs.selectedRollIdx >= 0 ? gs.selectedRollIdx : 0;
    const roll = gs.pendingRolls[rollIdx];
    if (!roll) return;

    gs.selectedPieceRef = piece;

    // 이동 결과 미리 계산
    const preview = gs.calculateMove(piece, roll.steps);
    if (!preview) return;

    // 모서리 도달 시 단축로 선택 물어보기
    if (preview.canTakeShortcut) {
      const cornerMap = { 5: 'bl', 10: 'tl', 15: 'tr' };
      const shortcutType = cornerMap[preview.newNodeIdx];
      this.shortcutPending = {
        piece, roll, rollIdx, shortcutType,
        nodeIdx: preview.newNodeIdx,
      };
      gs.phase = 'select_shortcut';
      this._showShortcutDialog(preview.newNodeIdx);
      return;
    }

    // 바로 이동
    this._executeMove(piece, roll, rollIdx, null);
  }

  _executeMove(piece, roll, rollIdx, chosenPath) {
    const gs = this.gameState;

    // 이전 노드 저장
    const fromNode = piece.nodeIdx;

    // 이동 실행
    const result = gs.applyMove(piece, roll.steps, chosenPath);

    // 사용한 윷 결과 제거
    gs.pendingRolls.splice(rollIdx, 1);
    gs.selectedRollIdx = -1;
    gs.selectedPieceRef = null;
    gs.phase = 'throw';

    this.renderer.clearHighlights();

    // 이동 소리
    this.audio.playMove();
    vibrate(30);

    // 잡기 처리
    if (result.captured) {
      this.audio.playCapture();
      vibrate([100, 50, 200]);
      this.renderer.addParticles(piece.nodeIdx >= 0 ? piece.nodeIdx : 23, 'capture');
      this._showMessage('잡기! 추가 턴!', 'capture');
    }

    // 완주 처리
    if (result.finished) {
      this.audio.playFinish();
      vibrate([200, 100, 200]);
      this.renderer.addParticles(0, 'finish');
      this._showMessage(`말 완주! (${gs.finishedCount(gs.currentPlayer)}/4)`, 'finish');
    }

    // 특수 타일 효과
    if (result.specialEffect) {
      this._showMessage(`특수 타일: ${result.specialEffect.label}`, 'special');
    }

    // 게임 종료
    if (result.gameOver) {
      this._handleGameOver();
      return;
    }

    // 추가 턴 여부 (잡기 또는 윷/모)
    const hasBonus = result.captured || (roll.isBonus && gs.pendingRolls.length === 0);
    const hasPendingRolls = gs.pendingRolls.length > 0;

    if (hasPendingRolls) {
      // 아직 사용 못한 윷 결과가 있음 → 계속 이동
      gs.phase = 'select_piece';
      this._highlightMovablePieces();
      this._updateRollList();
      this._updateUI();
    } else if (hasBonus) {
      // 추가 턴
      gs.phase = 'throw';
      document.getElementById('btn-throw').disabled = false;
      document.getElementById('btn-throw').textContent = '던지기 🎲';
      this._showMessage('추가 턴!', 'bonus');
      this._updateUI();
    } else {
      // 턴 종료
      gs.endTurn();
      this._updateTurnIndicator();
      this._updateUI();
      this._updateRollList();
      document.getElementById('btn-throw').disabled = false;
      document.getElementById('btn-throw').textContent = '던지기 🎲';

      // CPU 자동 플레이
      if (gs.mode === 'cpu' && gs.currentPlayer === 1) {
        document.getElementById('btn-throw').disabled = true;
        setTimeout(() => this._cpuAutoThrow(), 800);
      }
    }

    gs.save();
  }

  // ==================
  // 단축로 선택 다이얼로그
  // ==================
  _showShortcutDialog(nodeIdx) {
    const names = { 5: '좌하 모서리', 10: '좌상 모서리', 15: '우상 모서리' };
    document.getElementById('shortcut-node-name').textContent = names[nodeIdx] || '모서리';
    document.getElementById('shortcut-dialog').classList.add('active');
  }

  _handleShortcutChoice(takeShortcut) {
    document.getElementById('shortcut-dialog').classList.remove('active');
    if (!this.shortcutPending) return;

    const { piece, roll, rollIdx, shortcutType } = this.shortcutPending;
    this.shortcutPending = null;

    const chosenPath = takeShortcut ? shortcutType : null;
    this.gameState.phase = 'select_piece';
    this._executeMove(piece, roll, rollIdx, chosenPath);
    this.audio.playClick();
  }

  // ==================
  // 말 하이라이트 (이동 가능한 말)
  // ==================
  _highlightMovablePieces() {
    const gs = this.gameState;
    if (gs.pendingRolls.length === 0) {
      this.renderer.clearHighlights();
      return;
    }

    const movableNodes = [];
    for (const piece of gs.getCurrentPieces()) {
      if (piece.finished) continue;
      if (piece.isHome()) {
        movableNodes.push(0); // 출발점 표시
      } else {
        movableNodes.push(piece.nodeIdx);
      }
    }
    this.renderer.setHighlightNodes([...new Set(movableNodes)]);
  }

  // ==================
  // 윷 결과 목록 UI
  // ==================
  _updateRollList() {
    const gs = this.gameState;
    const listEl = document.getElementById('roll-list');
    listEl.innerHTML = '';
    gs.pendingRolls.forEach((roll, idx) => {
      const item = document.createElement('div');
      item.className = `roll-item${gs.selectedRollIdx === idx ? ' selected' : ''}`;
      item.dataset.idx = idx;
      item.innerHTML = `<span class="roll-name">${roll.name}</span><span class="roll-steps">${roll.steps}칸</span>`;
      listEl.appendChild(item);
    });
  }

  _selectRoll(idx) {
    if (!this.gameState) return;
    this.gameState.selectedRollIdx = idx;
    this._updateRollList();
    this.audio.playClick();
  }

  // ==================
  // UI 업데이트
  // ==================
  _updateUI() {
    const gs = this.gameState;
    if (!gs) return;

    // 완주 말 수 및 말 상태 업데이트
    for (let pi = 0; pi < 2; pi++) {
      const fc = gs.finishedCount(pi);
      const el = document.getElementById(`p${pi+1}-finished`);
      if (el) el.textContent = `완주: ${fc}/4`;
      const bar = document.getElementById(`p${pi+1}-bar`);
      if (bar) bar.style.width = `${fc * 25}%`;

      // 말 표시기 업데이트
      const piecesEl = document.getElementById(`p${pi+1}-pieces`);
      if (piecesEl) {
        const indicators = piecesEl.querySelectorAll('.piece-indicator');
        gs.pieces[pi].forEach((piece, i) => {
          const ind = indicators[i];
          if (!ind) return;
          ind.className = `piece-indicator p${pi+1}`;
          if (piece.finished) ind.classList.add('finished');
          else if (piece.isOnBoard()) ind.classList.add('on-board');
          else ind.classList.add('home');
        });
      }
    }

    // 게임 로그
    const logEl = document.getElementById('game-log');
    if (logEl && gs.log.length > 0) {
      logEl.textContent = gs.log[gs.log.length - 1].msg;
    }

    // 던지기 버튼 상태
    const throwBtn = document.getElementById('btn-throw');
    if (gs.phase === 'throw') {
      throwBtn.disabled = false;
    } else if (gs.phase === 'select_piece') {
      // 추가 던지기 가능하면 던지기 버튼 활성화
      throwBtn.disabled = gs.pendingRolls.length === 0 || !gs.lastRollResult?.isBonus;
    }

    // 현재 플레이어 표시
    this._updateTurnIndicator();
  }

  _updateTurnIndicator() {
    const gs = this.gameState;
    if (!gs) return;
    const p1Panel = document.getElementById('p1-panel');
    const p2Panel = document.getElementById('p2-panel');
    if (p1Panel) p1Panel.classList.toggle('active-player', gs.currentPlayer === 0);
    if (p2Panel) p2Panel.classList.toggle('active-player', gs.currentPlayer === 1);

    const turnEl = document.getElementById('turn-text');
    if (turnEl) {
      const names = ['플레이어 1 (빨강)', gs.mode === 'cpu' ? 'AI (파랑)' : '플레이어 2 (파랑)'];
      turnEl.textContent = `${names[gs.currentPlayer]}의 턴`;
      turnEl.className = `turn-text player-${gs.currentPlayer + 1}`;
    }
  }

  _showMessage(msg, type = 'normal') {
    const el = document.getElementById('game-message');
    if (!el) return;
    el.textContent = msg;
    el.className = `game-message msg-${type} active`;
    clearTimeout(this._msgTimeout);
    this._msgTimeout = setTimeout(() => {
      el.classList.remove('active');
    }, 2500);
  }

  // ==================
  // 게임 오버
  // ==================
  _handleGameOver() {
    const gs = this.gameState;
    this.audio.playWin();
    vibrate([200, 100, 200, 100, 400]);

    const winnerName = gs.winner === 0 ? '플레이어 1 (빨강)' :
                       gs.mode === 'cpu' ? 'AI (파랑)' : '플레이어 2 (파랑)';

    document.getElementById('gameover-winner').textContent = `${winnerName} 승리!`;
    document.getElementById('gameover-stats').innerHTML = `
      <div>총 턴: ${gs.turnCount}</div>
      <div>P1 잡기: ${gs.stats[0].captures}회 / P2 잡기: ${gs.stats[1].captures}회</div>
      <div>P1 윷: ${gs.stats[0].yuts}회, 모: ${gs.stats[0].mos}회</div>
      <div>P2 윷: ${gs.stats[1].yuts}회, 모: ${gs.stats[1].mos}회</div>
    `;

    // 파티클 효과
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.renderer.addParticles(Math.floor(Math.random() * 20), 'finish');
      }, i * 300);
    }

    setTimeout(() => this._showScreen('gameover'), 1500);

    // 저장 삭제
    localStorage.removeItem('yutnori_state');
  }

  // ==================
  // CPU 자동 플레이
  // ==================
  async _cpuAutoThrow() {
    if (!this.gameState || this.gameState.currentPlayer !== 1) return;
    await this._handleThrow();
  }

  _cpuPlay() {
    const gs = this.gameState;
    if (!gs || gs.currentPlayer !== 1) return;
    if (gs.phase !== 'select_piece' || gs.pendingRolls.length === 0) return;

    // AI: 간단한 전략 - 잡을 수 있으면 잡기, 아니면 가장 앞선 말 이동
    setTimeout(() => {
      const roll = gs.pendingRolls[0];
      const pieces = gs.getCurrentPieces().filter(p => !p.finished);
      if (pieces.length === 0) return;

      // 잡기 가능한 말 우선
      let bestPiece = null;
      for (const piece of pieces) {
        const preview = gs.calculateMove(piece, roll.steps);
        if (!preview || preview.finished) { bestPiece = piece; break; }
        const oppAtTarget = gs.getOpponentPiecesAtNode(preview.newNodeIdx, preview.newPathType);
        if (oppAtTarget.length > 0) { bestPiece = piece; break; }
      }

      // 없으면 집에 있는 말 먼저, 그다음 가장 앞선 말
      if (!bestPiece) {
        bestPiece = pieces.find(p => p.isHome()) ||
                    pieces.reduce((a, b) => {
                      const aNode = a.nodeIdx < 0 ? 0 : a.nodeIdx;
                      const bNode = b.nodeIdx < 0 ? 0 : b.nodeIdx;
                      return aNode > bNode ? a : b;
                    });
      }

      if (bestPiece) {
        gs.selectedPieceRef = bestPiece;
        // 단축로: 항상 선택
        const preview = gs.calculateMove(bestPiece, roll.steps);
        if (preview && preview.canTakeShortcut) {
          const cornerMap = { 5: 'bl', 10: 'tl', 15: 'tr' };
          const shortcutType = cornerMap[preview.newNodeIdx];
          this._executeMove(bestPiece, roll, 0, shortcutType);
        } else {
          this._executeMove(bestPiece, roll, 0, null);
        }
      }
    }, 800);
  }
}

// ==================
// 앱 초기화
// ==================
let game;
window.addEventListener('DOMContentLoaded', () => {
  game = new YutnoriGame();
});
