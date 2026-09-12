// data/xp.ts —— 玩家等级与经验（纯函数，规格 §13）
export const ENDLESS_UNLOCK_LEVEL = 5;

export function xpNeeded(level: number): number {
  return 100 + level * 30;
}

export interface LevelUpResult {
  level: number;
  xp: number;
  levelsGained: number;
  rewardCurrency: number;
  unlockedEndless: boolean;
  messages: string[];
}

/** 追加经验并结算升级（可连升多级），升级奖励：货币 + Lv.5 解锁无限模式 */
export function applyXp(level: number, xp: number, gain: number): LevelUpResult {
  let lv = Math.max(1, level);
  let cur = Math.max(0, xp) + Math.max(0, gain);
  let levelsGained = 0;
  let rewardCurrency = 0;
  let unlockedEndless = false;
  const messages: string[] = [];
  while (cur >= xpNeeded(lv)) {
    cur -= xpNeeded(lv);
    lv += 1;
    levelsGained += 1;
    rewardCurrency += 20 + lv * 10;
    if (lv === ENDLESS_UNLOCK_LEVEL) unlockedEndless = true;
  }
  if (levelsGained > 0) {
    messages.push(`升级！Lv.${lv}`);
    if (unlockedEndless) messages.push('解锁无限吐雾');
  }
  return { level: lv, xp: cur, levelsGained, rewardCurrency, unlockedEndless, messages };
}

/** 单局经验：基础 + 质量分 + 评级加成 */
export function runXp(quality: number, rank: string, firstClear: boolean): number {
  let xp = 8 + Math.round(quality / 12);
  if (rank === 'A') xp += 2;
  else if (rank === 'S') xp += 4;
  else if (rank === 'PERFECT') xp += 8;
  else if (rank === 'LEGEND') xp += 12;
  if (firstClear) xp += 25;
  return xp;
}
