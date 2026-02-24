// =============================================
// 윷 던지기 애니메이션 및 효과
// =============================================

class YutAnimator {
  constructor(container) {
    this.container = container;
    this.sticks = [];
    this.isAnimating = false;
    this._init();
  }

  _init() {
    this.container.innerHTML = '';
    this.sticks = [];

    for (let i = 0; i < 4; i++) {
      const stick = document.createElement('div');
      stick.className = 'yut-stick';
      stick.dataset.index = i;
      const inner = document.createElement('div');
      inner.className = 'yut-stick-inner';
      const front = document.createElement('div');
      front.className = 'yut-face yut-front';
      front.innerHTML = '<div class="yut-grain"></div>';
      const back = document.createElement('div');
      back.className = 'yut-face yut-back';
      back.innerHTML = '<div class="yut-carve"></div>';
      inner.appendChild(front);
      inner.appendChild(back);
      stick.appendChild(inner);
      this.container.appendChild(stick);
      this.sticks.push({ el: stick, inner, front, back, result: 0 });
    }
  }

  // 윷을 던지고 결과 반환 (Promise)
  throw(customResults = null) {
    return new Promise((resolve) => {
      if (this.isAnimating) return;
      this.isAnimating = true;

      // 결과 미리 계산
      const result = rollYut();
      const stickResults = customResults || result.stickResults;

      // 각 막대 애니메이션
      this.sticks.forEach((stick, i) => {
        const delay = i * 80;
        const duration = 600 + Math.random() * 400;
        const rotations = 3 + Math.floor(Math.random() * 3);
        const finalAngle = stickResults[i] === 1 ? 180 : 0; // 1=뒤(back)=flat
        const lateralTilt = (Math.random() - 0.5) * 20;

        stick.el.style.transition = 'none';
        stick.el.style.transform = `rotate(${lateralTilt}deg)`;

        // 던지기 애니메이션
        stick.inner.style.transition = 'none';
        stick.inner.style.transform = 'rotateX(0deg)';

        setTimeout(() => {
          stick.el.style.transition = `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
          stick.el.style.transform = `rotate(${lateralTilt}deg) translateY(-30px)`;
          stick.inner.style.transition = `transform ${duration}ms cubic-bezier(0.23, 1, 0.32, 1)`;
          stick.inner.style.transform = `rotateX(${rotations * 360 + finalAngle}deg)`;

          stick.result = stickResults[i];
        }, delay);
      });

      const totalDuration = 600 + 3 * 80 + 400 + 100;
      setTimeout(() => {
        // 착지 - 위치 복귀
        this.sticks.forEach((stick, i) => {
          setTimeout(() => {
            stick.el.style.transition = 'transform 200ms ease-out';
            stick.el.style.transform = `rotate(${(Math.random()-0.5)*10}deg)`;
          }, i * 50);
        });

        setTimeout(() => {
          this.isAnimating = false;
          this._showResult(result);
          resolve(result);
        }, 300);
      }, totalDuration);
    });
  }

  _showResult(result) {
    // 결과 표시 레이블
    const resultEl = this.container.querySelector('.yut-result-label');
    if (resultEl) {
      resultEl.textContent = result.name;
      resultEl.className = `yut-result-label yut-${result.name}`;
      resultEl.style.animation = 'none';
      void resultEl.offsetWidth;
      resultEl.style.animation = 'yutResultPop 0.5s ease-out forwards';
    }

    // 각 막대에 결과 표시
    this.sticks.forEach((stick, i) => {
      const isFront = result.stickResults[i] === 0;
      stick.front.style.opacity = isFront ? '1' : '0.3';
      stick.back.style.opacity = isFront ? '0.3' : '1';
    });
  }

  reset() {
    this.sticks.forEach(stick => {
      stick.el.style.transition = 'none';
      stick.el.style.transform = '';
      stick.inner.style.transition = 'none';
      stick.inner.style.transform = 'rotateX(0deg)';
      stick.front.style.opacity = '1';
      stick.back.style.opacity = '1';
    });
  }
}

// =============================================
// 오디오 매니저 (Web Audio API)
// =============================================

class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._init();
  }

  _init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {
      this.enabled = false;
    }
  }

  _resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 윷 던지는 소리 (나무 막대 소리)
  playThrow() {
    if (!this.enabled || !this.ctx) return;
    this._resume();
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this._woodHit(), i * 80 + Math.random() * 50);
    }
  }

  // 나무 막대 소리
  _woodHit() {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, 4096, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < 4096; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800 + Math.random() * 400;
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.15);
  }

  // 이동 소리 (부드러운 탁 소리)
  playMove() {
    if (!this.enabled || !this.ctx) return;
    this._resume();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // 잡기 소리 (타격음)
  playCapture() {
    if (!this.enabled || !this.ctx) return;
    this._resume();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(300 - i*50, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // 완주 소리 (팡파레)
  playFinish() {
    if (!this.enabled || !this.ctx) return;
    this._resume();
    const ctx = this.ctx;
    const melody = [523, 659, 784, 1047];
    melody.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // 윷/모 보너스 소리
  playBonus() {
    if (!this.enabled || !this.ctx) return;
    this._resume();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const t = now + i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // 승리 소리 (웅장한 팡파레)
  playWin() {
    if (!this.enabled || !this.ctx) return;
    this._resume();
    const ctx = this.ctx;
    const pattern = [523,0,784,0,784,659,784,0,0,1047];
    pattern.forEach((freq, i) => {
      if (freq === 0) return;
      const t = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // 버튼 클릭 소리
  playClick() {
    if (!this.enabled || !this.ctx) return;
    this._resume();
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 600;
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// =============================================
// 진동 피드백
// =============================================
function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
