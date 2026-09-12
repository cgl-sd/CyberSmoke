// utils/save.ts —— 本地存档读写
const SAVE_KEY = 'cybersmoke_save';

export interface SaveData {
  version: number;
  nicotine: number;
  cigaretteCount: number;
  ownedCigarettes: string[];
  currentCigarette: string;
}

/** 读取存档，无档或损坏时返回 null（按新档处理） */
export function loadSave(): SaveData | null {
  try {
    const raw = wx.getStorageSync<Partial<SaveData>>(SAVE_KEY);
    if (raw && typeof raw.cigaretteCount === 'number') {
      return {
        version: 1,
        nicotine: typeof raw.nicotine === 'number' ? raw.nicotine : 0,
        cigaretteCount: raw.cigaretteCount,
        ownedCigarettes:
          Array.isArray(raw.ownedCigarettes) && raw.ownedCigarettes.length
            ? raw.ownedCigarettes
            : ['slim'],
        currentCigarette: typeof raw.currentCigarette === 'string' ? raw.currentCigarette : 'slim',
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
    wx.setStorageSync(SAVE_KEY, { ...data, version: 1 } as SaveData);
  } catch (e) {
    // 忽略写入失败
  }
}
