// data/game.ts —— 玩法数值与静态配置（纯数据，不依赖 wx，可在 tmp 下单独跑测试）

/** 单支烟基础尼古丁产出 */
export const BASE_EARN = 10;

/** 蓄力上限（毫秒），长按达到该时长即 100% 蓄力 */
export const MAX_CHARGE_MS = 3000;

export interface SkillDef {
  id: string;
  name: string;
  /** 解锁所需累计抽烟支数 */
  milestone: number;
  desc: string;
}

export interface TitleDef {
  min: number;
  name: string;
}

export interface CigDef {
  id: string;
  name: string;
  /** 购买价格（尼古丁），0 为默认拥有 */
  price: number;
  /** 尼古丁产出倍率 */
  mult: number;
  desc: string;
  /** 粒子配色 */
  colors: string[];
}

export interface SkillState {
  fastLight: boolean;
  smokeRing: boolean;
  deepInhale: boolean;
  neonBreath: boolean;
  secondHand: boolean;
}

export const SKILLS: SkillDef[] = [
  { id: 'fast_light', name: '点烟手法', milestone: 5, desc: '划火柴速度大幅提升，即刻点燃赛博烟支' },
  { id: 'smoke_ring', name: '烟圈大师', milestone: 20, desc: '吐雾时吐出霓虹烟圈，单支尼古丁收益 +20%' },
  { id: 'deep_inhale', name: '深吸', milestone: 50, desc: '长按蓄力收益翻倍，单支尼古丁 ×2' },
  { id: 'neon_breath', name: '赛博吐纳', milestone: 100, desc: '解锁霓虹全彩烟雾皮肤' },
  { id: 'second_hand', name: '二手烟领域', milestone: 300, desc: '全屏赛博雾气氛围常驻' },
];

export const TITLES: TitleDef[] = [
  { min: 0, name: '新手指间夹烟' },
  { min: 10, name: '赛博见习烟民' },
  { min: 50, name: '霓虹吞吐者' },
  { min: 100, name: '电子肺拥有者' },
  { min: 300, name: '雾都领域主' },
  { min: 1000, name: '赛博老烟枪' },
];

export const CIGARETTES: CigDef[] = [
  {
    id: 'slim',
    name: '细支数据流',
    price: 0,
    mult: 1,
    desc: '默认烟款。青色数据流粒子，吞吐顺滑',
    colors: ['#00ffd5', '#38bdf8', '#7dd3fc'],
  },
  {
    id: 'cigar',
    name: '赛博雪茄',
    price: 300,
    mult: 1.5,
    desc: '浓烈缓慢的洋红烟雾，收益 ×1.5',
    colors: ['#ff2e88', '#c084fc', '#f472b6'],
  },
  {
    id: 'vape',
    name: '电子雾化棒 v2',
    price: 800,
    mult: 2,
    desc: '全彩霓虹雾化，收益 ×2',
    colors: ['#00ffd5', '#ff2e88', '#a78bfa', '#38bdf8'],
  },
];

/** 根据累计支数计算技能解锁状态 */
export function getSkillState(count: number): SkillState {
  return {
    fastLight: count >= 5,
    smokeRing: count >= 20,
    deepInhale: count >= 50,
    neonBreath: count >= 100,
    secondHand: count >= 300,
  };
}

/** 根据累计支数计算当前称号 */
export function getTitle(count: number): string {
  let name = TITLES[0].name;
  for (const t of TITLES) {
    if (count >= t.min) name = t.name;
  }
  return name;
}

/**
 * 单支烟尼古丁产出：
 * 基础 × 烟款倍率 × 蓄力系数(0.6~2.0) × 深吸(×2) × 烟圈(+20%)
 */
export function computeEarn(charge: number, cigMult: number, skills: SkillState): number {
  const clamped = Math.max(0, Math.min(1, charge));
  let earn = BASE_EARN * cigMult * (0.6 + 1.4 * clamped);
  if (skills.deepInhale) earn *= 2;
  if (skills.smokeRing) earn *= 1.2;
  return Math.round(earn);
}

/** 按 id 取烟款，未知道具回退默认款 */
export function getCig(id: string): CigDef {
  return CIGARETTES.find((c) => c.id === id) || CIGARETTES[0];
}
