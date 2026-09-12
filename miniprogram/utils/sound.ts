// utils/sound.ts —— 轻量音效播放（wav 由 scripts/gen-sounds.mjs 合成）
type SoundName = 'light' | 'inhale' | 'exhale' | 'reward' | 'cough';

const ctxs: Partial<Record<SoundName, WechatMiniprogram.InnerAudioContext>> = {};

/** 播放音效；soundOn 关闭时静默 */
export function playSound(name: SoundName, soundOn: boolean): void {
  if (!soundOn) return;
  try {
    let ctx = ctxs[name];
    if (!ctx) {
      ctx = wx.createInnerAudioContext();
      ctx.src = `/assets/snd/${name}.wav`;
      ctx.volume = 0.6;
      ctxs[name] = ctx;
    }
    ctx.stop();
    ctx.play();
  } catch (e) {
    // 音频失败不影响玩法
  }
}
