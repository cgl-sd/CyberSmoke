/// <reference path="../node_modules/miniprogram-api-typings/index.d.ts" />

/** 全局 App 实例的数据结构 */
interface IAppOption {
  globalData: {
    /** 尼古丁：主货币 */
    nicotine: number;
    /** 累计抽烟支数 */
    cigaretteCount: number;
  };
}
