// app.ts —— 小程序入口：读取本地存档到 globalData
import { loadSave } from './utils/save';

App<IAppOption>({
  globalData: {
    nicotine: 0,
    cigaretteCount: 0,
    ownedCigarettes: ['slim'],
    currentCigarette: 'slim',
  },

  onLaunch() {
    const saved = loadSave();
    if (saved) {
      this.globalData.nicotine = saved.nicotine;
      this.globalData.cigaretteCount = saved.cigaretteCount;
      this.globalData.ownedCigarettes = saved.ownedCigarettes;
      this.globalData.currentCigarette = saved.currentCigarette;
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
