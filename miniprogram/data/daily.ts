// data/daily.ts —— 每日任务（纯函数，规格 §24、AC-021/022）
// 同一自然日生成相同 3 个任务；跨日刷新
import { RunResult } from './scoring';

export type DailyMetric = 'games' | 'perfect' | 'aRank' | 'combo' | 'score' | 'rings';

export interface DailyTask {
  id: string;
  desc: string;
  target: number;
  progress: number;
  done: boolean;
  reward: number;
  metric: DailyMetric;
}

interface DailyTemplate {
  id: string;
  desc: string;
  target: number;
  reward: number;
  metric: DailyMetric;
}

const POOL: DailyTemplate[] = [
  { id: 'play_3', desc: '完成 3 局', target: 3, reward: 60, metric: 'games' },
  { id: 'perfect_1', desc: '拿到 1 次 PERFECT 及以上', target: 1, reward: 80, metric: 'perfect' },
  { id: 'a_rank_2', desc: '拿到 2 次 A 及以上', target: 2, reward: 70, metric: 'aRank' },
  { id: 'combo_3', desc: '单局 Combo 达到 3', target: 3, reward: 70, metric: 'combo' },
  { id: 'score_600', desc: '单局得分 ≥600', target: 600, reward: 70, metric: 'score' },
  { id: 'rings_5', desc: '累计 5 个闭合烟圈', target: 5, reward: 60, metric: 'rings' },
];

// mulberry32：确定性伪随机
function hashStr(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 按日期生成 3 个每日任务（同日同结果） */
export function genDaily(dateStr: string): DailyTask[] {
  const rand = mulberry32(hashStr(dateStr));
  const pool = POOL.slice();
  const picked: DailyTemplate[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length) % pool.length;
    picked.push(pool.splice(idx, 1)[0]);
  }
  return picked.map((t) => ({
    id: t.id,
    desc: t.desc,
    target: t.target,
    reward: t.reward,
    metric: t.metric,
    progress: 0,
    done: false,
  }));
}

/** 单局结果对每日任务的贡献（纯函数：返回新任务数组与本次新完成的奖励） */
export function applyRunToDaily(
  tasks: DailyTask[],
  run: RunResult,
): { tasks: DailyTask[]; newlyDone: DailyTask[] } {
  const runMetrics: Record<DailyMetric, number> = {
    games: 1,
    perfect: run.rank === 'PERFECT' || run.rank === 'LEGEND' ? 1 : 0,
    aRank: ['A', 'S', 'PERFECT', 'LEGEND'].indexOf(run.rank) >= 0 ? 1 : 0,
    combo: run.combo,
    score: run.score,
    rings: run.closed ? 1 : 0,
  };
  const newlyDone: DailyTask[] = [];
  const next = tasks.map((t) => {
    if (t.done) return t;
    const inc = runMetrics[t.metric] || 0;
    const progress = t.metric === 'combo' || t.metric === 'score'
      ? Math.max(t.progress, inc)
      : t.progress + inc;
    const done = progress >= t.target;
    const updated = { ...t, progress: Math.min(progress, t.target), done };
    if (done && !t.done) newlyDone.push(updated);
    return updated;
  });
  return { tasks: next, newlyDone };
}

/** 跨自然日刷新 */
export function needsRefresh(savedDate: string, today: string): boolean {
  return savedDate !== today;
}

export function dailyRewardTotal(tasks: DailyTask[]): number {
  return tasks.filter((t) => t.done).reduce((s, t) => s + t.reward, 0);
}
