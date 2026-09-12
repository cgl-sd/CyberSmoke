// utils/sound.ts —— 轻量音效（wav 由 scripts/gen-sounds.mjs 合成）
// V1 必备：点火 / 吸入 / 吐雾 / 得分 / PERFECT（规格 §33）
type SoundName = 'light' | 'inhale' | 'exhale' | 'score' | 'perfect';

const ctxs: Partial<Record<SoundName, WechatMiniprogram.InnerAudioContext>> = {};

export function playSound(name: SoundName, soundOn: boolean): void {
  if (!soundOn) return;
  try {
    let ctx = ctxs[name];
    if (!ctx) {
      ctx = wx.createInnerAudioContext();
      ctx.src = `/assets/snd/${name}.wav`;
      ctx.volume = name === 'score' ? 0.5 : 0.6;
      ctxs[name] = ctx;
    }
    ctx.stop();
    ctx.play();
  } catch (e) {
    // 音频失败不影响玩法
  }
}

/** PERFECT 的双短震（规格 §34） */
export function perfectHaptic(): void {
  try {
    wx.vibrateShort({ type: 'light' });
    setTimeout(() => {
      wx.vibrateShort({ type: 'light' });
    }, 120);
  } catch (e) {
    // 忽略
  }
}
