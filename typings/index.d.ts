/// <reference path="../node_modules/miniprogram-api-typings/index.d.ts" />

/** 全局 App 实例的数据结构 */
interface IAppOption {
  globalData: {
    /** 尼古丁：主货币 */
    nicotine: number;
    /** 累计抽烟支数 */
    cigaretteCount: number;
    /** 已拥有烟款 id 列表 */
    ownedCigarettes: string[];
    /** 当前装备烟款 id */
    currentCigarette: string;
    /** 焦油（负资源） */
    tar: number;
    /** 烟蒂（抽奖材料） */
    butts: number;
    /** 烟灰炉燃烧槽（与 data/game.ts 的 BurnSlot 结构一致） */
    burnSlots: { t: number; c: number }[];
    /** 最近一次抽烟的本地日期 YYYY-MM-DD */
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
  };
}
