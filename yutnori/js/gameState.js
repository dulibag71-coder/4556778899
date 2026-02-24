// =============================================
// 윷놀이 게임 상태 관리
// =============================================

class Piece {
  constructor(playerIdx, pieceIdx) {
    this.playerIdx = playerIdx;
    this.pieceIdx = pieceIdx;
    this.nodeIdx = -1;       // -1 = 출발 전 (집)
    this.pathType = 'outer'; // 'outer' | 'bl' | 'tl' | 'tr'
    this.finished = false;
    this.stackedWith = [];   // 같은 칸에 있는 아군 말 인덱스 목록
  }

  isHome() { return this.nodeIdx === -1; }
  isFinished() { return this.finished; }
  isOnBoard() { return !this.isHome() && !this.finished; }
}

class GameState {
  constructor(mode = '2p') {
    this.mode = mode; // '2p' | 'cpu'
    this.currentPlayer = 0;
    this.pieces = [
      [new Piece(0,0), new Piece(0,1), new Piece(0,2), new Piece(0,3)],
      [new Piece(1,0), new Piece(1,1), new Piece(1,2), new Piece(1,3)],
    ];
    this.pendingRolls = [];    // 미사용 윷 결과 스택
    this.phase = 'throw';      // 'throw' | 'select_piece' | 'select_shortcut' | 'animate' | 'gameover'
    this.selectedRollIdx = -1; // 선택된 윷 결과 인덱스
    this.selectedPieceRef = null;
    this.shortcutChoice = null; // { piece, shortcutPath }
    this.winner = -1;
    this.lastCapture = false;
    this.lastRollResult = null;
    this.log = [];             // 게임 로그
    this.turnCount = 0;
    this.stats = [
      { wins: 0, captures: 0, yuts: 0, mos: 0 },
      { wins: 0, captures: 0, yuts: 0, mos: 0 },
    ];
  }

  // 현재 플레이어의 말 목록 반환
  getCurrentPieces() {
    return this.pieces[this.currentPlayer];
  }

  // 상대방 말 목록
  getOpponentPieces() {
    return this.pieces[1 - this.currentPlayer];
  }

  // 말 이동 가능 여부 확인 (집에 있거나 보드 위에 있는 말)
  canMovePiece(piece) {
    if (piece.finished) return false;
    return true; // 집에 있어도 보드에 올릴 수 있음
  }

  // 특정 노드에 있는 현재 플레이어의 말 찾기
  getPiecesAtNode(playerIdx, nodeIdx, pathType) {
    return this.pieces[playerIdx].filter(p =>
      !p.finished && p.nodeIdx === nodeIdx && p.pathType === pathType
    );
  }

  // 상대방 말이 해당 노드에 있는지 확인
  getOpponentPiecesAtNode(nodeIdx, pathType) {
    const opp = 1 - this.currentPlayer;
    return this.pieces[opp].filter(p =>
      !p.finished && p.nodeIdx === nodeIdx && p.pathType === pathType
    );
  }

  // 주어진 말의 steps 이동 후 도달 노드 계산
  // 반환: { newNodeIdx, newPathType, finished, passedCorner, shortcutOptions }
  calculateMove(piece, steps) {
    if (piece.finished) return null;

    let nodeIdx = piece.nodeIdx;
    let pathType = piece.pathType;
    let remaining = steps;
    let finished = false;
    let passedCorner = null; // 모서리 통과 여부 (단축로 선택 가능)

    // 집에서 출발하면 0번 노드(출발점)부터 시작
    if (nodeIdx === -1) {
      // 집에서 나올 때는 steps만큼 직접 이동
      nodeIdx = 0; // 출발점에 놓고
      remaining = steps - 1; // 출발점에서 steps-1 더 이동
      pathType = 'outer';
    }

    // steps만큼 이동
    for (let s = 0; s < remaining; s++) {
      const next = this._getNextNode(nodeIdx, pathType);
      if (next === 'finish') {
        finished = true;
        nodeIdx = -2; // 완주 표시
        break;
      }
      nodeIdx = next.nodeIdx;
      pathType = next.pathType;
    }

    // 모서리 도달 시 단축로 선택 가능 여부
    let canTakeShortcut = false;
    if (!finished && [5, 10, 15].includes(nodeIdx) && pathType === 'outer') {
      canTakeShortcut = true;
    }

    return {
      newNodeIdx: nodeIdx,
      newPathType: pathType,
      finished,
      canTakeShortcut,
    };
  }

  // 한 칸 앞의 노드 반환
  _getNextNode(nodeIdx, pathType) {
    if (pathType === 'outer') {
      const next = OUTER_PATH_NEXT[nodeIdx];
      if (next === 'finish') return 'finish';
      return { nodeIdx: next, pathType: 'outer' };
    }
    // 단축로 이동
    const map = SHORTCUT_NEXT[pathType];
    const next = map[nodeIdx];
    if (next === 'finish') return 'finish';
    return { nodeIdx: next, pathType };
  }

  // 말 이동 실행
  // options: { piece, steps, pathType (단축로 선택 시) }
  // 반환: { captured, bonus, finished, specialEffect }
  applyMove(piece, steps, chosenPathType = null) {
    let nodeIdx = piece.nodeIdx;
    let pathType = piece.pathType;
    let remaining = steps;
    let finished = false;

    // 집에서 나오기
    if (nodeIdx === -1) {
      nodeIdx = 0;
      remaining = steps - 1;
      pathType = 'outer';
    }

    // 단축로 선택이 미리 주어진 경우 (모서리 도달 후 선택)
    if (chosenPathType && [5, 10, 15].includes(nodeIdx)) {
      pathType = chosenPathType;
    }

    for (let s = 0; s < remaining; s++) {
      const next = this._getNextNode(nodeIdx, pathType);
      if (next === 'finish') {
        finished = true;
        break;
      }
      nodeIdx = next.nodeIdx;
      pathType = next.pathType;

      // 모서리 도달 & 단축로 선택 있으면 적용
      if (chosenPathType && [5, 10, 15].includes(nodeIdx) && pathType === 'outer') {
        pathType = chosenPathType;
      }
    }

    // 특수 타일 처리
    let specialEffect = null;
    if (!finished && SPECIAL_TILES[nodeIdx] && pathType === 'outer') {
      const tile = SPECIAL_TILES[nodeIdx];
      if (tile.type === 'speed') {
        // +1 추가 이동 (재귀적으로 한 칸 더)
        const extra = this._getNextNode(nodeIdx, pathType);
        if (extra === 'finish') { finished = true; }
        else { nodeIdx = extra.nodeIdx; pathType = extra.pathType; }
        specialEffect = tile;
      } else if (tile.type === 'slow') {
        // 한 칸 후퇴
        if (pathType === 'outer' && nodeIdx > 0) {
          nodeIdx = nodeIdx - 1;
        }
        specialEffect = tile;
      } else if (tile.type === 'teleport') {
        // 중심으로 이동
        nodeIdx = 23;
        pathType = 'tl'; // center로 들어온 경우 tl path로 처리
        specialEffect = tile;
      }
    }

    // 이전 위치에서 말 제거
    this._removePieceFromStack(piece);

    // 말 위치 업데이트
    if (finished) {
      piece.nodeIdx = -2;
      piece.finished = true;
      piece.pathType = 'outer';
    } else {
      piece.nodeIdx = nodeIdx;
      piece.pathType = pathType;
    }

    // 스택 말 함께 이동
    const stackedPieces = piece.stackedWith.slice();
    piece.stackedWith = [];
    for (const sp of stackedPieces) {
      this._removePieceFromStack(sp);
      if (finished) {
        sp.nodeIdx = -2;
        sp.finished = true;
        sp.pathType = 'outer';
      } else {
        sp.nodeIdx = nodeIdx;
        sp.pathType = pathType;
      }
    }

    // 아군 말 스택 처리
    if (!finished) {
      const allies = this.getPiecesAtNode(this.currentPlayer, nodeIdx, pathType)
        .filter(p => p !== piece && !stackedPieces.includes(p));
      for (const ally of allies) {
        if (!piece.stackedWith.includes(ally)) {
          piece.stackedWith.push(ally);
          ally.stackedWith = ally.stackedWith.filter(p => p !== piece);
          ally.stackedWith.push(piece);
        }
      }
      // 스택된 말들끼리도 연결
      for (const sp of stackedPieces) {
        sp.stackedWith = [];
        for (const sp2 of stackedPieces) {
          if (sp !== sp2) sp.stackedWith.push(sp2);
        }
        piece.stackedWith.push(sp);
        sp.stackedWith.push(piece);
      }
    }

    // 상대 말 잡기 처리
    let captured = false;
    if (!finished) {
      const oppPieces = this.getOpponentPiecesAtNode(nodeIdx, pathType);
      if (oppPieces.length > 0) {
        // 상대 말 전부 집으로 보냄
        for (const op of oppPieces) {
          // 스택 전체도 집으로
          const opStack = op.stackedWith.slice();
          op.stackedWith = [];
          op.nodeIdx = -1;
          op.pathType = 'outer';
          for (const ops of opStack) {
            ops.stackedWith = [];
            ops.nodeIdx = -1;
            ops.pathType = 'outer';
          }
        }
        captured = true;
        this.stats[this.currentPlayer].captures++;
      }
    }

    // 완주 확인
    const finishedCount = this.pieces[this.currentPlayer].filter(p => p.finished).length;
    let gameOver = false;
    if (finishedCount === PIECE_COUNT) {
      this.winner = this.currentPlayer;
      this.phase = 'gameover';
      this.stats[this.currentPlayer].wins++;
      gameOver = true;
    }

    // 추가 턴 여부
    const bonus = captured || (this.lastRollResult && this.lastRollResult.isBonus);

    this.addLog(`플레이어${this.currentPlayer + 1}: 말 이동 → 노드${nodeIdx}${captured ? ' (잡기!)' : ''}${finished ? ' (완주!)' : ''}`);

    return { captured, bonus, finished, specialEffect, gameOver };
  }

  _removePieceFromStack(piece) {
    // 스택에서 자신을 제거
    for (const sp of piece.stackedWith) {
      sp.stackedWith = sp.stackedWith.filter(p => p !== piece);
    }
    piece.stackedWith = [];
  }

  // 턴 종료, 다음 플레이어로
  endTurn() {
    this.currentPlayer = 1 - this.currentPlayer;
    this.pendingRolls = [];
    this.phase = 'throw';
    this.selectedRollIdx = -1;
    this.selectedPieceRef = null;
    this.lastCapture = false;
    this.lastRollResult = null;
    this.turnCount++;
  }

  // 윷 결과 추가
  addRoll(result) {
    this.pendingRolls.push(result);
    this.lastRollResult = result;
    if (result.isBonus) {
      this.stats[this.currentPlayer][result.name === '윷' ? 'yuts' : 'mos']++;
    }
    this.addLog(`플레이어${this.currentPlayer + 1}: ${result.name} (${result.steps}칸)${result.isBonus ? ' + 추가 던지기!' : ''}`);
  }

  addLog(msg) {
    this.log.push({ time: Date.now(), msg });
    if (this.log.length > 50) this.log.shift();
  }

  // 완주한 말 수
  finishedCount(playerIdx) {
    return this.pieces[playerIdx].filter(p => p.finished).length;
  }

  // 게임 저장 (localStorage)
  save() {
    try {
      localStorage.setItem('yutnori_state', JSON.stringify({
        mode: this.mode,
        currentPlayer: this.currentPlayer,
        pieces: this.pieces.map(pp => pp.map(p => ({
          playerIdx: p.playerIdx,
          pieceIdx: p.pieceIdx,
          nodeIdx: p.nodeIdx,
          pathType: p.pathType,
          finished: p.finished,
        }))),
        turnCount: this.turnCount,
        stats: this.stats,
      }));
    } catch(e) {}
  }

  // 게임 불러오기
  static load() {
    try {
      const data = JSON.parse(localStorage.getItem('yutnori_state'));
      if (!data) return null;
      const gs = new GameState(data.mode);
      gs.currentPlayer = data.currentPlayer;
      gs.turnCount = data.turnCount;
      gs.stats = data.stats;
      for (let pi = 0; pi < 2; pi++) {
        for (let i = 0; i < PIECE_COUNT; i++) {
          const pd = data.pieces[pi][i];
          gs.pieces[pi][i].nodeIdx = pd.nodeIdx;
          gs.pieces[pi][i].pathType = pd.pathType;
          gs.pieces[pi][i].finished = pd.finished;
        }
      }
      return gs;
    } catch(e) { return null; }
  }
}
