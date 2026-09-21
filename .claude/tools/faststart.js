// qt-faststart equivalent: moves 'moov' ahead of 'mdat' so playback can begin before the
// whole file has downloaded, and shifts every chunk offset (stco/co64) accordingly.
// Also drops top-level 'uuid'/'free' boxes, which browsers ignore.
// Usage: node faststart.js <in.mp4> <out.mp4>
const fs = require('fs');
const [, , inPath, outPath] = process.argv;
const buf = fs.readFileSync(inPath);

function boxes(start, end) {
  const out = [];
  let p = start;
  while (p + 8 <= end) {
    let size = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    let header = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(p + 8)); header = 16; }
    else if (size === 0) size = end - p;
    out.push({ type, start: p, size, header });
    p += size;
  }
  return out;
}

const top = boxes(0, buf.length);
const ftyp = top.find(b => b.type === 'ftyp');
const moov = top.find(b => b.type === 'moov');
const mdat = top.find(b => b.type === 'mdat');
if (!ftyp || !moov || !mdat) throw new Error('missing ftyp/moov/mdat');

const moovBuf = Buffer.from(buf.subarray(moov.start, moov.start + moov.size));
const kept = top.filter(b => !['moov', 'uuid', 'free', 'skip'].includes(b.type));

// New layout: ftyp, moov, then everything else we keep (mdat) in original order.
const layout = [ftyp, { type: 'moov' }, ...kept.filter(b => b !== ftyp)];
let pos = 0;
const newStart = new Map();
for (const b of layout) {
  const size = b.type === 'moov' ? moov.size : b.size;
  newStart.set(b.type === 'moov' ? 'moov' : b.start, pos);
  pos += size;
}
const delta = newStart.get(mdat.start) - mdat.start;

// Walk moov and patch chunk offsets.
const containers = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta']);
let patched = 0;
(function walk(start, end) {
  let p = start;
  while (p + 8 <= end) {
    const size = moovBuf.readUInt32BE(p);
    const type = moovBuf.toString('latin1', p + 4, p + 8);
    if (containers.has(type)) walk(p + 8, p + size);
    if (type === 'stco') {
      const n = moovBuf.readUInt32BE(p + 12);
      for (let i = 0; i < n; i++) {
        const o = p + 16 + i * 4;
        const v = moovBuf.readUInt32BE(o) + delta;
        if (v > 0xffffffff) throw new Error('offset overflow; would need co64');
        moovBuf.writeUInt32BE(v, o);
      }
      patched += n;
    } else if (type === 'co64') {
      const n = moovBuf.readUInt32BE(p + 12);
      for (let i = 0; i < n; i++) {
        const o = p + 16 + i * 8;
        moovBuf.writeBigUInt64BE(moovBuf.readBigUInt64BE(o) + BigInt(delta), o);
      }
      patched += n;
    }
    p += size;
  }
})(8, moovBuf.length);

const parts = layout.map(b => b.type === 'moov' ? moovBuf : buf.subarray(b.start, b.start + b.size));
fs.writeFileSync(outPath, Buffer.concat(parts));
console.log(`faststart: moved moov (${moov.size} B) ahead of mdat, shifted ${patched} chunk offsets by ${delta} B -> ${outPath}`);
