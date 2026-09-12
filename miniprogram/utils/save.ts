// utils/save.ts —— 本地存档读写（v2：含焦油/烟蒂/烟灰炉/晨烟/戒烟挑战/声音设置）
import { BurnSlot } from '../data/game';

const SAVE_KEY = 'cybersmoke_save';

export interface SaveData {
  version: number;
  nicotine: number;
  cigaretteCount: number;
  ownedCigarettes: string[];
  currentCigarette: string;
  /** 焦油（负资源） */
  tar: number;
  /** 烟蒂（抽奖材料） */
  butts: number;
  /** 烟灰炉燃烧槽（最近 N 支） */
  burnSlots: BurnSlot[];
  /** 最近一次抽烟的本地日期 */
  lastSmokeDay: string;
  /** 晨烟连击天数 */
  streakDays: number;
  /** 戒烟挑战进行中 */
  quitActive: boolean;
  /** 挑战开始日期 */
  quitStartDay: string;
  /** 已达成「清醒者」 */
  soberAchieved: boolean;
  /** 音效开关 */
  soundOn: boolean;
}

function sanitizeSlots(raw: unknown): BurnSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s: any) => s && typeof s.t === 'number')
    .map((s: any) => ({ t: s.t as number, c: typeof s.c === 'number' ? s.c : 0 }));
}

/** 读取存档，无档或损坏时返回 null（按新档处理）；旧版本存档自动补默认值 */
export function loadSave(): SaveData | null {
  try {
    const raw = wx.getStorageSync<Partial<SaveData>>(SAVE_KEY);
    if (raw && typeof raw.cigaretteCount === 'number') {
      return {
        version: 2,
        nicotine: typeof raw.nicotine === 'number' ? raw.nicotine : 0,
        cigaretteCount: raw.cigaretteCount,
        ownedCigarettes:
          Array.isArray(raw.ownedCigarettes) && raw.ownedCigarettes.length
            ? raw.ownedCigarettes
            : ['slim'],
        currentCigarette: typeof raw.currentCigarette === 'string' ? raw.currentCigarette : 'slim',
        tar: typeof raw.tar === 'number' ? raw.tar : 0,
        butts: typeof raw.butts === 'number' ? raw.butts : 0,
        burnSlots: sanitizeSlots(raw.burnSlots),
        lastSmokeDay: typeof raw.lastSmokeDay === 'string' ? raw.lastSmokeDay : '',
        streakDays: typeof raw.streakDays === 'number' ? raw.streakDays : 0,
        quitActive: raw.quitActive === true,
        quitStartDay: typeof raw.quitStartDay === 'string' ? raw.quitStartDay : '',
        soberAchieved: raw.soberAchieved === true,
        soundOn: raw.soundOn !== false,
      };
    }
  } catch (e) {
    // 存档损坏时按新档处理
  }
  return null;
}

/** 写入存档（version 由这里统一封装，静默失败不打断玩法） */
export function persist(data: Omit<SaveData, 'version'>): void {
  try {
    wx.setStorageSync(SAVE_KEY, { ...data, version: 2 } as SaveData);
  } catch (e) {
    // 忽略写入失败
  }
}
