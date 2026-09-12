// data/levels.ts —— 主线关卡配置（纯数据 + 纯函数，规格 §17-§20、§36-§38）
// V1：第一章 20 个真实配置关卡；后续章节在此追加
import { Rank, rankAtLeast, RANK_ORDER, RunResult } from './scoring';

export type GoalType =
  | 'complete'
  | 'score'
  | 'rank'
  | 'roundness'
  | 'closure'
  | 'size'
  | 'combo'
  | 'perfectInhale'
  | 'time';

export interface Goal {
  type: GoalType;
  value?: number;
  desc: string;
}

export interface LevelDef {
  id: string;
  chapter: number;
  order: number;
  name: string;
  goals: Goal[];
  /** 二星分数线 */
  star2Score: number;
  /** 蓄力参数覆盖（Chapter 2 起可收紧 Perfect Zone） */
  perfectMin?: number;
  perfectMax?: number;
  maxChargeMs?: number;
  /** 绘制限时（毫秒） */
  timeLimitMs?: number;
  difficulty: number;
  /** 首通货币奖励 */
  reward: number;
}

const g = (type: GoalType, value: number | undefined, desc: string): Goal => ({ type, value, desc });

interface LevelSeed {
  order: number;
  name: string;
  main: Goal;
  extra: Goal[];
  star2: number;
  difficulty: number;
}

const CH1_SEEDS: LevelSeed[] = [
  { order: 1, name: '点燃', main: g('complete', undefined, '完成一次完整吐雾'), extra: [], star2: 300, difficulty: 1 },
  { order: 2, name: '第一口', main: g('rank', 1, '拿到 C 及以上评级'), extra: [], star2: 320, difficulty: 1 },
  { order: 3, name: '收口', main: g('closure', 50, '闭合度 ≥50%'), extra: [], star2: 340, difficulty: 1 },
  { order: 4, name: '正圆', main: g('roundness', 50, '圆度 ≥50%'), extra: [], star2: 360, difficulty: 1 },
  { order: 5, name: '深呼吸', main: g('perfectInhale', undefined, '蓄力命中 Perfect 区间'), extra: [], star2: 380, difficulty: 1 },
  { order: 6, name: '像样的圈', main: g('rank', 2, '拿到 B 及以上评级'), extra: [], star2: 420, difficulty: 1 },
  { order: 7, name: '尺度', main: g('size', 80, '尺寸分 ≥80'), extra: [], star2: 440, difficulty: 2 },
  { order: 8, name: '连击起步', main: g('combo', 2, 'Combo 达到 2'), extra: [], star2: 460, difficulty: 2 },
  { order: 9, name: '高分初现', main: g('score', 450, '单局得分 ≥450'), extra: [], star2: 480, difficulty: 2 },
  { order: 10, name: '章节试炼', main: g('roundness', 60, '圆度 ≥60%'), extra: [g('closure', 55, '闭合度 ≥55%')], star2: 520, difficulty: 2 },
  { order: 11, name: '严丝合缝', main: g('closure', 65, '闭合度 ≥65%'), extra: [], star2: 540, difficulty: 2 },
  { order: 12, name: '气息掌控', main: g('perfectInhale', undefined, '蓄力命中 Perfect 区间'), extra: [g('rank', 2, '拿到 B 及以上评级')], star2: 560, difficulty: 2 },
  { order: 13, name: '三连', main: g('combo', 3, 'Combo 达到 3'), extra: [], star2: 580, difficulty: 3 },
  { order: 14, name: '工笔圆', main: g('roundness', 70, '圆度 ≥70%'), extra: [], star2: 600, difficulty: 3 },
  { order: 15, name: '高分圈', main: g('score', 550, '单局得分 ≥550'), extra: [], star2: 620, difficulty: 3 },
  { order: 16, name: 'A级手法', main: g('rank', 3, '拿到 A 及以上评级'), extra: [], star2: 660, difficulty: 3 },
  { order: 17, name: '无缝', main: g('closure', 75, '闭合度 ≥75%'), extra: [], star2: 680, difficulty: 3 },
  { order: 18, name: '沉稳', main: g('perfectInhale', undefined, '蓄力命中 Perfect 区间'), extra: [g('roundness', 65, '圆度 ≥65%')], star2: 720, difficulty: 4 },
  { order: 19, name: 'S 的门槛', main: g('rank', 4, '拿到 S 及以上评级'), extra: [], star2: 780, difficulty: 4 },
  { order: 20, name: '第一章·结业', main: g('score', 650, '单局得分 ≥650'), extra: [g('roundness', 75, '圆度 ≥75%')], star2: 820, difficulty: 4 },
];

function buildChapter(chapter: number, seeds: LevelSeed[]): LevelDef[] {
  return seeds.map((s) => ({
    id: `${chapter}-${`${s.order}`.padStart(2, '0')}`,
    chapter,
    order: s.order,
    name: s.name,
    goals: [s.main, ...s.extra],
    star2Score: s.star2,
    difficulty: s.difficulty,
    reward: 30 + s.order * 5,
  }));
}

export const LEVELS: LevelDef[] = [...buildChapter(1, CH1_SEEDS)];

export function levelById(id: string): LevelDef | null {
  return LEVELS.find((l) => l.id === id) || null;
}

export function nextLevelId(id: string): string | null {
  const idx = LEVELS.findIndex((l) => l.id === id);
  if (idx < 0 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1].id;
}

export interface LevelProgress {
  stars: number;
  bestScore: number;
}

/** 关卡是否解锁：第 1 关恒开放，其余需上一关 ≥1 星 */
export function isLevelUnlocked(id: string, completed: Record<string, LevelProgress>): boolean {
  const idx = LEVELS.findIndex((l) => l.id === id);
  if (idx <= 0) return idx === 0;
  const prev = LEVELS[idx - 1];
  return (completed[prev.id]?.stars || 0) >= 1;
}

export function rankMeets(runRank: Rank, needValue: number): boolean {
  const need = RANK_ORDER[Math.min(RANK_ORDER.length - 1, Math.max(0, needValue))] as Rank;
  return rankAtLeast(runRank, need);
}

/** 单个目标是否达成 */
export function goalPassed(goal: Goal, run: RunResult): boolean {
  switch (goal.type) {
    case 'complete':
      return true;
    case 'score':
      return run.score >= (goal.value || 0);
    case 'rank':
      return rankMeets(run.rank, goal.value || 0);
    case 'roundness':
      return run.roundness * 100 >= (goal.value || 0);
    case 'closure':
      return run.closure * 100 >= (goal.value || 0);
    case 'size':
      return run.sizeScore * 100 >= (goal.value || 0);
    case 'combo':
      return run.combo >= (goal.value || 0);
    case 'perfectInhale':
      return run.inhalePerfect;
    case 'time':
      return run.drawDurationMs <= (goal.value || 0);
    default:
      return false;
  }
}

/** 星级：1★ 主目标；2★ 分数线；3★ 全部目标（规格 §19） */
export function starsFor(level: LevelDef, run: RunResult): number {
  const results = level.goals.map((goal) => goalPassed(goal, run));
  if (!results[0]) return 0;
  let stars = 1;
  if (run.score >= level.star2Score) stars += 1;
  if (results.every(Boolean)) stars += 1;
  return stars;
}

export interface ChapterProgress {
  done: number;
  total: number;
  ratio: number;
}

export function chapterProgress(chapter: number, completed: Record<string, LevelProgress>): ChapterProgress {
  const list = LEVELS.filter((l) => l.chapter === chapter);
  const done = list.filter((l) => (completed[l.id]?.stars || 0) >= 1).length;
  const total = list.length;
  return { done, total, ratio: total > 0 ? done / total : 0 };
}

/** 章节解锁：上一章完成 ≥70%（规格 §20） */
export function isChapterUnlocked(chapter: number, completed: Record<string, LevelProgress>): boolean {
  if (chapter <= 1) return true;
  return chapterProgress(chapter - 1, completed).ratio >= 0.7;
}

/** 单局难度系数：影响得分 */
export function difficultyFactor(level: LevelDef): number {
  return 1 + (level.difficulty - 1) * 0.05;
}
