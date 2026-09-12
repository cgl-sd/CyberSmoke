// utils/save.ts —— 玩家存档 v3（规格 §35 Player 结构）
// 本版本为「烟圈挑战」重做版：旧版存档不兼容，按新档处理（保留音效开关）
import { DailyTask, genDaily } from '../data/daily';

const SAVE_KEY = 'cybersmoke_player_v3';

export interface LevelProgress {
  stars: number;
  bestScore: number;
}

export interface CollectEntry {
  count: number;
  best: number;
}

export interface PlayerSave {
  version: number;
  level: number;
  xp: number;
  currency: number;

  totalGames: number;
  totalRings: number;
  perfectCount: number;

  bestScore: number;
  bestCombo: number;
  bestEndlessRound: number;
  bestEndlessScore: number;

  completedLevels: Record<string, LevelProgress>;
  achievements: string[];
  collections: Record<string, CollectEntry>;

  daily: { date: string; tasks: DailyTask[] };

  /** 上次游玩的关卡 id */
  lastLevelId: string;
  /** 上次模式：level / endless / free */
  lastModeType: 'level' | 'endless';

  soundOn: boolean;
}

const num = (v: unknown, dflt: number): number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : dflt;

export function defaultPlayer(today: string): PlayerSave {
  return {
    version: 3,
    level: 1,
    xp: 0,
    currency: 0,
    totalGames: 0,
    totalRings: 0,
    perfectCount: 0,
    bestScore: 0,
    bestCombo: 0,
    bestEndlessRound: 0,
    bestEndlessScore: 0,
    completedLevels: {},
    achievements: [],
    collections: {},
    daily: { date: today, tasks: genDaily(today) },
    lastLevelId: '1-01',
    lastModeType: 'level',
    soundOn: true,
  };
}

function sanitizeDaily(raw: any, today: string): PlayerSave['daily'] {
  if (
    raw &&
    typeof raw.date === 'string' &&
    Array.isArray(raw.tasks) &&
    raw.tasks.length === 3 &&
    raw.tasks.every((t: any) => t && typeof t.id === 'string' && typeof t.target === 'number')
  ) {
    return { date: raw.date, tasks: raw.tasks };
  }
  return { date: today, tasks: genDaily(today) };
}

/** 读取存档；无档/旧档/损坏档一律按新档处理 */
export function loadPlayer(today: string): PlayerSave {
  try {
    const raw = wx.getStorageSync<any>(SAVE_KEY);
    if (raw && raw.version === 3 && typeof raw.level === 'number') {
      return {
        version: 3,
        level: num(raw.level, 1),
        xp: num(raw.xp, 0),
        currency: num(raw.currency, 0),
        totalGames: num(raw.totalGames, 0),
        totalRings: num(raw.totalRings, 0),
        perfectCount: num(raw.perfectCount, 0),
        bestScore: num(raw.bestScore, 0),
        bestCombo: num(raw.bestCombo, 0),
        bestEndlessRound: num(raw.bestEndlessRound, 0),
        bestEndlessScore: num(raw.bestEndlessScore, 0),
        completedLevels:
          raw.completedLevels && typeof raw.completedLevels === 'object' ? raw.completedLevels : {},
        achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
        collections:
          raw.collections && typeof raw.collections === 'object' ? raw.collections : {},
        daily: sanitizeDaily(raw.daily, today),
        lastLevelId: typeof raw.lastLevelId === 'string' ? raw.lastLevelId : '1-01',
        lastModeType: raw.lastModeType === 'endless' ? 'endless' : 'level',
        soundOn: raw.soundOn !== false,
      };
    }
  } catch (e) {
    // 损坏档按新档处理
  }
  return defaultPlayer(today);
}

export function persistPlayer(player: PlayerSave): void {
  try {
    wx.setStorageSync(SAVE_KEY, player);
  } catch (e) {
    // 写入失败静默
  }
}

/** 本地日期 YYYY-MM-DD */
export function todayStr(d = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
