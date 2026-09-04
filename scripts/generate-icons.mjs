// Generates Cyclo PWA icons as PNGs using only Node built-ins (zlib).
// Design: dark navy rounded field + a warm gold "C" ring (open on the right),
// echoing the "cycle / renewal" idea. Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public')
mkdirSync(outDir, { recursive: true })

const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

// palette
const NAVY = [14, 20, 32] // #0E1420
const NAVY_HI = [26, 34, 51] // subtle radial lift
const GOLD = [240, 179, 75] // #F0B34B
const ORANGE = [230, 126, 34] // #E67E22

function drawIcon(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  // ring geometry; tighter for maskable so it survives the safe-zone crop
  const pad = maskable ? 0.30 : 0.16
  const outerR = size * (0.5 - pad)
  const ringW = size * (maskable ? 0.085 : 0.10)
  const innerR = outerR - ringW
  const corner = size * 0.235 // rounded-field radius
  const gapHalf = 0.42 // radians of the "C" opening on the right side

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5
      const py = y + 0.5
      let r = [0, 0, 0]
      let a = 0

      // rounded rectangle field (full-bleed for maskable)
      const dxc = Math.abs(px - cx)
      const dyc = Math.abs(py - cy)
      const half = size / 2
      const rx = dxc - (half - corner)
      const ry = dyc - (half - corner)
      let inField
      if (rx <= 0 || ry <= 0) inField = true
      else inField = rx * rx + ry * ry <= corner * corner
      if (inField) {
        const distC = Math.hypot(px - cx, py - cy) / (size * 0.7)
        r = mix(NAVY_HI, NAVY, Math.min(1, distC))
        a = 255
      }

      // gold "C" ring
      const dx = px - cx
      const dy = py - cy
      const dist = Math.hypot(dx, dy)
      if (dist >= innerR && dist <= outerR) {
        const ang = Math.atan2(dy, dx) // -pi..pi, 0 = +x (right)
        if (Math.abs(ang) > gapHalf) {
          // shade the ring around its sweep for a premium gradient
          const t = (ang + Math.PI) / (2 * Math.PI)
          const g = mix(GOLD, ORANGE, Math.abs(Math.sin(t * Math.PI)))
          // soft edge on the inner/outer boundary
          const edge = Math.min(dist - innerR, outerR - dist)
          const soft = Math.max(0, Math.min(1, edge / (size * 0.012)))
          r = mix(r, g, soft)
          a = 255
        }
      }

      // small rounded cap (arrow-ish dot) at the top of the opening
      const capX = cx + Math.cos(-gapHalf) * (innerR + ringW / 2)
      const capY = cy + Math.sin(-gapHalf) * (innerR + ringW / 2)
      if (Math.hypot(px - capX, py - capY) <= ringW * 0.62) {
        r = GOLD
        a = 255
      }

      const i = (y * size + x) * 4
      rgba[i] = r[0]
      rgba[i + 1] = r[1]
      rgba[i + 2] = r[2]
      rgba[i + 3] = a
    }
  }
  return encodePng(size, size, rgba)
}

writeFileSync(join(outDir, 'icon-192.png'), drawIcon(192, { maskable: false }))
writeFileSync(join(outDir, 'icon-512.png'), drawIcon(512, { maskable: false }))
writeFileSync(join(outDir, 'icon-maskable-512.png'), drawIcon(512, { maskable: true }))
writeFileSync(join(outDir, 'apple-touch-icon.png'), drawIcon(180, { maskable: false }))
console.log('Wrote icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png to public/')
