// pages/trial/trial.ts —— 赛博试炼：顺序闯关
import { TRIALS } from '../../utils/trial';

const app = getApp<IAppOption>();

interface TrialRow {
  id: string;
  name: string;
  desc: string;
  reward: number;
  state: 'done' | 'current' | 'locked';
}

Page({
  data: {
    list: [] as TrialRow[],
    doneCount: 0,
    total: TRIALS.length,
  },

  onShow() {
    const done = app.globalData.trialDone;
    let curFound = false;
    this.setData({
      doneCount: done.length,
      list: TRIALS.map((t) => {
        const isDone = done.indexOf(t.id) >= 0;
        const isCurrent = !isDone && !curFound;
        if (isCurrent) curFound = true;
        return {
          id: t.id,
          name: t.name,
          desc: t.desc,
          reward: t.reward,
          state: (isDone ? 'done' : isCurrent ? 'current' : 'locked') as TrialRow['state'],
        };
      }),
    });
  },
});
