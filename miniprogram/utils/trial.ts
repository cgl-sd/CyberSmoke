// utils/trial.ts —— 赛博试炼：顺序闯关模式（纯数据与纯函数，可在 tmp 下测试）
export interface TrialDef {
  id: string;
  name: string;
  desc: string;
  reward: number;
}

/** 关卡按数组顺序依次解锁，只有「当前关」可以被完成 */
export const TRIALS: TrialDef[] = [
  { id: 'first_smoke', name: '初试锋芒', desc: '抽完第 1 支烟', reward: 30 },
  { id: 'deep_drag', name: '深呼吸', desc: '单支蓄力 ≥80%', reward: 50 },
  { id: 'quick_hand', name: '快枪手', desc: '点火到吐雾 ≤5 秒', reward: 60 },
  { id: 'double_ring', name: '圆桌骑士', desc: '一支烟内画出 2 个烟圈', reward: 80 },
  { id: 'big_puff', name: '巨肺', desc: '单支收益 ≥40 尼古丁', reward: 100 },
  { id: 'chain_three', name: '链式吞吐', desc: '60 秒内连抽 3 支', reward: 120 },
  { id: 'collector', name: '收藏家', desc: '集齐 3 款烟', reward: 150 },
  { id: 'streak_3', name: '三日之约', desc: '晨烟连击 ≥3 天', reward: 300 },
  { id: 'sober', name: '清醒试炼', desc: '完成戒烟挑战（7 天一支不抽）', reward: 1000 },
];

export function trialById(id: string): TrialDef | null {
  return TRIALS.find((t) => t.id === id) || null;
}

export function trialReward(id: string): number {
  const t = trialById(id);
  return t ? t.reward : 0;
}

/** 当前关卡：第一个未完成的 */
export function currentTrialId(done: string[]): string | null {
  for (const t of TRIALS) {
    if (done.indexOf(t.id) < 0) return t.id;
  }
  return null;
}

/**
 * 结算候选关卡：只有「当前关」命中才算完成；
 * 一轮内可连锁完成多关（如一次深蓄力的第一支烟连过三关）
 */
export function completedTrials(done: string[], candidates: string[]): string[] {
  const order = TRIALS.map((t) => t.id);
  const cands = candidates.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const out: string[] = [];
  let cur = currentTrialId(done);
  for (const id of cands) {
    if (cur === id) {
      out.push(id);
      cur = currentTrialId(done.concat(out));
    }
  }
  return out;
}
