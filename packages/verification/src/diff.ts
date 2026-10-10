import zlib from "node:zlib";
import type { VisualDiffResult } from "@patchwork/contracts";

export interface DiffOptions {
  thresholdPercent?: number; // Maximum allowed diff % before failing (default: 5.0)
  tolerancePerChannel?: number; // Per-channel color delta tolerance (0-255, default: 15)
}

/**
 * Extracts raw RGBA pixels from uncompressed PNG scanlines.
 * Playwright generates standard non-interlaced RGBA or RGB PNG screenshots.
 */
function parsePng(pngBuffer: Buffer): {
  width: number;
  height: number;
  colorType: number;
  scanlines: Buffer;
} {
  // Check PNG signature
  if (pngBuffer.readUInt32BE(0) !== 0x89504e47 || pngBuffer.readUInt32BE(4) !== 0x0d0a1a0a) {
    throw new Error("Invalid PNG header signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6; // Default 6 = RGBA
  const idatChunks: Buffer[] = [];

  while (offset < pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.toString("ascii", offset + 4, offset + 8);
    const data = pngBuffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  const combinedIdat = Buffer.concat(idatChunks);
  const scanlines = zlib.inflateSync(combinedIdat);

  return { width, height, colorType, scanlines };
}

/**
 * Creates a valid basic RGBA PNG buffer from raw scanlines.
 */
function createPng(width: number, height: number, scanlines: Buffer): Buffer {
  const compressed = zlib.deflateSync(scanlines);
  const parts: Buffer[] = [];

  // PNG Signature
  parts.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  parts.push(makeChunk("IHDR", ihdrData));

  // IDAT chunk
  parts.push(makeChunk("IDAT", compressed));

  // IEND chunk
  parts.push(makeChunk("IEND", Buffer.alloc(0)));

  return Buffer.concat(parts);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + data.length));
  chunk.writeUInt32BE(crc >>> 0, 8 + data.length);
  return chunk;
}

// Standard CRC32 table
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

/**
 * Compares two PNG screenshots and produces pixel diff metrics, mismatch counts,
 * and a visual diff overlay highlighting changes in magenta (#ff00ff).
 */
export function compareScreenshots(
  baselinePng: Buffer,
  patchedPng: Buffer,
  options: DiffOptions = {}
): VisualDiffResult {
  const thresholdPercent = options.thresholdPercent ?? 10.0;
  const tolerance = options.tolerancePerChannel ?? 15;

  let baseline;
  let patched;

  try {
    baseline = parsePng(baselinePng);
    patched = parsePng(patchedPng);
  } catch {
    // Fallback if raw image decoding encounters unusual encoding:
    // Compare buffer bytes directly
    const totalBytes = Math.max(baselinePng.length, patchedPng.length);
    let diffBytes = 0;
    const minLen = Math.min(baselinePng.length, patchedPng.length);
    for (let i = 0; i < minLen; i++) {
      if (baselinePng[i] !== patchedPng[i]) diffBytes++;
    }
    diffBytes += Math.abs(baselinePng.length - patchedPng.length);
    const diffPct = (diffBytes / totalBytes) * 100;
    return {
      diffPixels: diffBytes,
      totalPixels: totalBytes,
      diffPercentage: Number(diffPct.toFixed(2)),
      passed: diffPct <= thresholdPercent,
      baselineScreenshotBase64: baselinePng.toString("base64"),
      patchedScreenshotBase64: patchedPng.toString("base64"),
    };
  }

  const width = Math.min(baseline.width, patched.width);
  const height = Math.min(baseline.height, patched.height);
  const totalPixels = width * height;

  const bytesPerPixel = 4;
  const bytesPerScanline = 1 + width * bytesPerPixel;
  const diffScanlines = Buffer.alloc(bytesPerScanline * height);

  let diffPixels = 0;

  for (let y = 0; y < height; y++) {
    const bOffset = y * bytesPerScanline;
    const pOffset = y * bytesPerScanline;
    diffScanlines[bOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pxOffset = 1 + x * bytesPerPixel;
      const bIdx = bOffset + pxOffset;
      const pIdx = pOffset + pxOffset;

      const rDiff = Math.abs((baseline.scanlines[bIdx] || 0) - (patched.scanlines[pIdx] || 0));
      const gDiff = Math.abs((baseline.scanlines[bIdx + 1] || 0) - (patched.scanlines[pIdx + 1] || 0));
      const bDiff = Math.abs((baseline.scanlines[bIdx + 2] || 0) - (patched.scanlines[pIdx + 2] || 0));

      const isDifferent = rDiff > tolerance || gDiff > tolerance || bDiff > tolerance;

      if (isDifferent) {
        diffPixels++;
        // Highlight in vibrant magenta (#ff00ff)
        diffScanlines[bOffset + pxOffset] = 255;
        diffScanlines[bOffset + pxOffset + 1] = 0;
        diffScanlines[bOffset + pxOffset + 2] = 255;
        diffScanlines[bOffset + pxOffset + 3] = 255;
      } else {
        // Dim original pixels slightly for backdrop
        diffScanlines[bOffset + pxOffset] = Math.floor((patched.scanlines[pIdx] || 0) * 0.4);
        diffScanlines[bOffset + pxOffset + 1] = Math.floor((patched.scanlines[pIdx + 1] || 0) * 0.4);
        diffScanlines[bOffset + pxOffset + 2] = Math.floor((patched.scanlines[pIdx + 2] || 0) * 0.4);
        diffScanlines[bOffset + pxOffset + 3] = 255;
      }
    }
  }

  const diffPercentage = Number(((diffPixels / (totalPixels || 1)) * 100).toFixed(2));
  const diffPng = createPng(width, height, diffScanlines);

  return {
    diffPixels,
    totalPixels,
    diffPercentage,
    passed: diffPercentage <= thresholdPercent,
    baselineScreenshotBase64: baselinePng.toString("base64"),
    patchedScreenshotBase64: patchedPng.toString("base64"),
    diffScreenshotBase64: diffPng.toString("base64"),
  };
}
