// scripts/gen-sounds.mjs —— 用代码合成音效 WAV（22050Hz 单声道 16bit），输出到 miniprogram/assets/snd/
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'miniprogram', 'assets', 'snd')
mkdirSync(outDir, { recursive: true })

const RATE = 22050

function wav(samples) {
  const n = samples.length
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + n * 2, 4)
  b.write('WAVE', 8)
  b.write('fmt ', 12)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20)
  b.writeUInt16LE(1, 22)
  b.writeUInt32LE(RATE, 24)
  b.writeUInt32LE(RATE * 2, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    b.writeInt16LE(Math.round(s * 32767), 44 + i * 2)
  }
  return b
}

const sec = (s) => Math.round(s * RATE)
const noise = () => Math.random() * 2 - 1

/** 一阶低通让噪声变"风声" */
function lowpass(samples, k) {
  let y = 0
  return samples.map((x) => {
    y += k * (x - y)
    return y
  })
}

// 1. 点火：两声短促的火石咔哒
{
  const n = sec(0.22)
  const s = new Array(n).fill(0)
  const burst = (at, len, amp) => {
    for (let i = 0; i < len; i++) {
      const env = 1 - i / len
      s[at + i] += noise() * amp * env
    }
  }
  burst(sec(0.03), sec(0.012), 0.75)
  burst(sec(0.13), sec(0.02), 0.9)
  writeFileSync(join(outDir, 'light.wav'), wav(s))
}

// 2. 吸入：渐强的风声
{
  const n = sec(0.8)
  const raw = Array.from({ length: n }, () => noise())
  const lp = lowpass(raw, 0.18)
  const s = lp.map((v, i) => {
    const t = i / n
    return v * 0.55 * Math.pow(t, 1.4) * (1 + 0.15 * Math.sin(2 * Math.PI * 9 * t))
  })
  writeFileSync(join(outDir, 'inhale.wav'), wav(s))
}

// 3. 吐雾：中间鼓起的绵长雾声
{
  const n = sec(1.1)
  const raw = Array.from({ length: n }, () => noise())
  const lp = lowpass(raw, 0.09)
  const s = lp.map((v, i) => {
    const t = i / n
    return v * 0.6 * Math.pow(Math.sin(Math.PI * t), 1.2)
  })
  writeFileSync(join(outDir, 'exhale.wav'), wav(s))
}

// 4. 得分：三音上行琶音
{
  const notes = [659.25, 783.99, 1046.5]
  const n = sec(0.55)
  const s = new Array(n).fill(0)
  notes.forEach((f, idx) => {
    const start = sec(idx * 0.13)
    const len = sec(0.22)
    for (let i = 0; i < len && start + i < n; i++) {
      const t = i / RATE
      const env = Math.exp(-6 * t)
      s[start + i] +=
        (Math.sin(2 * Math.PI * f * t) * 0.5 + Math.sin(2 * Math.PI * f * 2 * t) * 0.18) * env * 0.6
    }
  })
  writeFileSync(join(outDir, 'score.wav'), wav(s))
}

// 5. PERFECT：更亮的四音琶音（高八度闪烁感）
{
  const notes = [783.99, 987.77, 1318.5, 1760]
  const n = sec(0.62)
  const s = new Array(n).fill(0)
  notes.forEach((f, idx) => {
    const start = sec(idx * 0.09)
    const len = sec(0.26)
    for (let i = 0; i < len && start + i < n; i++) {
      const t = i / RATE
      const env = Math.exp(-5 * t)
      s[start + i] +=
        (Math.sin(2 * Math.PI * f * t) * 0.45 + Math.sin(2 * Math.PI * f * 3 * t) * 0.12) * env * 0.55
    }
  })
  writeFileSync(join(outDir, 'perfect.wav'), wav(s))
}

console.log('✅ 音效已生成到', outDir)
