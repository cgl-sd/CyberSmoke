// pages/play/play.ts —— 烟圈挑战核心玩法
// 状态机：ready → igniting → inhale → release → drawing → calculating → result（规格 §3.1）
import { Point, analyzeTrace } from '../../data/rings';
import {
  MAX_CHARGE_MS,
  DRAW_TIME_MS,
  buildRunResult,
  RunResult,
  Rank,
} from '../../data/scoring';
import {
  LEVELS,
  LevelDef,
  levelById,
  nextLevelId,
  starsFor,
  isLevelUnlocked,
  difficultyFactor,
} from '../../data/levels';
import {
  ENDLESS_HEARTS,
  ENDLESS_UNLOCK_LEVEL,
  roundGoal,
  endlessDifficultyFactor,
  milestoneReward,
  roundXp,
} from '../../data/endless';
import { runXp, applyXp, xpNeeded } from '../../data/xp';
import { genDaily, applyRunToDaily } from '../../data/daily';
import { applyCollection, ACHIEVEMENTS, achievementDone } from '../../data/collections';
import { loadPlayer, persistPlayer, todayStr, PlayerSave } from '../../utils/save';
import { playSound, perfectHaptic } from '../../utils/sound';
import { SmokeField } from '../../utils/particles';

type Phase = 'ready' | 'igniting' | 'inhale' | 'release' | 'drawing' | 'calculating' | 'result';
type ModeType = 'level' | 'endless';

const IGNITE_MS = 500;
const RELEASE_MS = 380;
const CALC_MS = 260;

function rankClassOf(rank: Rank): string {
  if (rank === 'PERFECT') return 'rank-perfect';
  if (rank === 'LEGEND') return 'rank-legend';
  if (rank === 'S' || rank === 'A') return 'rank-high';
  return 'rank-low';
}

Page({
  data: {
    phase: 'ready' as Phase,
    modeType: 'level' as ModeType,
    levelId: '1-01',
    levelName: '',
    modeChip: '主线 1-01',
    goalDesc: '',
    hearts: ENDLESS_HEARTS,
    round: 1,
    chargePercent: 0,
    inPerfect: false,
    drawTimePercent: 100,
    result: null as any,
    showDetails: false,
    endlessOver: null as any,
    sheet: false,
    sheetLevels: [] as Array<{ id: string; name: string; starText: string; locked: boolean; current: boolean }>,
    endlessUnlocked: false,
    endlessUnlockLevel: ENDLESS_UNLOCK_LEVEL,
    soundOn: true,
  },

  smoke: null as SmokeField | null,
  player: null as PlayerSave | null,
  mode: 'level' as ModeType,
  level: null as LevelDef | null,
  endlessRound: 1,
  endlessRunScore: 0,
  hearts: ENDLESS_HEARTS,
  combo: 0,
  charge: 0,
  chargeStart: 0,
  perfectHit: false,
  drawStart: 0,
  trace: [] as Point[],
  lastPt: null as Point | null,
  tipX: 0,
  tipY: 0,
  chargeTimer: 0 as number,
  drawTimer: 0 as number,
  phaseTimer: 0 as number,
  wispTimer: 0 as number,

  // ---------- 生命周期 ----------

  onLoad() {
    const today = todayStr();
    this.player = loadPlayer(today);
    this.refreshDaily();
    this.mode = this.player.lastModeType === 'endless' && this.endlessUnlockedNow() ? 'endless' : 'level';
    this.level = levelById(this.player.lastLevelId) || LEVELS[0];
    this.endlessRound = 1;
    this.hearts = ENDLESS_HEARTS;
    const win = wx.getWindowInfo();
    this.tipX = win.windowWidth * 0.5 - 78;
    this.tipY = win.windowHeight * 0.3 + 16;
    this.applyModeChips();
  },

  onReady() {
    const query = wx.createSelectorQuery();
    query
      .select('#fx')
      .fields({ node: true, size: true })
      .exec((res) => {
        const item: any = res && res[0];
        if (!item || !item.node) return;
        const win = wx.getWindowInfo();
        this.smoke = new SmokeField();
        this.smoke.init(item.node, item.width || win.windowWidth, item.height || win.windowHeight);
      });
    this.wispTimer = setInterval(() => {
      if (this.data.phase === 'ready' || this.data.phase === 'inhale') {
        const intensity = this.data.phase === 'inhale' ? 0.3 + (this.data.chargePercent / 100) * 0.7 : 0.35;
        this.smoke && this.smoke.wisp(this.tipX, this.tipY, intensity);
      }
    }, 160) as unknown as number;
  },

  onShow() {
    const today = todayStr();
    this.player = loadPlayer(today);
    this.refreshDaily();
    this.setData({ soundOn: this.player.soundOn });
    if (this.smoke) this.smoke.start();
  },

  onHide() {
    this.clearTimers();
    if (this.smoke) this.smoke.stop();
    if (this.player) persistPlayer(this.player);
  },

  onUnload() {
    this.clearTimers();
    if (this.smoke) this.smoke.stop();
    if (this.player) persistPlayer(this.player);
  },

  clearTimers() {
    if (this.chargeTimer) clearInterval(this.chargeTimer);
    if (this.drawTimer) clearInterval(this.drawTimer);
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    this.chargeTimer = 0;
    this.drawTimer = 0;
    this.phaseTimer = 0;
  },

  refreshDaily() {
    if (!this.player) return;
    const today = todayStr();
    if (this.player.daily.date !== today) {
      this.player.daily = { date: today, tasks: genDaily(today) };
      persistPlayer(this.player);
    }
  },

  endlessUnlockedNow(): boolean {
    return (this.player ? this.player.level : 1) >= ENDLESS_UNLOCK_LEVEL;
  },

  applyModeChips() {
    const endless = this.mode === 'endless';
    const goal = endless
      ? roundGoal(this.endlessRound).desc
      : this.level
      ? this.level.goals[0].desc
      : '';
    this.setData({
      modeType: this.mode,
      levelId: this.level ? this.level.id : '',
      levelName: this.level ? this.level.name : '',
      modeChip: endless ? `无限 · ROUND ${this.endlessRound}` : `主线 ${this.level ? this.level.id : ''}`,
      goalDesc: goal,
      hearts: this.hearts,
      round: this.endlessRound,
    });
  },

  // ---------- 状态机 ----------

  onIgniteTap() {
    if (this.data.phase !== 'ready') return;
    const snd = this.player ? this.player.soundOn : true;
    playSound('light', snd);
    try {
      wx.vibrateShort({ type: 'light' });
    } catch (e) { /* 忽略 */ }
    this.setData({ phase: 'igniting' });
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = 0;
      this.setData({ phase: 'inhale', chargePercent: 0, inPerfect: false });
    }, IGNITE_MS) as unknown as number;
  },

  onTouchStart(e: WechatMiniprogram.TouchEvent) {
    const phase = this.data.phase;
    if (phase !== 'inhale' && phase !== 'drawing') return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    if (phase === 'inhale') {
      const maxMs = (this.level && this.level.maxChargeMs) || MAX_CHARGE_MS;
      this.chargeStart = Date.now();
      this.perfectHit = false;
      const pmin = (this.level && this.level.perfectMin) || 0.45;
      this.chargeTimer = setInterval(() => {
        const percent = Math.min(100, Math.round(((Date.now() - this.chargeStart) / maxMs) * 100));
        if (!this.perfectHit && percent >= pmin * 100) {
          this.perfectHit = true;
          try {
            wx.vibrateShort({ type: 'light' });
          } catch (err) { /* 忽略 */ }
        }
        if (percent !== this.data.chargePercent) {
          this.setData({ chargePercent: percent, inPerfect: this.perfectHit });
        }
      }, 50) as unknown as number;
    } else {
      this.pushTrace(t.clientX, t.clientY);
    }
  },

  onTouchMove(e: WechatMiniprogram.TouchEvent) {
    if (this.data.phase !== 'drawing') return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    this.pushTrace(t.clientX, t.clientY);
  },

  pushTrace(x: number, y: number) {
    const now = Date.now();
    const last = this.lastPt;
    if (last && Math.hypot(x - last.x, y - last.y) < 3 && now - last.t < 30) return;
    const pt: Point = { x, y, t: now };
    this.trace.push(pt);
    this.lastPt = pt;
    if (this.smoke) this.smoke.setTrail(this.trace);
  },

  onTouchEnd() {
    if (this.data.phase === 'inhale') {
      if (this.chargeTimer) {
        clearInterval(this.chargeTimer);
        this.chargeTimer = 0;
      }
      const maxMs = (this.level && this.level.maxChargeMs) || MAX_CHARGE_MS;
      this.charge = Math.min(1, (Date.now() - this.chargeStart) / maxMs);
      this.setData({ phase: 'release' });
      const snd = this.player ? this.player.soundOn : true;
      playSound('exhale', snd);
      if (this.smoke) this.smoke.burst(this.tipX, this.tipY, this.charge);
      this.phaseTimer = setTimeout(() => {
        this.phaseTimer = 0;
        this.startDraw();
      }, RELEASE_MS) as unknown as number;
      return;
    }
    if (this.data.phase === 'drawing') {
      this.endDraw();
    }
  },

  onTouchCancel() {
    if (this.data.phase === 'inhale' && this.chargeTimer) {
      clearInterval(this.chargeTimer);
      this.chargeTimer = 0;
      this.charge = Math.min(1, (Date.now() - this.chargeStart) / ((this.level && this.level.maxChargeMs) || MAX_CHARGE_MS));
      this.setData({ phase: 'release' });
      this.phaseTimer = setTimeout(() => {
        this.phaseTimer = 0;
        this.startDraw();
      }, RELEASE_MS) as unknown as number;
    } else if (this.data.phase === 'drawing') {
      this.endDraw();
    }
  },

  startDraw() {
    this.trace = [];
    this.lastPt = null;
    if (this.smoke) this.smoke.setTrail([]);
    this.drawStart = Date.now();
    this.setData({ phase: 'drawing', drawTimePercent: 100 });
    const limit = (this.level && this.level.timeLimitMs) || DRAW_TIME_MS;
    this.drawTimer = setInterval(() => {
      const left = limit - (Date.now() - this.drawStart);
      this.setData({ drawTimePercent: Math.max(0, Math.round((left / limit) * 100)) });
      if (left <= 0) this.endDraw();
    }, 100) as unknown as number;
  },

  endDraw() {
    if (this.data.phase !== 'drawing') return;
    if (this.drawTimer) {
      clearInterval(this.drawTimer);
      this.drawTimer = 0;
    }
    this.setData({ phase: 'calculating', drawTimePercent: 0 });
    this.phaseTimer = setTimeout(() => {
      this.phaseTimer = 0;
      this.settleRun();
    }, CALC_MS) as unknown as number;
  },

  // ---------- 结算 ----------

  settleRun() {
    const player = this.player;
    if (!player) return;
    const win = wx.getWindowInfo();
    const traceReport = analyzeTrace(this.trace, win.windowWidth);
    const isEndless = this.mode === 'endless';
    const level = this.level;
    const diffF = isEndless
      ? endlessDifficultyFactor(this.endlessRound)
      : level
      ? difficultyFactor(level)
      : 1;

    const run: RunResult = buildRunResult(traceReport, this.charge, this.combo, diffF);
    this.combo = run.combo;

    // —— 关卡 / 无限判定 ——
    let stars = 0;
    let firstClear = false;
    let firstClearReward = 0;
    let goalRows: Array<{ desc: string; pass: boolean }> = [];
    let passed = true;
    let showNext = false;
    if (!isEndless && level) {
      stars = starsFor(level, run);
      passed = stars >= 1;
      goalRows = level.goals.map((g) => ({ desc: g.desc, pass: this.goalPass(g, run) }));
      firstClear = passed && !player.completedLevels[level.id];
      firstClearReward = firstClear ? level.reward : 0;
      if (passed) {
        const prev = player.completedLevels[level.id];
        player.completedLevels[level.id] = {
          stars: Math.max(prev ? prev.stars : 0, stars),
          bestScore: Math.max(prev ? prev.bestScore : 0, run.score),
        };
      }
      const nextId = nextLevelId(level.id);
      showNext = passed && !!nextId;
    }
    const endlessGoal = isEndless ? roundGoal(this.endlessRound) : null;
    const endlessPass = isEndless && endlessGoal ? this.goalPass(endlessGoal, run) : false;

    // —— 奖励结算 ——
    let currency = Math.round(run.quality / 2) + firstClearReward;
    let xpGain = runXp(run.quality, run.rank, firstClear);
    const messages: string[] = [];
    if (firstClear) messages.push(`首通奖励 +${firstClearReward}`);
    if (isEndless) {
      if (endlessPass) {
        xpGain += roundXp(this.endlessRound);
        const ms = milestoneReward(this.endlessRound);
        if (ms > 0) {
          currency += ms;
          messages.push(`里程碑 ROUND ${this.endlessRound} +${ms}`);
        }
      }
    }

    const up = applyXp(player.level, player.xp, xpGain);
    player.level = up.level;
    player.xp = up.xp;
    currency += up.rewardCurrency;
    for (const m of up.messages) messages.push(m);

    // —— 统计与纪录 ——
    player.totalGames += 1;
    if (run.closed) player.totalRings += 1;
    if (run.rank === 'PERFECT' || run.rank === 'LEGEND') player.perfectCount += 1;
    const newRecords: string[] = [];
    if (run.score > player.bestScore) {
      player.bestScore = run.score;
      newRecords.push('最佳得分');
    }
    if (run.combo > player.bestCombo) player.bestCombo = run.combo;
    if (isEndless && endlessPass && this.endlessRound > player.bestEndlessRound) {
      player.bestEndlessRound = this.endlessRound;
      newRecords.push('最高 Round');
    }

    // —— 每日任务 ——
    const dailyRes = applyRunToDaily(player.daily.tasks, run);
    player.daily.tasks = dailyRes.tasks;
    let dailyReward = 0;
    for (const t of dailyRes.newlyDone) {
      dailyReward += t.reward;
      messages.push(`每日任务「${t.desc}」完成`);
    }
    currency += dailyReward;

    // —— 图鉴与成就 ——
    const colRes = applyCollection(player.collections, run);
    player.collections = colRes.map;
    const firstUnlockNames = colRes.firstUnlocked.map((c) => c.name);
    for (const a of ACHIEVEMENTS) {
      if (player.achievements.indexOf(a.id) < 0 && achievementDone(a.id, player)) {
        player.achievements.push(a.id);
        messages.push(`成就「${a.name}」达成`);
      }
    }

    player.currency += currency;
    persistPlayer(player);

    // —— 音效与震动 ——
    const snd = player.soundOn;
    if (run.rank === 'PERFECT' || run.rank === 'LEGEND') {
      playSound('perfect', snd);
      perfectHaptic();
    } else {
      playSound('score', snd);
    }

    // —— 无限模式推进 ——
    let endlessFailedOut = false;
    if (isEndless) {
      if (endlessPass) {
        this.endlessRunScore += run.score;
      } else {
        this.hearts -= 1;
        if (this.hearts <= 0) endlessFailedOut = true;
      }
    }

    // —— 烟圈视觉 ——
    if (this.smoke && traceReport.valid) {
      this.smoke.smokeRing(run.ringCenterX, run.ringCenterY, run.ringRadius, run.quality, run.rank === 'PERFECT' || run.rank === 'LEGEND');
    }

    const result = {
      rank: run.rank,
      rankClass: rankClassOf(run.rank),
      score: run.score,
      quality: run.quality,
      combo: run.combo,
      currency,
      xp: xpGain,
      levelNow: player.level,
      xpNow: player.xp,
      xpNeed: xpNeeded(player.level),
      levelUps: messages,
      stars,
      starText: '★'.repeat(stars) + '☆'.repeat(3 - stars),
      goalRows,
      passed,
      showNext,
      newRecords,
      firstUnlockNames,
      endlessFailedOut,
      details: [
        { label: '闭合度', value: Math.round(run.closure * 100) },
        { label: '圆度', value: Math.round(run.roundness * 100) },
        { label: '流畅度', value: Math.round(run.smoothness * 100) },
        { label: '尺寸', value: Math.round(run.sizeScore * 100) },
        { label: '蓄力', value: Math.round(run.charge * 100) },
      ],
      valid: traceReport.valid,
    };
    this.setData({ phase: 'result', result, showDetails: false, hearts: this.hearts });
  },

  goalPass(goal: { type: string; value?: number }, run: RunResult): boolean {
    switch (goal.type) {
      case 'complete':
        return true;
      case 'score':
        return run.score >= (goal.value || 0);
      case 'rank':
        return ['C', 'B', 'A', 'S', 'PERFECT', 'LEGEND'].indexOf(run.rank) >= (goal.value || 0);
      case 'roundness':
        return run.roundness * 100 >= (goal.value || 0);
      case 'closure':
        return run.closure * 100 >= (goal.value || 0);
      case 'size':
        return run.sizeScore * 100 >= (goal.value || 0);
      case 'combo':
        return run.combo >= (goal.value || 0);
      case 'perfectInhale':
        return run.inhalePerfect;
      case 'time':
        return run.drawDurationMs <= (goal.value || 0);
      default:
        return false;
    }
  },

  // ---------- 结果页操作 ----------

  onAgain() {
    if (this.mode === 'endless') {
      if (this.hearts <= 0) {
        // 本局结束：弹出结算
        const player = this.player;
        this.setData({
          result: null,
          endlessOver: {
            round: this.endlessRound,
            score: this.endlessRunScore,
            bestRound: player ? player.bestEndlessRound : 0,
          },
        });
        return;
      }
      if (this.data.result && this.data.result.passed) this.endlessRound += 1;
    }
    this.setData({ result: null, showDetails: false, phase: 'ready' });
    this.applyModeChips();
  },

  onNext() {
    if (!this.level) return;
    const nextId = nextLevelId(this.level.id);
    if (!nextId) return;
    this.level = levelById(nextId);
    this.combo = 0;
    this.player && (this.player.lastLevelId = nextId, this.player.lastModeType = 'level', persistPlayer(this.player));
    this.setData({ result: null, showDetails: false, phase: 'ready' });
    this.applyModeChips();
  },

  onEndlessRestart() {
    this.endlessRound = 1;
    this.hearts = ENDLESS_HEARTS;
    this.combo = 0;
    this.endlessRunScore = 0;
    this.setData({ endlessOver: null, result: null, phase: 'ready' });
    this.applyModeChips();
  },

  toggleDetails() {
    this.setData({ showDetails: !this.data.showDetails });
  },

  noop() { /* 吞噬冒泡 */ },

  // ---------- 关卡选择 ----------

  openSheet() {
    const player = this.player;
    if (!player) return;
    const rows = LEVELS.map((l) => {
      const prog = player.completedLevels[l.id];
      const stars = prog ? prog.stars : 0;
      return {
        id: l.id,
        name: l.name,
        starText: '★'.repeat(stars) + '☆'.repeat(3 - stars),
        locked: !isLevelUnlocked(l.id, player.completedLevels),
        current: this.mode === 'level' && this.level?.id === l.id,
      };
    });
    this.setData({ sheet: true, sheetLevels: rows, endlessUnlocked: this.endlessUnlockedNow() });
  },

  closeSheet() {
    this.setData({ sheet: false });
  },

  onSheetLevel(e: WechatMiniprogram.TouchEvent) {
    const id = (e.currentTarget.dataset.id as string) || '';
    if (!this.player) return;
    if (!isLevelUnlocked(id, this.player.completedLevels)) {
      wx.showToast({ title: '先通过上一关', icon: 'none' });
      return;
    }
    this.selectLevel(id);
  },

  selectLevel(id: string) {
    this.mode = 'level';
    this.level = levelById(id) || LEVELS[0];
    this.combo = 0;
    if (this.player) {
      this.player.lastLevelId = this.level.id;
      this.player.lastModeType = 'level';
      persistPlayer(this.player);
    }
    this.setData({ sheet: false, result: null, endlessOver: null, phase: 'ready' });
    this.applyModeChips();
  },

  onSheetEndless() {
    if (!this.endlessUnlockedNow()) {
      wx.showToast({ title: `等级达到 Lv.${ENDLESS_UNLOCK_LEVEL} 解锁`, icon: 'none' });
      return;
    }
    this.mode = 'endless';
    this.endlessRound = 1;
    this.hearts = ENDLESS_HEARTS;
    this.combo = 0;
    if (this.player) {
      this.player.lastModeType = 'endless';
      persistPlayer(this.player);
    }
    this.setData({ sheet: false, result: null, endlessOver: null, phase: 'ready' });
    this.applyModeChips();
  },
});
