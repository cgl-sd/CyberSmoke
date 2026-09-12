// data/collections.ts —— 烟圈图鉴与成就（纯数据 + 纯函数，规格 §26、§27）
import { RunResult, Rank, rankAtLeast } from './scoring';

export interface RingCollectible {
  id: string;
  name: string;
  rarity: 'N' | 'R' | 'SR' | 'UR';
  desc: string;
  check: (run: RunResult) => boolean;
}

/** 烟圈形态图鉴：条件 + 表现实现（规格 §12.3、§26.1） */
export const RING_COLLECTIONS: RingCollectible[] = [
  {
    id: 'basic',
    name: 'Basic Ring',
    rarity: 'N',
    desc: '完成一个闭合烟圈（闭合度 ≥50%）',
    check: (r) => r.closed,
  },
  {
    id: 'thin',
    name: 'Thin Ring',
    rarity: 'N',
    desc: '画出小烟圈（直径 < 屏宽 25%）',
    check: (r) => r.closed && r.sizeRel < 0.25,
  },
  {
    id: 'giant',
    name: 'Giant Ring',
    rarity: 'R',
    desc: '画出巨大烟圈（直径 > 屏宽 65%）',
    check: (r) => r.closed && r.sizeRel > 0.65,
  },
  {
    id: 'swift',
    name: 'Swift Ring',
    rarity: 'R',
    desc: '1.5 秒内完成且质量 ≥70 的烟圈',
    check: (r) => r.closed && r.drawDurationMs <= 1500 && r.quality >= 70,
  },
  {
    id: 'ghost',
    name: 'Ghost Ring',
    rarity: 'SR',
    desc: '圆度 ≥90% 且流畅度 ≥95% 的幽灵环',
    check: (r) => r.closed && r.roundness >= 0.9 && r.smoothness >= 0.95,
  },
  {
    id: 'eclipse',
    name: 'Eclipse Ring',
    rarity: 'SR',
    desc: 'Perfect 蓄力 + S 及以上评级',
    check: (r) => r.inhalePerfect && rankAtLeast(r.rank, 'S' as Rank),
  },
  {
    id: 'halo',
    name: 'Perfect Halo',
    rarity: 'UR',
    desc: '单次质量 ≥90 的完美光环',
    check: (r) => r.quality >= 90,
  },
];

export interface CollectEntry {
  count: number;
  best: number;
}

/** 收集结算：返回首次解锁的 id 列表（纯函数） */
export function applyCollection(
  existing: Record<string, CollectEntry>,
  run: RunResult,
): { map: Record<string, CollectEntry>; firstUnlocked: RingCollectible[] } {
  const map: Record<string, CollectEntry> = { ...existing };
  const firstUnlocked: RingCollectible[] = [];
  for (const c of RING_COLLECTIONS) {
    if (!c.check(run)) continue;
    const prev = map[c.id];
    if (!prev) {
      map[c.id] = { count: 1, best: run.score };
      firstUnlocked.push(c);
    } else {
      map[c.id] = { count: prev.count + 1, best: Math.max(prev.best, run.score) };
    }
  }
  return { map, firstUnlocked };
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
}

/** 成就清单（达成状态由存档统计值推导） */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_breath', name: 'First Breath', desc: '完成第一局' },
  { id: 'first_perfect', name: 'Perfect', desc: '第一次拿到 PERFECT 评级' },
  { id: 'ten_rings', name: 'Ten Rings', desc: '累计 10 个烟圈' },
  { id: 'one_hundred', name: 'One Hundred', desc: '累计 100 局' },
  { id: 'machine', name: 'Machine', desc: 'Combo 达到 10' },
  { id: 'endless_10', name: 'Deep Diver', desc: '无限模式抵达 Round 10' },
];

export interface AchievementStats {
  totalGames: number;
  totalRings: number;
  perfectCount: number;
  bestCombo: number;
  bestEndlessRound: number;
}

/** 成就是否达成（纯函数） */
export function achievementDone(id: string, stats: AchievementStats): boolean {
  switch (id) {
    case 'first_breath':
      return stats.totalGames >= 1;
    case 'first_perfect':
      return stats.perfectCount >= 1;
    case 'ten_rings':
      return stats.totalRings >= 10;
    case 'one_hundred':
      return stats.totalGames >= 100;
    case 'machine':
      return stats.bestCombo >= 10;
    case 'endless_10':
      return stats.bestEndlessRound >= 10;
    default:
      return false;
  }
}
