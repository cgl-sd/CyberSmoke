// app.ts —— 小程序入口
App<IAppOption>({
  globalData: {
    nicotine: 0,
    cigaretteCount: 0,
  },

  onLaunch() {
    // 读取本地存档（后续版本接入完整存档系统）
    const saved = wx.getStorageSync<{
      nicotine?: number;
      cigaretteCount?: number;
    }>('cybersmoke_save');

    if (typeof saved.nicotine === 'number') {
      this.globalData.nicotine = saved.nicotine;
    }
    if (typeof saved.cigaretteCount === 'number') {
      this.globalData.cigaretteCount = saved.cigaretteCount;
    }
  },
});
