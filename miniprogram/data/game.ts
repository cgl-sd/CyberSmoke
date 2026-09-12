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
  ashBoost: boolean;
}

export const SKILLS: SkillDef[] = [
  { id: 'fast_light', name: '点烟手法', milestone: 5, desc: '划火柴速度大幅提升，即刻点燃赛博烟支' },
  { id: 'smoke_ring', name: '烟圈大师', milestone: 20, desc: '吐雾时吐出霓虹烟圈，单支尼古丁收益 +20%' },
  { id: 'deep_inhale', name: '深吸', milestone: 50, desc: '长按蓄力收益翻倍，单支尼古丁 ×2' },
  { id: 'neon_breath', name: '赛博吐纳', milestone: 100, desc: '解锁霓虹全彩烟雾皮肤' },
  { id: 'second_hand', name: '二手烟领域', milestone: 300, desc: '全屏赛博雾气氛围常驻' },
  { id: 'ash_lung', name: '电子肺 v2', milestone: 1000, desc: '烟灰炉产出 ×2，离线也不停歇' },
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
    ashBoost: count >= 1000,
  };
}

/** 根据累计支数计算当前称号；达成「清醒者」后永久覆盖 */
export function getTitle(count: number, soberAchieved = false): string {
  if (soberAchieved) return '清醒者';
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

// ============ 焦油系统 ============

/** 焦油警戒线，达到即触发「咳嗽」 */
export const TAR_THRESHOLD = 100;
/** 焦油上限 */
export const TAR_MAX = 150;
/** 咳嗽持续时长（毫秒），期间收益减半 */
export const COUGH_MS = 60000;
/** 薄荷糖价格：清零焦油并终止咳嗽 */
export const MINT_COST = 50;

/** 单支烟产生的焦油（蓄力越深焦油越高）：2~6 */
export function tarGain(charge: number): number {
  const c = Math.max(0, Math.min(1, charge));
  return 2 + Math.round(4 * c);
}

// ============ 烟蒂合成抽奖（概率已公示） ============

export interface GachaTier {
  /** 概率权重（合计为 1，需在 UI 公示） */
  p: number;
  name: string;
  min: number;
  max: number;
}

export const GACHA = {
  /** 每次抽奖消耗烟蒂 */
  costButts: 10,
  tiers: [
    { p: 0.6, name: '小包尼古丁', min: 30, max: 80 },
    { p: 0.3, name: '中包尼古丁', min: 80, max: 160 },
    { p: 0.1, name: '大奖尼古丁', min: 300, max: 600 },
  ] as GachaTier[],
};

/** 抽奖：r1 决定档位，r2 决定档位内数量（注入随机数便于测试） */
export function rollGacha(r1: number, r2: number): { tier: GachaTier; amount: number } {
  const x1 = Math.max(0, Math.min(1, r1));
  const x2 = Math.max(0, Math.min(1, r2));
  let acc = 0;
  for (const tier of GACHA.tiers) {
    acc += tier.p;
    if (x1 < acc) {
      const amount = tier.min + Math.floor(x2 * (tier.max - tier.min + 1));
      return { tier, amount: Math.min(tier.max, amount) };
    }
  }
  const last = GACHA.tiers[GACHA.tiers.length - 1];
  return { tier: last, amount: last.max };
}

// ============ 烟灰炉（放置收益） ============

export const ASH = {
  /** 每根点燃的烟燃烧时长 */
  BURN_MS: 10 * 60 * 1000,
  /** 每根烟烧尽产出的烟灰（线性产出） */
  PER_CIG: 20,
  /** 兑换比例：N 烟灰 = 1 尼古丁 */
  NIC_PER_ASH: 2,
  /** 烟灰炉同时最多燃烧的烟（取最近抽的 N 支） */
  MAX_SLOTS: 5,
};

export interface BurnSlot {
  /** 开始燃烧的时间戳 */
  t: number;
  /** 已收取的烟灰 */
  c: number;
}

/**
 * 计算烟灰炉当前可收的烟灰，并返回更新后的燃烧槽
 * （把可收部分记入 c，烧尽且收完的槽被剔除）
 */
export function computeAsh(
  slots: BurnSlot[],
  now: number,
  boosted: boolean,
): { avail: number; slots: BurnSlot[] } {
  const totalMax = ASH.PER_CIG * (boosted ? 2 : 1);
  let avail = 0;
  const out: BurnSlot[] = [];
  for (const s of slots) {
    const elapsed = Math.max(0, now - s.t);
    const total = totalMax * Math.min(1, elapsed / ASH.BURN_MS);
    const a = Math.max(0, total - s.c);
    avail += a;
    out.push({ t: s.t, c: s.c + a });
  }
  return {
    avail,
    slots: out.filter((s) => now - s.t < ASH.BURN_MS || s.c < totalMax - 1e-9),
  };
}

// ============ 每日晨烟 ============

/** 每天第一支的收益倍率 */
export const MORNING_MULT = 2;

/** 本地日期字符串 YYYY-MM-DD */
export function todayStr(d = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** 两个本地日期相差的天数（b - a） */
export function daysBetween(a: string, b: string): number {
  const ta = new Date(`${a}T00:00:00`).getTime();
  const tb = new Date(`${b}T00:00:00`).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Infinity;
  return Math.round((tb - ta) / 86400000);
}

/**
 * 结算一支烟时的晨烟判定：
 * 同日再抽 → 无加成；间隔恰好 1 天 → 连击 +1；断签 → 连击归 1
 */
export function nextStreak(
  lastSmokeDay: string,
  today: string,
  streak: number,
): { streak: number; morningMult: number } {
  if (lastSmokeDay === today) {
    return { streak: Math.max(1, streak), morningMult: 1 };
  }
  const consecutive = lastSmokeDay !== '' && daysBetween(lastSmokeDay, today) === 1;
  return { streak: consecutive ? streak + 1 : 1, morningMult: MORNING_MULT };
}

// ============ 戒烟挑战（清醒者结局） ============

/** 解锁戒烟挑战所需累计支数 */
export const QUIT_UNLOCK = 500;
/** 挑战持续天数：期间一支不抽 */
export const QUIT_DAYS = 7;
