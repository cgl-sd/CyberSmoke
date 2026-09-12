// pages/index/index.ts —— 抽烟主界面：点火 → 长按吸入 → 松手吐雾
import { SmokeCanvas } from '../../utils/particles';
import {
  MAX_CHARGE_MS,
  SKILLS,
  computeEarn,
  getCig,
  getSkillState,
  getTitle,
} from '../../data/game';
import { persist } from '../../utils/save';

const app = getApp<IAppOption>();

type Phase = 'idle' | 'igniting' | 'lit' | 'inhaling';

const HINTS: Record<Phase, string> = {
  idle: '点击下方按钮点燃一支烟',
  igniting: '划火柴中…',
  lit: '长按屏幕任意处吸入',
  inhaling: '正在吸入，松手吐雾',
};

Page({
  data: {
    phase: 'idle' as Phase,
    cigaretteCount: 0,
    nicotine: 0,
    titleName: getTitle(0),
    chargePercent: 0,
    hintText: HINTS.idle,
    lightBtnText: '点 火',
    currentCigName: '',
    currentCigMult: 1,
  },

  smoke: null as SmokeCanvas | null,
  ignitingTimer: 0 as number,
  chargeTimer: 0 as number,
  inhaleStart: 0,

  onLoad() {
    this.refreshFromGlobal();
  },

  onReady() {
    const query = wx.createSelectorQuery();
    query
      .select('#smokeCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const item: any = res && res[0];
        if (!item || !item.node) return;
        const win = wx.getWindowInfo();
        this.smoke = new SmokeCanvas();
        this.smoke.init(item.node, item.width || win.windowWidth, item.height || win.windowHeight);
        this.applySmokeStyle();
      });
  },

  onShow() {
    this.refreshFromGlobal();
    this.applySmokeStyle();
  },

  onHide() {
    persist(app.globalData);
  },

  onUnload() {
    if (this.ignitingTimer) clearTimeout(this.ignitingTimer);
    if (this.chargeTimer) clearInterval(this.chargeTimer);
    persist(app.globalData);
    if (this.smoke) this.smoke.stop();
  },

  /** 把当前烟款配色 / 技能特效应用到粒子系统 */
  applySmokeStyle() {
    if (!this.smoke) return;
    const g = app.globalData;
    const skills = getSkillState(g.cigaretteCount);
    const cig = getCig(g.currentCigarette);
    this.smoke.setColors(skills.neonBreath ? cig.colors.concat(['#a78bfa', '#22d3ee']) : cig.colors);
    this.smoke.setAmbient(skills.secondHand);
  },

  refreshFromGlobal() {
    const g = app.globalData;
    const cig = getCig(g.currentCigarette);
    this.setData({
      cigaretteCount: g.cigaretteCount,
      nicotine: g.nicotine,
      titleName: getTitle(g.cigaretteCount),
      currentCigName: cig.name,
      currentCigMult: cig.mult,
    });
  },

  onLightUp() {
    if (this.data.phase !== 'idle') return;
    const skills = getSkillState(app.globalData.cigaretteCount);
    const delay = skills.fastLight ? 150 : 700;
    wx.vibrateShort({ type: 'light' });
    this.setData({ phase: 'igniting', hintText: HINTS.igniting, lightBtnText: '…' });
    this.ignitingTimer = setTimeout(() => {
      wx.vibrateShort({ type: 'medium' });
      this.setData({ phase: 'lit', hintText: HINTS.lit });
    }, delay) as unknown as number;
  },

  onTouchStart() {
    if (this.data.phase !== 'lit') return;
    this.inhaleStart = Date.now();
    this.setData({ phase: 'inhaling', hintText: HINTS.inhaling });
    wx.vibrateShort({ type: 'light' });
    this.chargeTimer = setInterval(() => {
      const percent = Math.min(100, Math.round(((Date.now() - this.inhaleStart) / MAX_CHARGE_MS) * 100));
      if (percent !== this.data.chargePercent) this.setData({ chargePercent: percent });
    }, 100) as unknown as number;
  },

  onTouchEnd() {
    if (this.data.phase !== 'inhaling') return;
    if (this.chargeTimer) {
      clearInterval(this.chargeTimer);
      this.chargeTimer = 0;
    }
    const charge = Math.min(1, (Date.now() - this.inhaleStart) / MAX_CHARGE_MS);

    const g = app.globalData;
    const before = g.cigaretteCount;
    const skills = getSkillState(before);
    const cig = getCig(g.currentCigarette);
    const earn = computeEarn(charge, cig.mult, skills);

    g.nicotine += earn;
    g.cigaretteCount = before + 1;
    const after = g.cigaretteCount;

    // 吐雾粒子（烟头位置 ≈ 屏幕中部）
    if (this.smoke) {
      const win = wx.getWindowInfo();
      this.smoke.emitDrag(win.windowWidth * 0.5, win.windowHeight * 0.55, charge, skills.smokeRing);
    }

    // 里程碑：技能解锁 / 称号晋升
    const unlocked = SKILLS.filter((s) => s.milestone > before && s.milestone <= after);
    const titleBefore = getTitle(before);
    const titleAfter = getTitle(after);
    const messages: string[] = [];
    for (const s of unlocked) messages.push(`解锁技能「${s.name}」`);
    if (titleAfter !== titleBefore) messages.push(`称号晋升「${titleAfter}」`);

    persist(g);
    this.applySmokeStyle();
    this.setData({
      phase: 'idle',
      chargePercent: 0,
      hintText: `吐雾完成，尼古丁 +${earn}`,
      lightBtnText: '再点一支',
      cigaretteCount: after,
      nicotine: g.nicotine,
      titleName: titleAfter,
    });

    if (messages.length) {
      wx.vibrateShort({ type: 'heavy' });
      wx.showToast({ title: messages.join('，'), icon: 'none', duration: 2000 });
    }
  },
});
