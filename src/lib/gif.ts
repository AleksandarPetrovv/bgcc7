const skipSubBlocks = (b: Uint8Array, i: number) => {
  while (i < b.length && b[i] !== 0) i += b[i] + 1;
  return i + 1;
};

// still avatars: keep everything up to the end of the first image, then close the file
export function firstFrame(b: Uint8Array) {
  if (b.length < 13 || String.fromCharCode(...b.subarray(0, 3)) !== "GIF") return b;
  let i = 13;
  if (b[10] & 0x80) i += 3 * (1 << ((b[10] & 7) + 1));
  while (i < b.length) {
    const t = b[i];
    if (t === 0x21) i = skipSubBlocks(b, i + 2);
    else if (t === 0x2c) {
      const packed = b[i + 9];
      i += 10;
      if (packed & 0x80) i += 3 * (1 << ((packed & 7) + 1));
      i = skipSubBlocks(b, i + 1);
      if (i > b.length) return b;
      const out = new Uint8Array(i + 1);
      out.set(b.subarray(0, i));
      out[i] = 0x3b;
      return out;
    } else return b;
  }
  return b;
}

// Safari flashes the page background on loop when the last frame disposes to background; keep its pixels instead.
export function keepLastFrame(b: Uint8Array) {
  if (b.length < 13 || String.fromCharCode(...b.subarray(0, 3)) !== "GIF") return b;
  let i = 13;
  if (b[10] & 0x80) i += 3 * (1 << ((b[10] & 7) + 1));
  let last = -1;
  while (i < b.length) {
    const t = b[i];
    if (t === 0x3b) break;
    if (t === 0x21) {
      if (b[i + 1] === 0xf9 && b[i + 2] === 4) last = i + 3;
      i = skipSubBlocks(b, i + 2);
    } else if (t === 0x2c) {
      const packed = b[i + 9];
      i += 10;
      if (packed & 0x80) i += 3 * (1 << ((packed & 7) + 1));
      i = skipSubBlocks(b, i + 1);
    } else return b;
  }
  if (last < 0 || ((b[last] >> 2) & 7) !== 2) return b;
  const out = b.slice();
  out[last] = (out[last] & ~0x1c) | (1 << 2);
  return out;
}
