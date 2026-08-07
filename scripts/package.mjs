/**
 * Zips dist/ into release/locator-lens-<version>.zip for the Chrome Web Store.
 *
 *   npm run package
 *
 * Why not Compress-Archive: Windows PowerShell 5.1 writes subdirectory entries
 * with a BACKSLASH separator (`icons\icon-16.png`), which the ZIP spec forbids —
 * every path must use `/`. Chrome then cannot resolve `icons/icon-16.png` from
 * the manifest and the upload fails on a missing icon, with nothing in the error
 * pointing at the archiver. This writes the entries by hand so the separator is
 * correct on every platform.
 *
 * Also enforces the two rules the store cares about structurally: manifest.json
 * sits at the archive root (not under a `dist/` folder), and every file the
 * manifest references is actually present.
 */
import { deflateRawSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const releases = resolve(root, 'release');

if (!existsSync(resolve(dist, 'manifest.json')))
  throw new Error('No dist/manifest.json. Run `npm run build` first.');

const manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.json'), 'utf8'));

/** Every file under dist/, as archive-relative paths with `/` separators. */
function walk(dir, prefix = '') {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    const name = prefix ? `${prefix}/${entry}` : entry;
    return statSync(full).isDirectory() ? walk(full, name) : [name];
  });
}

const files = walk(dist).sort();

// A manifest that names a file the package does not contain is rejected at
// upload with a message that does not say which file. Catch it here instead.
const referenced = [
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
].filter(Boolean);

for (const ref of referenced)
  if (!files.includes(ref)) throw new Error(`manifest.json references ${ref}, which is not in dist/.`);

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

/** MS-DOS date/time. Fixed, so the same dist/ always zips byte-identically. */
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const local = [];
const central = [];
let offset = 0;

for (const name of files) {
  const raw = readFileSync(resolve(dist, name));
  const deflated = deflateRawSync(raw, { level: 9 });
  // Storing beats deflating when deflate grew the file — true for a PNG.
  const stored = deflated.length >= raw.length;
  const body = stored ? raw : deflated;
  const method = stored ? 0 : 8;
  const nameBuf = Buffer.from(name, 'utf8');
  const crc = crc32(raw);

  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4); // version needed
  header.writeUInt16LE(0, 6); // flags
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(body.length, 18);
  header.writeUInt32LE(raw.length, 22);
  header.writeUInt16LE(nameBuf.length, 26);
  local.push(header, nameBuf, body);

  const dirEntry = Buffer.alloc(46);
  dirEntry.writeUInt32LE(0x02014b50, 0);
  dirEntry.writeUInt16LE(20, 4); // version made by
  dirEntry.writeUInt16LE(20, 6); // version needed
  dirEntry.writeUInt16LE(0, 8); // flags
  dirEntry.writeUInt16LE(method, 10);
  dirEntry.writeUInt16LE(DOS_TIME, 12);
  dirEntry.writeUInt16LE(DOS_DATE, 14);
  dirEntry.writeUInt32LE(crc, 16);
  dirEntry.writeUInt32LE(body.length, 20);
  dirEntry.writeUInt32LE(raw.length, 24);
  dirEntry.writeUInt16LE(nameBuf.length, 28);
  dirEntry.writeUInt32LE(0o644 << 16, 38); // external attrs: regular file, rw-r--r--
  dirEntry.writeUInt32LE(offset, 42);
  central.push(dirEntry, nameBuf);

  offset += header.length + nameBuf.length + body.length;
}

const cd = Buffer.concat(central);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(cd.length, 12);
eocd.writeUInt32LE(offset, 16);

mkdirSync(releases, { recursive: true });
const out = resolve(releases, `locator-lens-${manifest.version}.zip`);
writeFileSync(out, Buffer.concat([...local, cd, eocd]));

console.log(`${files.length} files, ${(statSync(out).size / 1024).toFixed(0)} KB`);
for (const name of files) console.log(`  ${name}`);
console.log(`\npackage -> ${out}`);
