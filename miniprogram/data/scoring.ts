// data/scoring.ts —— 蓄力修正 / 评级 / Combo / 得分（纯函数，规格 §5、§8、§10、§11）
import { TraceReport } from './rings';

export const BASE_SCORE = 1000;
export const MAX_CHARGE_MS = 2800;
export const PERFECT_MIN = 0.45;
export const PERFECT_MAX = 0.72;
/** 绘制窗口时长 */
export const DRAW_TIME_MS = 3000;
/** Combo 加成上限 */
export const COMBO_CAP = 2;

export type Rank = 'C' | 'B' | 'A' | 'S' | 'PERFECT' | 'LEGEND';

export const RANK_ORDER: Rank[] = ['C', 'B', 'A', 'S', 'PERFECT', 'LEGEND'];

/** 蓄力区间修正（存在最佳区间，禁止按满手 > 一切） */
export function chargeFactor(fraction: number): number {
  const f = Math.max(0, Math.min(1, fraction));
  if (f <= 0.25) return 0.6;
  if (f <= 0.44) return 0.8;
  if (f <= 0.72) return 1.2;
  if (f <= 0.89) return 0.9;
  return 0.65;
}

/** 是否命中 Perfect Zone */
export function isPerfectInhale(fraction: number): boolean {
  const f = Math.max(0, Math.min(1, fraction));
  return f >= PERFECT_MIN && f <= PERFECT_MAX;
}

/** 评级 */
export function rankOf(quality: number): Rank {
  const q = Math.max(0, Math.min(100, quality));
  if (q < 40) return 'C';
  if (q < 60) return 'B';
  if (q < 75) return 'A';
  if (q < 90) return 'S';
  if (q < 98) return 'PERFECT';
  return 'LEGEND';
}

export function rankAtLeast(a: Rank, b: Rank): boolean {
  return RANK_ORDER.indexOf(a) >= RANK_ORDER.indexOf(b);
}

/** Combo 加成（阶梯表，规格 §11） */
export function comboFactor(combo: number): number {
  const c = Math.max(0, combo);
  if (c >= 20) return 1.5;
  if (c >= 10) return 1.35;
  if (c >= 5) return 1.2;
  if (c >= 3) return 1.1;
  if (c >= 2) return 1.05;
  return 1;
}

/** A 及以上连击 +1，低于 A 清零 */
export function nextCombo(combo: number, rank: Rank): number {
  return rankAtLeast(rank, 'A') ? combo + 1 : 0;
}

/** 最终质量 = 加权和 × 蓄力修正，0~100 */
export function finalQuality(qualityRaw: number, chargeFraction: number): number {
  const q = qualityRaw * chargeFactor(chargeFraction);
  return Math.max(0, Math.min(100, Math.round(q * 10) / 10));
}

/** 单圈得分 = 1000 × 质量% × Combo × 难度 */
export function runScore(quality: number, combo: number, difficultyFactor = 1): number {
  const cf = Math.min(COMBO_CAP, comboFactor(combo));
  return Math.round((BASE_SCORE * Math.max(0, quality)) / 100 * cf * difficultyFactor);
}

/** 单局结果（规格 §38） */
export interface RunResult {
  charge: number;
  inhalePerfect: boolean;
  closure: number;
  roundness: number;
  smoothness: number;
  sizeScore: number;
  sizeRel: number;
  timeScore: number;
  /** 最终质量 0~100（已乘蓄力修正） */
  quality: number;
  rank: Rank;
  score: number;
  combo: number;
  drawDurationMs: number;
  ringCenterX: number;
  ringCenterY: number;
  ringRadius: number;
  closed: boolean;
}

/** 由轨迹报告 + 蓄力 + Combo 组装单局结果 */
export function buildRunResult(
  trace: TraceReport,
  chargeFraction: number,
  comboBefore: number,
  difficultyFactor = 1,
): RunResult {
  const quality = trace.valid ? finalQuality(trace.qualityRaw, chargeFraction) : 0;
  const rank = rankOf(quality);
  const combo = nextCombo(comboBefore, rank);
  return {
    charge: chargeFraction,
    inhalePerfect: isPerfectInhale(chargeFraction),
    closure: trace.closure,
    roundness: trace.roundness,
    smoothness: trace.smoothness,
    sizeScore: trace.sizeScore,
    sizeRel: trace.sizeRel,
    timeScore: trace.timeScore,
    quality,
    rank,
    score: trace.valid ? runScore(quality, combo, difficultyFactor) : 0,
    combo,
    drawDurationMs: trace.durationMs,
    ringCenterX: trace.centerX,
    ringCenterY: trace.centerY,
    ringRadius: trace.diameter / 2,
    closed: trace.valid && trace.closure >= 0.5,
  };
}
