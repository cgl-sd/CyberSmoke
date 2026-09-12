// data/rings.ts —— 烟圈轨迹识别（纯函数，无 wx 依赖，可在 tmp 下独立测试）
// 评分维度：闭合度 / 圆度 / 流畅度 / 尺寸 / 时间（规格 §7、§8）

export interface Point {
  x: number;
  y: number;
  t: number;
}

export interface TraceReport {
  valid: boolean;
  closure: number;
  roundness: number;
  smoothness: number;
  sizeScore: number;
  timeScore: number;
  /** 加权和 0~100（未乘蓄力修正） */
  qualityRaw: number;
  /** 烟圈直径（px） */
  diameter: number;
  /** 直径 / 屏宽 */
  sizeRel: number;
  centerX: number;
  centerY: number;
  durationMs: number;
  pointCount: number;
}

/** 至少需要这么多轨迹点才参与评分 */
export const MIN_POINTS = 8;
/** 最佳直径占屏宽比例区间 */
export const SIZE_MIN = 0.3;
export const SIZE_MAX = 0.65;
/** 最佳绘制时长区间（毫秒） */
export const TIME_MIN_MS = 1200;
export const TIME_MAX_MS = 3000;
/** 停顿判定阈值 */
const PAUSE_MS = 350;
/** 角度突变判定阈值（约 60°） */
const SPIKE_RAD = 1.05;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

function emptyReport(pointCount: number): TraceReport {
  return {
    valid: false,
    closure: 0,
    roundness: 0,
    smoothness: 0,
    sizeScore: 0,
    timeScore: 0,
    qualityRaw: 0,
    diameter: 0,
    sizeRel: 0,
    centerX: 0,
    centerY: 0,
    durationMs: 0,
    pointCount,
  };
}

/** 分析一次绘制轨迹（同输入同输出，可测试） */
export function analyzeTrace(points: Point[], screenWidth: number): TraceReport {
  const count = points ? points.length : 0;
  if (!points || count < MIN_POINTS || !(screenWidth > 0)) return emptyReport(count);

  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const centerX = sx / count;
  const centerY = sy / count;

  let radiusSum = 0;
  const radii: number[] = [];
  for (const p of points) {
    const r = Math.hypot(p.x - centerX, p.y - centerY);
    radii.push(r);
    radiusSum += r;
  }
  const meanRadius = radiusSum / count;
  if (meanRadius < 3) return emptyReport(count);

  // 圆度：半径波动越小越圆
  let devSum = 0;
  for (const r of radii) devSum += Math.abs(r - meanRadius);
  const roundness = clamp01(1 - devSum / count / meanRadius);

  // 闭合度：首尾距离 / 直径
  const gap = Math.hypot(points[0].x - points[count - 1].x, points[0].y - points[count - 1].y);
  const closure = clamp01(1 - gap / (2 * meanRadius));

  // 流畅度：角度突变 / 停顿 / 回退 / 总转角偏离 2π
  let totalTurn = 0;
  let spikes = 0;
  let pauses = 0;
  let backtrack = 0;
  let segs = 0;
  for (let i = 1; i < count - 1; i++) {
    const v1x = points[i].x - points[i - 1].x;
    const v1y = points[i].y - points[i - 1].y;
    const v2x = points[i + 1].x - points[i].x;
    const v2y = points[i + 1].y - points[i].y;
    const m1 = Math.hypot(v1x, v1y);
    const m2 = Math.hypot(v2x, v2y);
    if (m1 > 0.5 && m2 > 0.5) {
      const a1 = Math.atan2(v1y, v1x);
      const a2 = Math.atan2(v2y, v2x);
      let d = a2 - a1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      totalTurn += Math.abs(d);
      if (Math.abs(d) > SPIKE_RAD) spikes++;
      if (v1x * v2x + v1y * v2y < 0) backtrack++;
      segs++;
    }
    if (points[i + 1].t - points[i].t > PAUSE_MS) pauses++;
  }
  const turnRatio = totalTurn / (2 * Math.PI);
  const backtrackRatio = segs > 0 ? backtrack / segs : 1;
  const smoothness = clamp01(
    1 -
      Math.min(0.5, spikes * 0.08) -
      Math.min(0.3, pauses * 0.1) -
      backtrackRatio * 0.25 -
      Math.min(0.6, Math.abs(turnRatio - 1) * 0.4),
  );

  // 尺寸：直径占屏宽比例，30%~65% 最佳
  const diameter = 2 * meanRadius;
  const sizeRel = diameter / screenWidth;
  let sizeScore: number;
  if (sizeRel < SIZE_MIN) sizeScore = clamp01(sizeRel / SIZE_MIN);
  else if (sizeRel > SIZE_MAX) sizeScore = clamp01(1 - (sizeRel - SIZE_MAX) / 0.35);
  else sizeScore = 1;

  // 时间：过快画不完 / 磨蹭都扣分
  const durationMs = points[count - 1].t - points[0].t;
  let timeScore: number;
  if (durationMs < TIME_MIN_MS) timeScore = clamp01(durationMs / TIME_MIN_MS);
  else if (durationMs <= TIME_MAX_MS) timeScore = 1;
  else timeScore = clamp01(1 - (durationMs - TIME_MAX_MS) / 2000);

  const rawSum = closure * 30 + roundness * 35 + smoothness * 20 + sizeScore * 10 + timeScore * 5;
  const qualityRaw = Math.max(0, Math.min(100, rawSum));

  return {
    valid: true,
    closure,
    roundness,
    smoothness,
    sizeScore,
    timeScore,
    qualityRaw: Math.round(qualityRaw * 10) / 10,
    diameter,
    sizeRel,
    centerX,
    centerY,
    durationMs,
    pointCount: count,
  };
}
