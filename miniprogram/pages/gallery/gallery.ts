// pages/gallery/gallery.ts —— 烟款图鉴：购买、装备 + 烟蒂合成抽奖
import { GACHA, CIGARETTES, getCig, rollGacha } from '../../data/game';
import { currentTrialId, trialById } from '../../utils/trial';
import { persist } from '../../utils/save';
import { playSound } from '../../utils/sound';

const app = getApp<IAppOption>();

interface CigRow {
  id: string;
  name: string;
  price: number;
  mult: number;
  desc: string;
  dot: string;
  owned: boolean;
  equipped: boolean;
  afford: boolean;
}

Page({
  data: {
    list: [] as CigRow[],
    nicotine: 0,
    butts: 0,
    cost: GACHA.costButts,
    gachaRolling: false,
    oddsText: GACHA.tiers
      .map((t) => `${Math.round(t.p * 100)}% ${t.name}(${t.min}-${t.max})`)
      .join(' · '),
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const g = app.globalData;
    this.setData({
      nicotine: g.nicotine,
      butts: g.butts,
      list: CIGARETTES.map((c) => ({
        id: c.id,
        name: c.name,
        price: c.price,
        mult: c.mult,
        desc: c.desc,
        dot: c.colors[0],
        owned: g.ownedCigarettes.indexOf(c.id) >= 0,
        equipped: g.currentCigarette === c.id,
        afford: g.nicotine >= c.price,
      })),
    });
  },

  onTapCig(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id as string;
    const g = app.globalData;
    if (g.currentCigarette === id) return;
    const cig = getCig(id);

    // 已拥有：直接装备
    if (g.ownedCigarettes.indexOf(id) >= 0) {
      g.currentCigarette = id;
      persist(g);
      wx.showToast({ title: `已装备「${cig.name}」`, icon: 'none' });
      this.refresh();
      return;
    }

    // 未拥有：检查余额后购买
    if (g.nicotine < cig.price) {
      wx.vibrateShort({ type: 'heavy' });
      wx.showToast({ title: '尼古丁不足', icon: 'none' });
      return;
    }
    g.nicotine -= cig.price;
    g.ownedCigarettes.push(id);
    g.currentCigarette = id;
    // 收藏家试炼：集齐 3 款烟
    if (g.ownedCigarettes.length >= 3 && currentTrialId(g.trialDone) === 'collector') {
      g.trialDone.push('collector');
      const reward = trialById('collector')?.reward || 0;
      g.nicotine += reward;
      playSound('reward', g.soundOn);
      wx.showToast({ title: `🎯 试炼「收藏家」完成 +${reward} 尼古丁`, icon: 'none', duration: 2200 });
    }
    persist(g);
    playSound('reward', g.soundOn);
    wx.showToast({ title: `已购买并装备「${cig.name}」`, icon: 'none' });
    this.refresh();
  },

  /** 烟蒂合成抽奖：10 烟蒂/次，概率已在页面公示；带开箱悬念 */
  onGacha() {
    const g = app.globalData;
    if (this.data.gachaRolling) return;
    if (g.butts < GACHA.costButts) {
      wx.showToast({ title: `烟蒂不足（需要 ${GACHA.costButts}）`, icon: 'none' });
      return;
    }
    this.setData({ gachaRolling: true });
    // 悬念停顿后开箱
    setTimeout(() => {
      g.butts -= GACHA.costButts;
      g.gachaCount += 1;
      const result = rollGacha(Math.random(), Math.random());
      g.nicotine += result.amount;
      persist(g);
      playSound('reward', g.soundOn);
      wx.vibrateShort({ type: 'medium' });
      this.setData({ gachaRolling: false });
      wx.showToast({
        title: `抽中「${result.tier.name}」+${result.amount} 尼古丁`,
        icon: 'none',
        duration: 2200,
      });
      this.refresh();
    }, 700) as unknown as number;
  },
});
