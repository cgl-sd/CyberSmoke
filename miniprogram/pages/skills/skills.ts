// pages/skills/skills.ts —— 技能矩阵：里程碑解锁进度
import { SKILLS, getTitle } from '../../data/game';

const app = getApp<IAppOption>();

interface SkillRow {
  id: string;
  name: string;
  milestone: number;
  desc: string;
  unlocked: boolean;
  percent: number;
  remaining: number;
}

Page({
  data: {
    list: [] as SkillRow[],
    titleName: '',
    count: 0,
    streakDays: 0,
    // 烟民档案
    maxStreak: 0,
    ashCollected: 0,
    gachaCount: 0,
    ownedCount: 0,
    cigTotal: 3,
    sober: false,
  },

  onShow() {
    const g = app.globalData;
    const count = g.cigaretteCount;
    this.setData({
      titleName: getTitle(count, g.soberAchieved),
      count,
      streakDays: g.streakDays,
      maxStreak: g.maxStreak,
      ashCollected: Math.round(g.ashCollected),
      gachaCount: g.gachaCount,
      ownedCount: g.ownedCigarettes.length,
      sober: g.soberAchieved,
      list: SKILLS.map((s) => ({
        id: s.id,
        name: s.name,
        milestone: s.milestone,
        desc: s.desc,
        unlocked: count >= s.milestone,
        percent: Math.min(100, Math.round((count / s.milestone) * 100)),
        remaining: Math.max(0, s.milestone - count),
      })),
    });
  },
});
