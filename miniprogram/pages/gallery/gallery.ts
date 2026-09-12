// pages/gallery/gallery.ts —— 烟款图鉴：购买与装备
import { CIGARETTES, getCig } from '../../data/game';
import { persist } from '../../utils/save';

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
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const g = app.globalData;
    this.setData({
      nicotine: g.nicotine,
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
    persist(g);
    wx.showToast({ title: `已购买并装备「${cig.name}」`, icon: 'none' });
    this.refresh();
  },
});
