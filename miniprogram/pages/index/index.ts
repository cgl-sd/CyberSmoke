// pages/index/index.ts —— 抽烟主界面：点火 → 长按吸入（可画烟圈连击）→ 松手吐雾
import { SmokeCanvas } from '../../utils/particles';
import {
  ASH,
  BurnSlot,
  COUGH_MS,
  MINT_COST,
  MAX_CHARGE_MS,
  QUIT_DAYS,
  QUIT_UNLOCK,
  SKILLS,
  TAR_THRESHOLD,
  computeAsh,
  computeEarn,
  getCig,
  getSkillState,
  getTitle,
  nextStreak,
  ringFactor,
  tarGain,
  todayStr,
  daysBetween,
} from '../../data/game';
import { persist } from '../../utils/save';
import { playSound } from '../../utils/sound';
import { completedTrials, currentTrialId, trialById } from '../../utils/trial';

const app = getApp<IAppOption>();

type Phase = 'idle' | 'igniting' | 'lit' | 'inhaling';

const HINTS: Record<Phase, string> = {
  idle: '点击下方按钮点燃一支烟',
  igniting: '划火柴中…',
  lit: '长按屏幕吸入 · 画圈出烟圈',
  inhaling: '正在吸入，松手吐雾',
};

interface Pt {
  x: number;
  y: number;
}

Page({
  data: {
    phase: 'idle' as Phase,
    cigaretteCount: 0,
    nicotine: 0,
    titleName: getTitle(0),
    chargePercent: 0,
    ringCount: 0,
    hintText: HINTS.idle,
    lightBtnText: '点 火',
    currentCigName: '',
    currentCigMult: 1,
    // 状态区
    streakDays: 0,
    tar: 0,
    tarPercent: 0,
    coughing: false,
    butts: 0,
    ash: 0,
    burningCount: 0,
    // 戒烟挑战
    quitActive: false,
    quitDayNo: 0,
    quitUnlocked: false,
    sober: false,
    // 设置
    soundOn: true,
    // 试炼
    trialName: '',
    trialReward: 0,
  },

  smoke: null as SmokeCanvas | null,
  ignitingTimer: 0 as number,
  chargeTimer: 0 as number,
  coughTimer: 0 as number,
  ashTimer: 0 as number,
  inhaleStart: 0,
  igniteStartAt: 0,
  coughing: false,
  ashSlots: [] as BurnSlot[],
  // 烟圈手势
  ringPts: [] as Pt[],
  ringCount: 0,
  // 当前烟款粒子手感
  puffSize: 1,
  puffSpeed: 1,
  // 连抽计时（链式吞吐试炼）
  recentSettles: [] as number[],

  onLoad() {
    this.refreshFromGlobal();
    this.refreshTrialChip();
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
    this.refreshAsh();
    this.refreshQuit();
    this.refreshTrialChip();
    this.applySmokeStyle();
    if (this.smoke) this.smoke.start();
    if (!this.ashTimer) {
      this.ashTimer = setInterval(() => this.refreshAsh(), 15000) as unknown as number;
    }
    // 试炼的离线判定（连击/戒烟结局）在回前台时补检
    this.runTrialChecks(['streak_3', 'sober']);
  },

  onHide() {
    if (this.ashTimer) {
      clearInterval(this.ashTimer);
      this.ashTimer = 0;
    }
    // 页面不可见时停掉渲染循环，避免后台空转
    if (this.smoke) this.smoke.stop();
    this.persistAll();
  },

  onUnload() {
    if (this.ignitingTimer) clearTimeout(this.ignitingTimer);
    if (this.chargeTimer) clearInterval(this.chargeTimer);
    if (this.coughTimer) clearTimeout(this.coughTimer);
    if (this.ashTimer) clearInterval(this.ashTimer);
    this.persistAll();
    if (this.smoke) this.smoke.stop();
  },

  persistAll() {
    persist(app.globalData);
  },

  /** 把当前烟款配色 / 手感 / 技能特效应用到粒子系统 */
  applySmokeStyle() {
    const g = app.globalData;
    const skills = getSkillState(g.cigaretteCount);
    const cig = getCig(g.currentCigarette);
    this.puffSize = cig.puffSize;
    this.puffSpeed = cig.puffSpeed;
    if (!this.smoke) return;
    this.smoke.setColors(skills.neonBreath ? cig.colors.concat(['#a78bfa', '#22d3ee']) : cig.colors);
    this.smoke.setAmbient(skills.secondHand);
  },

  refreshFromGlobal() {
    const g = app.globalData;
    const cig = getCig(g.currentCigarette);
    this.setData({
      cigaretteCount: g.cigaretteCount,
      nicotine: g.nicotine,
      titleName: getTitle(g.cigaretteCount, g.soberAchieved),
      currentCigName: cig.name,
      currentCigMult: cig.mult,
      streakDays: g.streakDays,
      tar: g.tar,
      tarPercent: Math.min(100, Math.round((g.tar / TAR_THRESHOLD) * 100)),
      butts: g.butts,
      soundOn: g.soundOn,
    });
  },

  /** 烟灰炉：根据燃烧槽计算可收烟灰 */
  refreshAsh() {
    const g = app.globalData;
    const skills = getSkillState(g.cigaretteCount);
    const now = Date.now();
    const r = computeAsh(g.burnSlots, now, skills.ashBoost);
    this.ashSlots = r.slots;
    const burning = r.slots.filter((s) => now - s.t < ASH.BURN_MS).length;
    this.setData({ ash: Math.floor(r.avail), burningCount: burning });
  },

  /** 戒烟挑战状态：7 天达成检测 + UI 状态 */
  refreshQuit() {
    const g = app.globalData;
    const today = todayStr();
    let quitDayNo = 0;
    if (g.quitActive) {
      const dayNo = daysBetween(g.quitStartDay, today) + 1;
      if (dayNo > QUIT_DAYS) {
        g.quitActive = false;
        g.soberAchieved = true;
        this.persistAll();
        playSound('reward', g.soundOn);
        wx.showToast({ title: '🏆 挑战完成！获得终极称号「清醒者」', icon: 'none', duration: 2500 });
      } else {
        quitDayNo = dayNo;
      }
    }
    this.setData({
      quitActive: g.quitActive,
      quitDayNo,
      quitUnlocked: g.cigaretteCount >= QUIT_UNLOCK && !g.quitActive && !g.soberAchieved,
      sober: g.soberAchieved,
    });
  },

  /** 点火入口：戒烟挑战期间需要二次确认 */
  onLightUp() {
    const g = app.globalData;
    if (g.quitActive) {
      wx.showModal({
        title: '戒烟挑战中',
        content: '点燃这支烟会判定挑战失败。确定要点燃吗？',
        confirmText: '点燃',
        cancelText: '再忍忍',
        success: (res) => {
          if (res.confirm) this.beginIgnite();
        },
      });
      return;
    }
    this.beginIgnite();
  },

  beginIgnite() {
    if (this.data.phase !== 'idle') return;
    const g = app.globalData;
    const skills = getSkillState(g.cigaretteCount);
    const delay = skills.fastLight ? 150 : 700;
    this.igniteStartAt = Date.now();
    wx.vibrateShort({ type: 'light' });
    playSound('light', g.soundOn);
    this.setData({ phase: 'igniting', hintText: HINTS.igniting, lightBtnText: '…' });
    this.ignitingTimer = setTimeout(() => {
      wx.vibrateShort({ type: 'medium' });
      this.setData({ phase: 'lit', hintText: HINTS.lit });
    }, delay) as unknown as number;
  },

  onTouchStart() {
    if (this.data.phase !== 'lit') return;
    this.inhaleStart = Date.now();
    this.ringPts = [];
    this.ringCount = 0;
    this.setData({ phase: 'inhaling', hintText: HINTS.inhaling, ringCount: 0 });
    wx.vibrateShort({ type: 'light' });
    playSound('inhale', app.globalData.soundOn);
    this.chargeTimer = setInterval(() => {
      const percent = Math.min(100, Math.round(((Date.now() - this.inhaleStart) / MAX_CHARGE_MS) * 100));
      if (percent !== this.data.chargePercent) this.setData({ chargePercent: percent });
    }, 100) as unknown as number;
  },

  /** 吸入中画圈：识别完整圆周轨迹 → 烟圈连击（需烟圈大师） */
  onTouchMove(e: WechatMiniprogram.TouchEvent) {
    if (this.data.phase !== 'inhaling') return;
    const skills = getSkillState(app.globalData.cigaretteCount);
    if (!skills.smokeRing) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const pt: Pt = { x: t.clientX, y: t.clientY };
    const pts = this.ringPts;
    const last = pts[pts.length - 1];
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 8) return;
    pts.push(pt);
    if (pts.length < 18) return;

    let cx = 0;
    let cy = 0;
    for (const p of pts) {
      cx += p.x;
      cy += p.y;
    }
    cx /= pts.length;
    cy /= pts.length;
    let sum = 0;
    let prev = Math.atan2(pts[0].y - cy, pts[0].x - cx);
    let maxR = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = Math.atan2(pts[i].y - cy, pts[i].x - cx);
      let d = a - prev;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      sum += d;
      prev = a;
      const rr = Math.hypot(pts[i].x - cx, pts[i].y - cy);
      if (rr > maxR) maxR = rr;
    }
    if (Math.abs(sum) > (Math.PI * 5) / 3 && maxR > 20 && maxR < 220) {
      this.ringCount += 1;
      this.ringPts = [];
      wx.vibrateShort({ type: 'light' });
      this.setData({ ringCount: this.ringCount });
    } else if (pts.length > 60) {
      this.ringPts = pts.slice(-30);
    }
  },

  onTouchEnd() {
    if (this.data.phase !== 'inhaling') return;
    if (this.chargeTimer) {
      clearInterval(this.chargeTimer);
      this.chargeTimer = 0;
    }
    const charge = Math.min(1, (Date.now() - this.inhaleStart) / MAX_CHARGE_MS);
    const ringsDrawn = this.ringCount;
    playSound('exhale', app.globalData.soundOn);

    const g = app.globalData;
    const before = g.cigaretteCount;
    const skills = getSkillState(before);
    const cig = getCig(g.currentCigarette);

    // —— 咳嗽判定（先取咳嗽状态，再结算本次焦油）——
    const coughFactor = this.coughing ? 0.5 : 1;
    g.tar = Math.min(150, g.tar + tarGain(charge));
    const startCough = !this.coughing && g.tar >= TAR_THRESHOLD;

    // —— 晨烟连击 ——
    const today = todayStr();
    const ns = nextStreak(g.lastSmokeDay, today, g.streakDays);
    g.streakDays = ns.streak;
    if (g.streakDays > g.maxStreak) g.maxStreak = g.streakDays;
    g.lastSmokeDay = today;

    // —— 戒烟挑战：挑战期间抽烟即失败 ——
    let quitFailed = false;
    if (g.quitActive) {
      g.quitActive = false;
      quitFailed = true;
    }

    // —— 收益结算（烟圈连击加成）——
    const earn = Math.round(
      computeEarn(charge, cig.mult, skills) * ns.morningMult * coughFactor * ringFactor(ringsDrawn),
    );
    g.nicotine += earn;
    g.cigaretteCount = before + 1;
    const after = g.cigaretteCount;

    // —— 烟蒂与烟灰炉 ——
    g.butts += 1;
    g.burnSlots.push({ t: Date.now(), c: 0 });
    if (g.burnSlots.length > ASH.MAX_SLOTS) g.burnSlots.shift();

    // —— 吐雾粒子（烟圈数量 = 技能基础 3 圈 + 手绘圈数）——
    if (this.smoke) {
      const win = wx.getWindowInfo();
      const rings = skills.smokeRing ? 3 + ringsDrawn : 0;
      this.smoke.emitDrag(
        win.windowWidth * 0.5,
        win.windowHeight * 0.55,
        charge,
        rings,
        this.puffSize,
        this.puffSpeed,
      );
    }

    // —— 里程碑：技能解锁 / 称号晋升 ——
    const unlocked = SKILLS.filter((s) => s.milestone > before && s.milestone <= after);
    const titleBefore = getTitle(before, g.soberAchieved);
    const titleAfter = getTitle(after, g.soberAchieved);
    const messages: string[] = [];
    if (ns.morningMult > 1) messages.push(`晨烟×2，连击 ${g.streakDays} 天`);
    if (ringsDrawn > 0) messages.push(`${ringsDrawn} 连烟圈 +${Math.round((ringFactor(ringsDrawn) - 1) * 100)}%`);
    for (const s of unlocked) messages.push(`解锁技能「${s.name}」`);
    if (titleAfter !== titleBefore) messages.push(`称号晋升「${titleAfter}」`);
    if (quitFailed) messages.push('戒烟挑战失败');

    // —— 赛博试炼（顺序闯关）——
    this.recentSettles.push(Date.now());
    if (this.recentSettles.length > 3) this.recentSettles.shift();
    const trialCandidates: string[] = [];
    if (after >= 1) trialCandidates.push('first_smoke');
    if (charge >= 0.8) trialCandidates.push('deep_drag');
    if (this.igniteStartAt && Date.now() - this.igniteStartAt <= 5000) {
      trialCandidates.push('quick_hand');
    }
    if (ringsDrawn >= 2) trialCandidates.push('double_ring');
    if (earn >= 40) trialCandidates.push('big_puff');
    if (this.recentSettles.length === 3 && Date.now() - this.recentSettles[0] <= 60000) {
      trialCandidates.push('chain_three');
    }
    if (g.streakDays >= 3) trialCandidates.push('streak_3');
    if (g.soberAchieved) trialCandidates.push('sober');
    for (const m of this.runTrialChecks(trialCandidates)) messages.push(m);

    this.persistAll();
    this.applySmokeStyle();
    this.refreshAsh();
    this.refreshFromGlobal();
    this.refreshQuit();
    this.ringCount = 0;
    this.ringPts = [];
    this.setData({
      phase: 'idle',
      chargePercent: 0,
      ringCount: 0,
      hintText: `吐雾完成，尼古丁 +${earn}`,
      lightBtnText: '再点一支',
    });

    if (startCough) this.startCough();
    if (messages.length) {
      wx.vibrateShort({ type: 'heavy' });
      wx.showToast({ title: messages.join('，'), icon: 'none', duration: 2200 });
    }
  },

  /** 咳嗽：收益减半一段时间，屏幕抖动 */
  startCough() {
    this.coughing = true;
    playSound('cough', app.globalData.soundOn);
    wx.vibrateLong();
    wx.showToast({ title: '焦油超标，咳嗽中…收益减半', icon: 'none', duration: 2000 });
    this.setData({ coughing: true });
    if (this.coughTimer) clearTimeout(this.coughTimer);
    this.coughTimer = setTimeout(() => {
      this.coughing = false;
      this.setData({ coughing: false });
    }, COUGH_MS) as unknown as number;
  },

  /** 薄荷糖：清零焦油，并终止咳嗽 */
  onClearTar() {
    const g = app.globalData;
    if (g.tar <= 0) return;
    if (g.nicotine < MINT_COST) {
      wx.showToast({ title: `尼古丁不足（需要 ${MINT_COST}）`, icon: 'none' });
      return;
    }
    g.nicotine -= MINT_COST;
    g.tar = 0;
    if (this.coughTimer) clearTimeout(this.coughTimer);
    this.coughing = false;
    this.persistAll();
    playSound('reward', g.soundOn);
    this.refreshFromGlobal();
    this.setData({ coughing: false });
    wx.showToast({ title: '薄荷糖！焦油清零', icon: 'none' });
  },

  /** 收烟灰：2 烟灰 = 1 尼古丁 */
  onCollectAsh() {
    const g = app.globalData;
    const skills = getSkillState(g.cigaretteCount);
    const r = computeAsh(g.burnSlots, Date.now(), skills.ashBoost);
    const got = Math.floor(r.avail / ASH.NIC_PER_ASH);
    if (got < 1) {
      wx.showToast({ title: '烟灰还没攒够（2 烟灰 = 1 尼古丁）', icon: 'none' });
      return;
    }
    const ashUsed = got * ASH.NIC_PER_ASH;
    g.nicotine += got;
    g.ashCollected += ashUsed;
    g.burnSlots = r.slots;
    this.persistAll();
    playSound('reward', g.soundOn);
    this.refreshFromGlobal();
    this.refreshAsh();
    wx.showToast({ title: `收烟灰 +${got} 尼古丁`, icon: 'none' });
  },

  onStartQuit() {
    const g = app.globalData;
    if (g.quitActive || g.soberAchieved) return;
    g.quitActive = true;
    g.quitStartDay = todayStr();
    this.persistAll();
    this.refreshQuit();
    wx.showToast({ title: `戒烟挑战开始！${QUIT_DAYS} 天一支不抽`, icon: 'none', duration: 2200 });
  },

  onGiveUpQuit() {
    const g = app.globalData;
    if (!g.quitActive) return;
    g.quitActive = false;
    g.quitStartDay = '';
    this.persistAll();
    this.refreshQuit();
    wx.showToast({ title: '已放弃戒烟挑战', icon: 'none' });
  },

  onToggleSound() {
    const g = app.globalData;
    g.soundOn = !g.soundOn;
    this.persistAll();
    this.setData({ soundOn: g.soundOn });
    if (g.soundOn) playSound('light', true);
  },

  /** 试炼结算：只有当前关命中才算完成；完成时发奖励 + 全屏庆祝粒子 */
  runTrialChecks(candidates: string[]): string[] {
    const g = app.globalData;
    const done = completedTrials(g.trialDone, candidates);
    const msgs: string[] = [];
    if (!done.length) return msgs;
    for (const id of done) {
      g.trialDone.push(id);
      const t = trialById(id);
      if (t) {
        g.nicotine += t.reward;
        msgs.push(`试炼「${t.name}」完成 +${t.reward}`);
      }
    }
    this.persistAll();
    playSound('reward', g.soundOn);
    if (this.smoke) {
      const win = wx.getWindowInfo();
      this.smoke.emitCelebration(win.windowWidth * 0.5, win.windowHeight * 0.55);
    }
    this.refreshFromGlobal();
    this.refreshTrialChip();
    return msgs;
  },

  refreshTrialChip() {
    const g = app.globalData;
    const cur = currentTrialId(g.trialDone);
    const t = cur ? trialById(cur) : null;
    this.setData({
      trialName: t ? t.name : '',
      trialReward: t ? t.reward : 0,
    });
  },

  goTrial() {
    wx.switchTab({ url: '/pages/trial/trial' });
  },

  goGallery() {
    wx.switchTab({ url: '/pages/gallery/gallery' });
  },

  goSkills() {
    wx.switchTab({ url: '/pages/skills/skills' });
  },

  noop() {
    // 吞掉状态区触摸，避免误触吸入
  },
});
