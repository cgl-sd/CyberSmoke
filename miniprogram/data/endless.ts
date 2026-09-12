// data/endless.ts —— 无限吐雾模式（纯函数，规格 §21-§23）
// 难度每 5 轮 +1；3 颗心；里程碑奖励
import { Goal } from './levels';

export const ENDLESS_HEARTS = 3;
export const ENDLESS_UNLOCK_LEVEL = 5;

/** 难度：每 5 轮 +1 */
export function endlessDifficulty(round: number): number {
  return 1 + Math.floor((Math.max(1, round) - 1) / 5);
}

/** 难度得分系数 */
export function endlessDifficultyFactor(round: number): number {
  return 1 + (endlessDifficulty(round) - 1) * 0.1;
}

const TIER_GOALS: Goal[][] = [
  // 难度 1：入门
  [
    { type: 'rank', value: 1, desc: '拿到 C 及以上评级' },
    { type: 'rank', value: 2, desc: '拿到 B 及以上评级' },
    { type: 'closure', value: 50, desc: '闭合度 ≥50%' },
  ],
  // 难度 2
  [
    { type: 'rank', value: 2, desc: '拿到 B 及以上评级' },
    { type: 'roundness', value: 60, desc: '圆度 ≥60%' },
    { type: 'perfectInhale', value: undefined, desc: '蓄力命中 Perfect 区间' },
  ],
  // 难度 3
  [
    { type: 'rank', value: 3, desc: '拿到 A 及以上评级' },
    { type: 'roundness', value: 70, desc: '圆度 ≥70%' },
    { type: 'size', value: 80, desc: '尺寸分 ≥80' },
  ],
  // 难度 4
  [
    { type: 'rank', value: 4, desc: '拿到 S 及以上评级' },
    { type: 'combo', value: 3, desc: 'Combo 达到 3' },
    { type: 'roundness', value: 80, desc: '圆度 ≥80%' },
  ],
  // 难度 5+
  [
    { type: 'rank', value: 5, desc: '拿到 PERFECT 评级' },
    { type: 'combo', value: 4, desc: 'Combo 达到 4' },
    { type: 'roundness', value: 85, desc: '圆度 ≥85%' },
    { type: 'score', value: 700, desc: '单局得分 ≥700' },
  ],
];

/** 生成某一轮的目标（确定性，便于测试） */
export function roundGoal(round: number): Goal {
  const r = Math.max(1, round);
  const tier = Math.min(TIER_GOALS.length - 1, endlessDifficulty(r) - 1);
  const list = TIER_GOALS[tier];
  return list[(r - 1) % list.length];
}

/** 里程碑奖励：完成该轮时一次性发放 */
export function milestoneReward(round: number): number {
  if (round === 5) return 80;
  if (round === 10) return 150;
  if (round === 20) return 300;
  if (round === 30) return 500;
  if (round === 50) return 800;
  return 0;
}

/** 完成一轮的 XP */
export function roundXp(round: number): number {
  return 6 + endlessDifficulty(round);
}
