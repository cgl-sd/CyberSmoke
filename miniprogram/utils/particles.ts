// utils/particles.ts —— 白色烟雾渲染引擎（Canvas 2D 同层渲染）
// 视觉 Reference：#090A0C 背景 + #E8EEEE 白烟 + #75F4D2 薄荷青高亮（规格 §29）
import { Point } from '../data/rings';

const SMOKE = '#E8EEEE';
const MINT = '#75F4D2';
const RARE = '#B794F6';
const MAX_PARTICLES = 260;
const TRAIL_FADE_MS = 520;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  color: string;
  alpha: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  phase: number;
}

export class SmokeField {
  private canvas: any = null;
  private ctx: any = null;
  private width = 0;
  private height = 0;
  private particles: Particle[] = [];
  private trail: Point[] = [];
  private running = false;
  private lastTs = 0;
  private dirty = false;

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

  setTrail(points: Point[]): void {
    this.trail = points;
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
      this.draw(ts);
      this.canvas.requestAnimationFrame(step);
    };
    this.canvas.requestAnimationFrame(step);
  }

  stop(): void {
    this.running = false;
  }

  clearAll(): void {
    this.particles = [];
    this.trail = [];
  }

  /** 香烟头部常驻细烟（READY / 蓄力时稀疏飘出） */
  wisp(x: number, y: number, intensity = 0.4): void {
    const maxLife = 1.6 + Math.random() * 1.2;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 6,
      y,
      vx: (Math.random() - 0.5) * 14,
      vy: -(24 + Math.random() * 40) * (0.6 + intensity),
      life: maxLife,
      maxLife,
      size: 4 + Math.random() * 7 * intensity,
      grow: 12 + Math.random() * 16,
      color: SMOKE,
      alpha: 0.10 + Math.random() * 0.10 * (0.5 + intensity),
      wobbleAmp: 10 + Math.random() * 14,
      wobbleSpeed: 0.8 + Math.random(),
      phase: Math.random() * Math.PI * 2,
    });
    this.trim();
  }

  /** 松手吐雾：从烟头喷出一团烟雾 */
  burst(x: number, y: number, intensity: number): void {
    const count = Math.round(26 + 60 * intensity);
    for (let i = 0; i < count; i++) {
      const maxLife = 1.1 + Math.random() * 1.1;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: (Math.random() - 0.2) * 70 * (0.5 + intensity),
        vy: -(40 + Math.random() * 90) * (0.5 + intensity),
        life: maxLife,
        maxLife,
        size: 6 + Math.random() * 12,
        grow: 18 + Math.random() * 26,
        color: SMOKE,
        alpha: 0.16 + Math.random() * 0.2,
        wobbleAmp: 8 + Math.random() * 16,
        wobbleSpeed: 1 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.trim();
  }

  /** 结算：沿评分圆周生成烟圈（质量越高越浓，PERFECT 带紫） */
  smokeRing(
    cx: number,
    cy: number,
    radius: number,
    quality: number,
    perfect: boolean,
  ): void {
    const count = Math.round(radius * 0.9) + 30;
    const color = perfect ? RARE : Math.random() < 0.2 ? MINT : SMOKE;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * radius * 0.12;
      const maxLife = 1.4 + Math.random() * 1.4;
      this.particles.push({
        x: cx + Math.cos(a) * (radius + jitter),
        y: cy + Math.sin(a) * (radius + jitter) * 0.96,
        vx: Math.cos(a) * (6 + Math.random() * 16),
        vy: Math.sin(a) * (6 + Math.random() * 16) - 14,
        life: maxLife,
        maxLife,
        size: 5 + Math.random() * 9 + (quality / 100) * 6,
        grow: 12 + Math.random() * 14,
        color,
        alpha: 0.14 + Math.random() * 0.16 + (quality / 100) * 0.1,
        wobbleAmp: 6 + Math.random() * 10,
        wobbleSpeed: 0.8 + Math.random(),
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

  private update(dt: number): void {
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
    const now = Date.now();
    while (this.trail.length && now - this.trail[0].t > TRAIL_FADE_MS) this.trail.shift();
  }

  private draw(ts: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.particles.length === 0 && this.trail.length === 0) {
      if (this.dirty) {
        ctx.clearRect(0, 0, this.width, this.height);
        this.dirty = false;
      }
      return;
    }
    this.dirty = true;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.globalCompositeOperation = 'lighter';

    // 手指轨迹：白色烟迹
    const now = Date.now();
    for (const t of this.trail) {
      const age = now - t.t;
      if (age > TRAIL_FADE_MS) continue;
      const k = 1 - age / TRAIL_FADE_MS;
      ctx.globalAlpha = 0.30 * k;
      ctx.fillStyle = SMOKE;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 9 + age / 22, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.particles) {
      const k = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = p.alpha * k;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      // 光晕
      ctx.globalAlpha = p.alpha * k * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}
