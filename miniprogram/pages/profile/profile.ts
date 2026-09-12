// pages/profile/profile.ts —— 我的：等级 / 每日任务 / 成就 / 统计 / 设置
import { xpNeeded } from '../../data/xp';
import { ENDLESS_UNLOCK_LEVEL } from '../../data/endless';
import { ACHIEVEMENTS, achievementDone } from '../../data/collections';
import { loadPlayer, persistPlayer, todayStr, PlayerSave } from '../../utils/save';
import { genDaily, needsRefresh as needsDailyRefresh } from '../../data/daily';

Page({
  data: {
    level: 1,
    xpPercent: 0,
    xpText: '',
    currency: 0,
    stats: [
      { label: '总局数', value: 0 },
      { label: '烟圈数', value: 0 },
      { label: '最佳分', value: 0 },
      { label: '最高 Combo', value: 0 },
      { label: '最高 Round', value: 0 },
    ],
    dailyDate: '',
    dailyTasks: [] as Array<{ id: string; desc: string; progress: number; target: number; done: boolean; reward: number }>,
    achievements: [] as Array<{ id: string; name: string; desc: string; done: boolean }>,
    doneCount: 0,
    soundOn: true,
    endlessUnlockLevel: ENDLESS_UNLOCK_LEVEL,
  },

  onShow() {
    this.reload();
  },

  reload() {
    const today = todayStr();
    let player: PlayerSave = loadPlayer(today);
    // 跨自然日刷新每日任务（AC-022）
    if (needsDailyRefresh(player.daily.date, today)) {
      player.daily = { date: today, tasks: genDaily(today) };
      persistPlayer(player);
    }
    const need = xpNeeded(player.level);
    this.setData({
      level: player.level,
      xpPercent: Math.min(100, Math.round((player.xp / need) * 100)),
      xpText: `${player.xp} / ${need}`,
      currency: player.currency,
      stats: [
        { label: '总局数', value: player.totalGames },
        { label: '烟圈数', value: player.totalRings },
        { label: '最佳分', value: player.bestScore },
        { label: '最高 Combo', value: player.bestCombo },
        { label: '最高 Round', value: player.bestEndlessRound },
      ],
      dailyDate: player.daily.date,
      dailyTasks: player.daily.tasks.map((t) => ({
        id: t.id,
        desc: t.desc,
        progress: Math.min(t.progress, t.target),
        target: t.target,
        done: t.done,
        reward: t.reward,
      })),
      achievements: ACHIEVEMENTS.map((a) => ({
        id: a.id,
        name: a.name,
        desc: a.desc,
        done: achievementDone(a.id, player),
      })),
      doneCount: 0,
      soundOn: player.soundOn,
    });
    this.setData({
      doneCount: this.data.achievements.filter((a) => a.done).length,
    });
  },

  toggleSound() {
    const player = loadPlayer(todayStr());
    player.soundOn = !player.soundOn;
    persistPlayer(player);
    this.setData({ soundOn: player.soundOn });
  },
});
