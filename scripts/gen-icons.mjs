// scripts/gen-icons.mjs —— 纯代码生成 tabBar 图标 PNG（81×81，2x 超采样抗锯齿）
// 烟圈挑战版三 tab：玩（圆环）/ 收藏（心形）/ 我的（人形）
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'miniprogram', 'assets', 'icon')
mkdirSync(outDir, { recursive: true })

const SIZE = 81
const SS = 2
const S = SIZE * SS

// ---------- 最小 PNG 编码器 ----------
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- 形状栅格化 ----------
function makeGrid() {
  return { g: new Uint8Array(S * S), set(x, y) { if (x >= 0 && y >= 0 && x < S && y < S) this.g[y * S + x] = 1 } }
}

function fillCircle(grid, cx, cy, r) {
  const CX = cx * SS, CY = cy * SS, R = r * SS
  for (let py = -Math.ceil(R); py <= Math.ceil(R); py++) {
    for (let px = -Math.ceil(R); px <= Math.ceil(R); px++) {
      if (px * px + py * py <= R * R) grid.set(CX + px, CY + py)
    }
  }
}

function clearCircle(grid, cx, cy, r) {
  const CX = cx * SS, CY = cy * SS, R = r * SS
  for (let py = -Math.ceil(R); py <= Math.ceil(R); py++) {
    for (let px = -Math.ceil(R); px <= Math.ceil(R); px++) {
      if (px * px + py * py <= R * R) {
        const gx = CX + px, gy = CY + py
        if (gx >= 0 && gy >= 0 && gx < S && gy < S) grid.g[gy * S + gx] = 0
      }
    }
  }
}

function fillRoundRect(grid, x, y, w, h, r) {
  const X = x * SS, Y = y * SS, W = w * SS, H = h * SS, R = r * SS
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const dx = px < R ? R - px : px > W - 1 - R ? px - (W - 1 - R) : 0
      const dy = py < R ? R - py : py > H - 1 - R ? py - (H - 1 - R) : 0
      if (dx * dx + dy * dy <= R * R) grid.set(X + px, Y + py)
    }
  }
}

function fillTriangle(grid, x1, y1, x2, y2, x3, y3) {
  const p = [
    [x1 * SS, y1 * SS],
    [x2 * SS, y2 * SS],
    [x3 * SS, y3 * SS],
  ]
  const sign = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  const minX = Math.floor(Math.min(...p.map((q) => q[0])))
  const maxX = Math.ceil(Math.max(...p.map((q) => q[0])))
  const minY = Math.floor(Math.min(...p.map((q) => q[1])))
  const maxY = Math.ceil(Math.max(...p.map((q) => q[1])))
  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const d1 = sign(p[0][0], p[0][1], p[1][0], p[1][1], px, py)
      const d2 = sign(p[1][0], p[1][1], p[2][0], p[2][1], px, py)
      const d3 = sign(p[2][0], p[2][1], p[0][0], p[0][1], px, py)
      const neg = d1 < 0 || d2 < 0 || d3 < 0
      const pos = d1 > 0 || d2 > 0 || d3 > 0
      if (!(neg && pos)) grid.set(px, py)
    }
  }
}

// ---------- 图标定义（81 坐标系） ----------
const icons = {
  play: (g) => {
    fillCircle(g, 40.5, 40.5, 26)
    clearCircle(g, 40.5, 40.5, 17) // 圆环
  },
  collection: (g) => {
    fillCircle(g, 29, 33, 13)
    fillCircle(g, 52, 33, 13)
    fillTriangle(g, 17, 40, 64, 40, 40.5, 68) // 心形
  },
  profile: (g) => {
    fillCircle(g, 40.5, 27, 13)
    fillRoundRect(g, 18, 46, 45, 22, 11) // 肩部
  },
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function render(design, colorHex) {
  const grid = makeGrid()
  design(grid)
  const [r, gc, b] = hexToRgb(colorHex)
  const rgba = Buffer.alloc(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let cov = 0
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) cov += grid.g[(y * SS + sy) * S + x * SS + sx]
      const a = Math.round((cov / (SS * SS)) * 255)
      const o = (y * SIZE + x) * 4
      rgba[o] = r
      rgba[o + 1] = gc
      rgba[o + 2] = b
      rgba[o + 3] = a
    }
  }
  return encodePNG(SIZE, SIZE, rgba)
}

for (const [name, design] of Object.entries(icons)) {
  writeFileSync(join(outDir, `${name}.png`), render(design, '#5C6468'))
  writeFileSync(join(outDir, `${name}-active.png`), render(design, '#75F4D2'))
}

console.log('✅ 图标已生成到', outDir)
