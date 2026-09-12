// pages/collection/collection.ts —— 收藏：烟圈图鉴（规格 §26）
import { RING_COLLECTIONS, RingCollectible } from '../../data/collections';
import { loadPlayer, todayStr, PlayerSave } from '../../utils/save';

Page({
  data: {
    list: [] as Array<{
      id: string;
      name: string;
      rarity: string;
      desc: string;
      unlocked: boolean;
      count: number;
      best: number;
    }>,
    unlockedCount: 0,
    total: RING_COLLECTIONS.length,
  },

  onShow() {
    const player: PlayerSave = loadPlayer(todayStr());
    let unlockedCount = 0;
    const list = RING_COLLECTIONS.map((c: RingCollectible) => {
      const entry = player.collections[c.id];
      const unlocked = !!entry;
      if (unlocked) unlockedCount += 1;
      return {
        id: c.id,
        name: unlocked ? c.name : '？？？',
        rarity: c.rarity,
        desc: c.desc,
        unlocked,
        count: entry ? entry.count : 0,
        best: entry ? entry.best : 0,
      };
    });
    this.setData({ list, unlockedCount });
  },
});
