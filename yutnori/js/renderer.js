// =============================================
// 윷놀이 보드 렌더러 (Canvas 2D)
// =============================================

class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.animating = false;
    this.animations = []; // { piece, fromPos, toPos, progress, duration }
    this.highlightNodes = [];
    this.glowNodes = [];
    this.particles = [];
    this._lastFrame = 0;
  }

  resize() {
    const container = this.canvas.parentElement;
    const size = Math.min(container.clientWidth, container.clientHeight, 500);
    this.canvas.width = size;
    this.canvas.height = size;
    this.scale = size / BOARD_SIZE;
  }

  // 노드 화면 좌표 반환 (스케일 적용)
  getNodeScreen(nodeIdx) {
    const n = NODE_POSITIONS[nodeIdx];
    return {
      x: n.x * this.scale,
      y: n.y * this.scale,
    };
  }

  // 전체 보드 렌더링
  render(gameState, hoveredNode = -1) {
    const ctx = this.ctx;
    const s = this.scale;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this._drawBackground(s);
    this._drawDiagonals(s);
    this._drawOuterRing(s);
    this._drawNodes(s, gameState, hoveredNode);
    this._drawPieces(s, gameState);
    this._drawParticles(s);
  }

  _drawBackground(s) {
    const ctx = this.ctx;
    const size = BOARD_SIZE * s;

    // 보드 배경 - 한지 텍스처 느낌
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size*0.7);
    gradient.addColorStop(0, '#F9EDD5');
    gradient.addColorStop(1, '#EDD9B0');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(BOARD_PADDING*s*0.3, BOARD_PADDING*s*0.3,
      (BOARD_SIZE - BOARD_PADDING*0.6)*s, (BOARD_SIZE - BOARD_PADDING*0.6)*s, 16*s);
    ctx.fill();

    // 나무 테두리
    ctx.strokeStyle = COLORS.boardBorder;
    ctx.lineWidth = 6 * s;
    ctx.stroke();

    // 안쪽 보더
    ctx.strokeStyle = '#A0522D';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.roundRect(BOARD_PADDING*s*0.5, BOARD_PADDING*s*0.5,
      (BOARD_SIZE - BOARD_PADDING)*s, (BOARD_SIZE - BOARD_PADDING)*s, 10*s);
    ctx.stroke();
  }

  _drawOuterRing(s) {
    const ctx = this.ctx;
    // 외곽 직선 연결
    ctx.beginPath();
    ctx.strokeStyle = COLORS.boardLine;
    ctx.lineWidth = 3 * s;
    ctx.lineJoin = 'round';

    // Bottom edge: 0→5
    for (let i = 0; i <= 5; i++) {
      const n = NODE_POSITIONS[i];
      i === 0 ? ctx.moveTo(n.x*s, n.y*s) : ctx.lineTo(n.x*s, n.y*s);
    }
    // Left edge: 5→10
    for (let i = 5; i <= 10; i++) {
      const n = NODE_POSITIONS[i];
      ctx.lineTo(n.x*s, n.y*s);
    }
    // Top edge: 10→15
    for (let i = 10; i <= 15; i++) {
      const n = NODE_POSITIONS[i];
      ctx.lineTo(n.x*s, n.y*s);
    }
    // Right edge: 15→19→0
    for (let i = 15; i <= 19; i++) {
      const n = NODE_POSITIONS[i];
      ctx.lineTo(n.x*s, n.y*s);
    }
    ctx.lineTo(NODE_POSITIONS[0].x*s, NODE_POSITIONS[0].y*s);
    ctx.stroke();
  }

  _drawDiagonals(s) {
    const ctx = this.ctx;
    ctx.strokeStyle = COLORS.boardLine;
    ctx.lineWidth = 2.5 * s;
    ctx.setLineDash([6*s, 3*s]);

    // BL(5) → center(23) → TR(15)
    ctx.beginPath();
    ctx.moveTo(NODE_POSITIONS[5].x*s, NODE_POSITIONS[5].y*s);
    ctx.lineTo(NODE_POSITIONS[20].x*s, NODE_POSITIONS[20].y*s);
    ctx.lineTo(NODE_POSITIONS[23].x*s, NODE_POSITIONS[23].y*s);
    ctx.lineTo(NODE_POSITIONS[22].x*s, NODE_POSITIONS[22].y*s);
    ctx.lineTo(NODE_POSITIONS[15].x*s, NODE_POSITIONS[15].y*s);
    ctx.stroke();

    // TL(10) → center(23) → exit(24) → BR(0)
    ctx.beginPath();
    ctx.moveTo(NODE_POSITIONS[10].x*s, NODE_POSITIONS[10].y*s);
    ctx.lineTo(NODE_POSITIONS[21].x*s, NODE_POSITIONS[21].y*s);
    ctx.lineTo(NODE_POSITIONS[23].x*s, NODE_POSITIONS[23].y*s);
    ctx.lineTo(NODE_POSITIONS[24].x*s, NODE_POSITIONS[24].y*s);
    ctx.lineTo(NODE_POSITIONS[0].x*s, NODE_POSITIONS[0].y*s);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  _drawNodes(s, gameState, hoveredNode) {
    const ctx = this.ctx;

    for (let i = 0; i < NODE_POSITIONS.length; i++) {
      const n = NODE_POSITIONS[i];
      const nx = n.x * s;
      const ny = n.y * s;
      const isCorner = [0, 5, 10, 15].includes(i);
      const isCenter = i === 23;
      const isInner = SHORTCUT_NODES.has(i);
      const isHighlighted = this.highlightNodes.includes(i);
      const isHovered = hoveredNode === i;
      const special = SPECIAL_TILES[i];

      let radius = (isCorner ? 16 : isCenter ? 18 : isInner ? 12 : 11) * s;
      if (isHighlighted) radius += 4 * s;

      // 그림자
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 6 * s;

      // 노드 원
      ctx.beginPath();
      ctx.arc(nx, ny, radius, 0, Math.PI * 2);

      if (isHighlighted) {
        ctx.fillStyle = COLORS.highlight;
        ctx.strokeStyle = '#27AE60';
        ctx.lineWidth = 3 * s;
      } else if (isHovered) {
        ctx.fillStyle = '#FFF3CD';
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 3 * s;
      } else if (isCenter) {
        const cg = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius);
        cg.addColorStop(0, '#FFD700');
        cg.addColorStop(1, '#FF8C00');
        ctx.fillStyle = cg;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2 * s;
      } else if (isCorner) {
        const cg = ctx.createRadialGradient(nx, ny, 0, nx, ny, radius);
        cg.addColorStop(0, '#DEB887');
        cg.addColorStop(1, '#A0522D');
        ctx.fillStyle = cg;
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2.5 * s;
      } else if (isInner) {
        ctx.fillStyle = '#F0C040';
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1.5 * s;
      } else if (special) {
        const colors = { speed: '#A8E6CF', slow: '#DDA0DD', teleport: '#87CEEB' };
        ctx.fillStyle = colors[special.type] || '#DEB887';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1.5 * s;
      } else {
        ctx.fillStyle = COLORS.outerNode;
        ctx.strokeStyle = '#A0522D';
        ctx.lineWidth = 1.5 * s;
      }

      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 특수 타일 아이콘
      if (special && !isHighlighted) {
        ctx.fillStyle = special.type === 'speed' ? '#27AE60' : special.type === 'slow' ? '#8E44AD' : '#2980B9';
        ctx.font = `bold ${8*s}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { speed: '⚡', slow: '↩', teleport: '✦' };
        ctx.fillText(icons[special.type], nx, ny);
      }

      // 출발 마크
      if (i === 0) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `bold ${8*s}px Noto Serif KR, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('출발', nx, ny);
      }

      // 중심 마크
      if (i === 23) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `bold ${8*s}px Noto Serif KR, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('중', nx, ny);
      }

      // 하이라이트 펄스 효과
      if (isHighlighted) {
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(nx, ny, (radius + 5*s) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(46, 204, 113, ${0.5 * pulse})`;
        ctx.lineWidth = 2 * s;
        ctx.stroke();
      }
    }
  }

  _drawPieces(s, gameState) {
    const ctx = this.ctx;

    for (let pi = 0; pi < 2; pi++) {
      const color = pi === 0 ? COLORS.p1Color : COLORS.p2Color;
      const lightColor = pi === 0 ? COLORS.p1Light : COLORS.p2Light;

      // 노드별 그룹핑
      const nodeGroups = new Map();
      for (const piece of gameState.pieces[pi]) {
        if (!piece.isOnBoard()) continue;
        const key = `${piece.nodeIdx}_${piece.pathType}`;
        if (!nodeGroups.has(key)) nodeGroups.set(key, { pieces: [], nodeIdx: piece.nodeIdx });
        nodeGroups.get(key).pieces.push(piece);
      }

      for (const [key, group] of nodeGroups) {
        const n = NODE_POSITIONS[group.nodeIdx];
        if (!n) continue;
        const nx = n.x * s;
        const ny = n.y * s;
        const count = group.pieces.length;

        // 여러 말이 겹쳐있을 때 배치
        const offsets = this._getPieceOffsets(count, s);
        for (let j = 0; j < count; j++) {
          const piece = group.pieces[j];
          const [ox, oy] = offsets[j];
          this._drawSinglePiece(ctx, nx + ox, ny + oy, color, lightColor, pi + 1, count > 1 ? count : 0, s, piece === gameState.selectedPieceRef);
        }
      }
    }
  }

  _getPieceOffsets(count, s) {
    const d = 10 * s;
    switch (count) {
      case 1: return [[0, 0]];
      case 2: return [[-d, -d], [d, d]];
      case 3: return [[-d, -d], [d, -d], [0, d]];
      case 4: return [[-d, -d], [d, -d], [-d, d], [d, d]];
      default: return [[0, 0]];
    }
  }

  _drawSinglePiece(ctx, x, y, color, lightColor, playerNum, stackCount, s, isSelected) {
    const r = 12 * s;

    // 그림자
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8 * s;

    // 선택된 말 - 황금 링
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5*s, 0, Math.PI*2);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3 * s;
      ctx.stroke();
    }

    // 말 본체 (한국 전통 장기 말 느낌 - 육각형 또는 오각형)
    ctx.beginPath();
    this._hexPath(ctx, x, y, r);
    const grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
    grad.addColorStop(0, lightColor);
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // 플레이어 번호 표시
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${9*s}px Noto Serif KR, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(playerNum === 1 ? '●' : '◆', x, y);

    // 스택 표시
    if (stackCount > 1) {
      ctx.fillStyle = COLORS.gold;
      ctx.font = `bold ${8*s}px sans-serif`;
      ctx.fillText(`×${stackCount}`, x + r*0.8, y - r*0.8);
    }
  }

  _hexPath(ctx, x, y, r) {
    ctx.moveTo(x + r, y);
    for (let i = 1; i <= 6; i++) {
      const angle = (Math.PI / 3) * i;
      ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
  }

  // 파티클 이펙트 (잡기, 완주 등)
  addParticles(nodeIdx, type) {
    const n = NODE_POSITIONS[nodeIdx] || NODE_POSITIONS[23];
    const colors = type === 'capture' ? ['#E74C3C','#F39C12','#FFD700'] :
                   type === 'finish' ? ['#2ECC71','#3498DB','#FFD700','#E74C3C'] :
                   ['#FFD700'];
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: n.x, y: n.y,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80 - 40,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
      });
    }
  }

  _drawParticles(s) {
    const ctx = this.ctx;
    this.particles = this.particles.filter(p => p.life > 0);
    for (const p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x * s, p.y * s, p.size * s * p.life, 0, Math.PI*2);
      ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2,'0');
      ctx.fill();
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.vy += 2;
      p.life -= p.decay;
    }
  }

  // 클릭한 위치에 가장 가까운 노드 반환
  getNodeAtPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const cx = (clientX - rect.left) / this.scale;
    const cy = (clientY - rect.top) / this.scale;

    let closest = -1;
    let minDist = Infinity;
    for (let i = 0; i < NODE_POSITIONS.length; i++) {
      const n = NODE_POSITIONS[i];
      const d = Math.hypot(cx - n.x, cy - n.y);
      const threshold = [0,5,10,15].includes(i) ? 20 : 16;
      if (d < threshold && d < minDist) {
        minDist = d;
        closest = i;
      }
    }
    return closest;
  }

  setHighlightNodes(nodes) {
    this.highlightNodes = nodes || [];
  }

  clearHighlights() {
    this.highlightNodes = [];
  }

  // 말 이동 애니메이션 (단계별)
  animatePieceMove(piece, fromNodeIdx, toNodeIdx, onComplete) {
    const duration = 400;
    const start = Date.now();
    const from = NODE_POSITIONS[fromNodeIdx] || NODE_POSITIONS[0];
    const to = NODE_POSITIONS[toNodeIdx] || NODE_POSITIONS[0];

    const step = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t; // ease in-out

      // 임시 위치 저장 (렌더링에서 사용)
      piece._animX = from.x + (to.x - from.x) * ease;
      piece._animY = from.y + (to.y - from.y) * ease;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        piece._animX = undefined;
        piece._animY = undefined;
        if (onComplete) onComplete();
      }
    };
    requestAnimationFrame(step);
  }
}
