// utils/particles.ts —— 赛博烟雾粒子系统（Canvas 2D，同层渲染）
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 剩余寿命（秒） */
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  color: string;
  baseAlpha: number;
  type: 'puff' | 'ring';
  wobbleAmp: number;
  wobbleSpeed: number;
  phase: number;
}

const MAX_PARTICLES = 320;

export class SmokeCanvas {
  private canvas: any = null;
  private ctx: any = null;
  private width = 0;
  private height = 0;
  private particles: Particle[] = [];
  private colors: string[] = ['#00ffd5'];
  private ambient = false;
  private running = false;
  private lastTs = 0;
  private ambientClock = 0;
  private dirty = false;

  /** 初始化画布并启动渲染循环（cssWidth/cssHeight 为逻辑像素） */
  init(canvas: any, cssWidth: number, cssHeight: number): void {
    this.canvas = canvas;
    const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    this.width = cssWidth;
    this.height = cssHeight;
    this.start();
  }

  setColors(colors: string[]): void {
    if (colors && colors.length) this.colors = colors;
  }

  /** 二手烟领域：常驻全屏雾气 */
  setAmbient(on: boolean): void {
    this.ambient = on;
  }

  clear(): void {
    this.particles = [];
  }

  start(): void {
    if (this.running || !this.canvas) return;
    this.running = true;
    this.lastTs = 0;
    const step = (ts: number) => {
      if (!this.running) return;
      if (!this.lastTs) this.lastTs = ts;
      const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.update(dt);
      this.draw();
      this.canvas.requestAnimationFrame(step);
    };
    this.canvas.requestAnimationFrame(step);
  }

  stop(): void {
    this.running = false;
  }

  /** 吐雾：从烟头位置喷出一团粒子；rings 为烟圈数量，因子控制烟款手感 */
  emitDrag(
    originX: number,
    originY: number,
    intensity: number,
    rings: number,
    sizeFactor = 1,
    speedFactor = 1,
  ): void {
    const count = Math.round(36 + 84 * intensity);
    for (let i = 0; i < count; i++) this.spawnPuff(originX, originY, intensity, sizeFactor, speedFactor);
    for (let i = 0; i < rings; i++) {
      this.particles.push(this.makeRing(originX, originY - 6, i, sizeFactor, speedFactor));
    }
    this.trim();
  }

  /** 试炼完成庆祝：从指定点喷出全彩粒子泉 */
  emitCelebration(originX: number, originY: number): void {
    const colors = ['#00ffd5', '#ff2e88', '#ffd166', '#a78bfa', '#38bdf8'];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 260;
      const maxLife = 1.2 + Math.random() * 1.2;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(a) * sp * 0.55,
        vy: -Math.abs(Math.sin(a)) * sp - 60,
        life: maxLife,
        maxLife,
        size: 4 + Math.random() * 7,
        grow: 4 + Math.random() * 6,
        color: colors[i % colors.length],
        baseAlpha: 0.7,
        type: 'puff',
        wobbleAmp: 10,
        wobbleSpeed: 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.trim();
  }

  private trim(): void {
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
  }

  private pickColor(): string {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  private spawnPuff(x: number, y: number, intensity: number, sizeFactor: number, speedFactor: number): void {
    const maxLife = 1.4 + Math.random() * 1.4;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 14,
      y: y + (Math.random() - 0.5) * 14,
      vx: (Math.random() * 60 + 15) * (0.5 + intensity) * speedFactor,
      vy: -(30 + Math.random() * 90) * (0.5 + intensity * 0.8) * speedFactor,
      life: maxLife,
      maxLife,
      size: (5 + Math.random() * 12) * sizeFactor,
      grow: 14 + Math.random() * 26,
      color: this.pickColor(),
      baseAlpha: 0.28 + Math.random() * 0.3,
      type: 'puff',
      wobbleAmp: 8 + Math.random() * 18,
      wobbleSpeed: 1 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
    });
  }

  private makeRing(x: number, y: number, idx: number, sizeFactor: number, speedFactor: number): Particle {
    return {
      x,
      y,
      vx: (24 + idx * 10) * speedFactor,
      vy: -36 * speedFactor,
      life: 1.6,
      maxLife: 1.6,
      size: (6 + idx * 10) * sizeFactor,
      grow: 90 + idx * 30,
      color: this.pickColor(),
      baseAlpha: 0.5,
      type: 'ring',
      wobbleAmp: 0,
      wobbleSpeed: 0,
      phase: 0,
    };
  }

  private spawnAmbient(): void {
    const maxLife = 7 + Math.random() * 4;
    this.particles.push({
      x: Math.random() * this.width,
      y: this.height + 30,
      vx: (Math.random() - 0.5) * 12,
      vy: -(8 + Math.random() * 16),
      life: maxLife,
      maxLife,
      size: 14 + Math.random() * 26,
      grow: 4 + Math.random() * 8,
      color: this.pickColor(),
      baseAlpha: 0.05 + Math.random() * 0.05,
      type: 'puff',
      wobbleAmp: 14 + Math.random() * 20,
      wobbleSpeed: 0.4 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
    });
  }

  private update(dt: number): void {
    if (this.ambient) {
      this.ambientClock += dt;
      if (this.ambientClock > 0.28) {
        this.ambientClock = 0;
        this.spawnAmbient();
        this.trim();
      }
    }
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.phase += p.wobbleSpeed * dt;
      p.x += (p.vx + Math.sin(p.phase) * p.wobbleAmp) * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
      next.push(p);
    }
    this.particles = next;
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    // 空闲时不重绘，省电；但需在最后一帧粒子消散后清一次画布
    if (this.particles.length === 0 && !this.ambient) {
      if (this.dirty) {
        ctx.clearRect(0, 0, this.width, this.height);
        this.dirty = false;
      }
      return;
    }
    this.dirty = true;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.particles) {
      const k = Math.max(0, p.life / p.maxLife);
      const alpha = p.baseAlpha * k;
      ctx.fillStyle = p.color;
      if (p.type === 'puff') {
        // 光晕 + 核心，两层制造辉光感
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
