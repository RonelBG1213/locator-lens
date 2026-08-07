/**
 * Derives assets/icons/icon-{16,32,48,128}.png from assets/icons/icon-master.png.
 *
 * One master, four outputs, so the toolbar icon and the store icon can never
 * drift apart — the usual failure is re-exporting one size and forgetting the
 * others. Replace the master and re-run:  npm run icons
 *
 * No image dependency: PNG is inflate + unfilter on node:zlib, the resample is a
 * box filter in premultiplied alpha (averaging straight alpha halos the edges of
 * a mark on transparency), and the encoder is ~40 lines. Cheaper than carrying
 * sharp or a canvas for four files that change roughly never.
 *
 * Handles 8-bit colour types 6 (RGBA), 2 (RGB) and 0 (grey) — which is what any
 * design tool exports. Anything else fails loudly rather than writing a wrong
 * picture.
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const icons = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/icons');
const master = resolve(icons, 'icon-master.png');
const SIZES = [16, 32, 48, 128];

if (!existsSync(master)) throw new Error(`Missing ${master}. Put a square PNG (128px or larger) there.`);

// ---------------------------------------------------------------- decode

const CHANNELS = { 0: 1, 2: 3, 6: 4 };

/** @returns {{ size: number, rgba: Buffer }} */
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG.');

  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];

  for (let p = 8; p < buf.length; ) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error(`Unsupported bit depth ${data[8]}; export the master at 8 bits.`);
      if (data[12] !== 0) throw new Error('Interlaced PNG; re-export without Adam7 interlacing.');
      channels = CHANNELS[data[9]];
      if (!channels) throw new Error(`Unsupported colour type ${data[9]}; export as RGBA, RGB or greyscale.`);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (width !== height) throw new Error(`Master is ${width}x${height}; it must be square.`);

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = channels;
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);

  // Undo the per-scanline filter. Each byte is predicted from its left (a),
  // above (b) and above-left (c) neighbours in the *reconstructed* image.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[y * stride + i - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = i >= bpp && y > 0 ? out[(y - 1) * stride + i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`Unknown scanline filter ${filter}.`);
      out[y * stride + i] = v & 0xff;
    }
  }

  // Normalise to RGBA so the resampler only has one shape to think about.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * bpp;
    const d = i * 4;
    if (bpp === 4) out.copy(rgba, d, s, s + 4);
    else if (bpp === 3) {
      out.copy(rgba, d, s, s + 3);
      rgba[d + 3] = 255;
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = out[s];
      rgba[d + 3] = 255;
    }
  }
  return { size: width, rgba };
}

// ---------------------------------------------------------------- resample

/** Box downsample, averaged in premultiplied alpha. */
function resize(src, from, to) {
  if (to > from) throw new Error(`Master is ${from}px; it must be at least ${to}px so no size is upscaled.`);
  const dst = Buffer.alloc(to * to * 4);
  const scale = from / to;
  for (let y = 0; y < to; y++) {
    const y0 = Math.floor(y * scale);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * scale));
    for (let x = 0; x < to; x++) {
      const x0 = Math.floor(x * scale);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * scale));
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;
      for (let sy = y0; sy < y1; sy++)
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * from + sx) * 4;
          const f = src[i + 3] / 255;
          r += src[i] * f;
          g += src[i + 1] * f;
          b += src[i + 2] * f;
          a += src[i + 3];
          n++;
        }
      const d = (y * to + x) * 4;
      const alpha = a / n;
      if (alpha > 0) {
        const unmul = 255 / a; // undo premultiplication: (sum/n) / (alpha/255)
        dst[d] = Math.round(Math.min(255, r * unmul));
        dst[d + 1] = Math.round(Math.min(255, g * unmul));
        dst[d + 2] = Math.round(Math.min(255, b * unmul));
      }
      dst[d + 3] = Math.round(alpha);
    }
  }
  return dst;
}

// ---------------------------------------------------------------- encode

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: truecolour with alpha
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- run

const { size: masterSize, rgba } = decodePng(readFileSync(master));
console.log(`master: ${masterSize}x${masterSize}`);
for (const size of SIZES) {
  const px = size === masterSize ? rgba : resize(rgba, masterSize, size);
  writeFileSync(resolve(icons, `icon-${size}.png`), encodePng(size, px));
  console.log(`wrote icon-${size}.png`);
}
console.log(`icons -> ${icons}  (icon-128.png doubles as the 128x128 store icon)`);
