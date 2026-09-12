// app.ts —— 小程序入口：读取本地存档到 globalData
import { loadSave } from './utils/save';

App<IAppOption>({
  globalData: {
    nicotine: 0,
    cigaretteCount: 0,
    ownedCigarettes: ['slim'],
    currentCigarette: 'slim',
    tar: 0,
    butts: 0,
    burnSlots: [],
    lastSmokeDay: '',
    streakDays: 0,
    quitActive: false,
    quitStartDay: '',
    soberAchieved: false,
    soundOn: true,
    maxStreak: 0,
    gachaCount: 0,
    ashCollected: 0,
    trialDone: [],
  },

  onLaunch() {
    const saved = loadSave();
    if (saved) {
      this.globalData.nicotine = saved.nicotine;
      this.globalData.cigaretteCount = saved.cigaretteCount;
      this.globalData.ownedCigarettes = saved.ownedCigarettes;
      this.globalData.currentCigarette = saved.currentCigarette;
      this.globalData.tar = saved.tar;
      this.globalData.butts = saved.butts;
      this.globalData.burnSlots = saved.burnSlots;
      this.globalData.lastSmokeDay = saved.lastSmokeDay;
      this.globalData.streakDays = saved.streakDays;
      this.globalData.quitActive = saved.quitActive;
      this.globalData.quitStartDay = saved.quitStartDay;
      this.globalData.soberAchieved = saved.soberAchieved;
      this.globalData.soundOn = saved.soundOn;
      this.globalData.maxStreak = saved.maxStreak;
      this.globalData.gachaCount = saved.gachaCount;
      this.globalData.ashCollected = saved.ashCollected;
      this.globalData.trialDone = saved.trialDone;
    }
    // 保证烟款状态合法
    if (this.globalData.ownedCigarettes.indexOf('slim') < 0) {
      this.globalData.ownedCigarettes.push('slim');
    }
    if (this.globalData.ownedCigarettes.indexOf(this.globalData.currentCigarette) < 0) {
      this.globalData.currentCigarette = 'slim';
    }
  },
});
