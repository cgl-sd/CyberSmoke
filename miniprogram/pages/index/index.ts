// pages/index/index.ts —— 首页（抽烟主界面占位）
const app = getApp<IAppOption>();

Page({
  data: {
    cigaretteCount: 0,
    nicotine: 0,
  },

  onLoad() {
    this.refreshStats();
  },

  onShow() {
    this.refreshStats();
  },

  refreshStats() {
    this.setData({
      cigaretteCount: app.globalData.cigaretteCount,
      nicotine: app.globalData.nicotine,
    });
  },

  onLightUp() {
    // MVP：点火-吸入-吐雾 交互将在后续版本实现
    wx.showToast({ title: '抽烟交互开发中', icon: 'none' });
  },
});
