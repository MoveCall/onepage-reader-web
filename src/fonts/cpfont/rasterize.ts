import { FT, type Face, type FreeType, type LoadedGlyph } from '@zkl2333/freetype-wasm';
import type { FontStyleId, RasterGlyph, RasterStyle, UnicodeInterval } from './types';

const MAX_CODE_POINT = 0x10ffff;

function glyphContext(styleId: FontStyleId, codePoint: number): string {
  return `Style ${styleId} U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
}

function assertIntegerRange(
  value: number,
  min: number,
  max: number,
  label: string,
  context: string,
): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${context}: ${label} must be an integer from ${min} to ${max}`);
  }
}

function validateIntervals(intervals: readonly UnicodeInterval[]): void {
  let previousEnd = -1;
  for (const [start, end] of intervals) {
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end > MAX_CODE_POINT ||
      start > end
    ) {
      throw new Error('Rasterization intervals must contain valid Unicode ranges');
    }
    if (start <= previousEnd) {
      throw new Error('Rasterization intervals must be sorted and not overlap');
    }
    previousEnd = end;
  }
}

function normalizeGrayBitmap(glyph: LoadedGlyph, context: string): Uint8Array {
  assertIntegerRange(glyph.width, 0, 0xff, 'bitmap width', context);
  assertIntegerRange(glyph.rows, 0, 0xff, 'bitmap height', context);

  const packedLength = Math.ceil((glyph.width * glyph.rows) / 4);
  assertIntegerRange(packedLength, 0, 0xffff, 'packed bitmap length', context);
  if (!(glyph.buffer instanceof Uint8Array)) {
    throw new Error(`${context}: bitmap buffer must be a Uint8Array`);
  }
  if (!Number.isSafeInteger(glyph.pitch)) {
    throw new Error(`${context}: bitmap pitch must be an integer`);
  }
  if (glyph.width === 0 || glyph.rows === 0) return new Uint8Array();
  if (glyph.pixelMode !== FT.PIXEL_MODE_GRAY) {
    throw new Error(`${context}: bitmap pixel mode must be FT_PIXEL_MODE_GRAY`);
  }

  const absolutePitch = Math.abs(glyph.pitch);
  if (absolutePitch < glyph.width) {
    throw new Error(`${context}: bitmap pitch is narrower than its width`);
  }
  const requiredLength = (glyph.rows - 1) * absolutePitch + glyph.width;
  if (glyph.buffer.length < requiredLength) {
    throw new Error(`${context}: bitmap buffer does not cover all rows`);
  }

  const bitmap = new Uint8Array(glyph.width * glyph.rows);
  for (let y = 0; y < glyph.rows; y += 1) {
    const sourceOffset = glyph.pitch < 0
      ? (glyph.rows - 1 - y) * absolutePitch
      : y * absolutePitch;
    bitmap.set(
      glyph.buffer.subarray(sourceOffset, sourceOffset + glyph.width),
      y * glyph.width,
    );
  }
  return bitmap;
}

function readLinearAdvance(ft: FreeType, face: Face): number {
  const faceRecord = ft.offsets.FT_FaceRec;
  const slotRecord = ft.offsets.FT_GlyphSlotRec;
  const slot = ft.module.getValue(face.ptr + faceRecord.glyph, 'i32');
  return ft.module.getValue(slot + slotRecord.linearHoriAdvance, 'i32');
}

function readLineMetrics(
  ft: FreeType,
  face: Face,
  styleId: FontStyleId,
): Pick<RasterStyle, 'advanceY' | 'ascender' | 'descender'> {
  const faceWithMetrics = face as Face & {
    sizeMetrics?: () => { height: number; ascender: number; descender: number };
  };
  let metrics: { height: number; ascender: number; descender: number };

  if (typeof faceWithMetrics.sizeMetrics === 'function') {
    metrics = faceWithMetrics.sizeMetrics();
  } else {
    const faceRecord = ft.offsets.FT_FaceRec;
    const sizeRecord = ft.offsets.FT_SizeRec;
    const sizeMetrics = ft.offsets.FT_Size_Metrics;
    const size = ft.module.getValue(face.ptr + faceRecord.size, 'i32');
    if (!size) throw new Error(`Style ${styleId}: FreeType face has no active size`);
    const metricsAddress = size + sizeRecord.metrics;
    metrics = {
      height: ft.module.getValue(metricsAddress + sizeMetrics.height, 'i32'),
      ascender: ft.module.getValue(metricsAddress + sizeMetrics.ascender, 'i32'),
      descender: ft.module.getValue(metricsAddress + sizeMetrics.descender, 'i32'),
    };
  }

  const advanceY = Math.ceil(metrics.height / 64);
  const ascender = Math.ceil(metrics.ascender / 64);
  const descender = Math.floor(metrics.descender / 64);

  assertIntegerRange(advanceY, 0, 0xff, 'advanceY', `Style ${styleId}`);
  assertIntegerRange(ascender, -0x8000, 0x7fff, 'ascender', `Style ${styleId}`);
  assertIntegerRange(descender, -0x8000, 0x7fff, 'descender', `Style ${styleId}`);
  return { advanceY, ascender, descender };
}

function renderGlyph(
  ft: FreeType,
  face: Face,
  glyphIndex: number,
  codePoint: number,
  styleId: FontStyleId,
): RasterGlyph {
  const context = glyphContext(styleId, codePoint);
  let loaded: LoadedGlyph;
  try {
    loaded = face.loadGlyph({
      index: glyphIndex,
      flags: FT.LOAD_RENDER | FT.LOAD_NO_BITMAP,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}: ${message}`);
  }

  const bitmap = normalizeGrayBitmap(loaded, context);
  const advanceX = (readLinearAdvance(ft, face) + (1 << 11)) >> 12;
  assertIntegerRange(advanceX, 0, 0xffff, 'advanceX', context);
  assertIntegerRange(loaded.bitmapLeft, -0x8000, 0x7fff, 'bitmap left', context);
  assertIntegerRange(loaded.bitmapTop, -0x8000, 0x7fff, 'bitmap top', context);

  return {
    codePoint,
    width: loaded.width,
    height: loaded.rows,
    advanceX,
    left: loaded.bitmapLeft,
    top: loaded.bitmapTop,
    bitmap,
  };
}

export function rasterizeStyle(
  ft: FreeType,
  primary: Face,
  fallbacks: readonly Face[],
  size: number,
  intervals: readonly UnicodeInterval[],
  styleId: FontStyleId,
): RasterStyle {
  if (!Number.isInteger(size) || size < 1 || size > 0x1ffffff) {
    throw new Error('Font size must be a positive integer supported by FreeType');
  }
  assertIntegerRange(styleId, 0, 3, 'style ID', 'Rasterization');
  validateIntervals(intervals);

  const faces = [primary, ...fallbacks];
  const charSize = size << 6;
  for (const face of faces) face.setCharSize(charSize, charSize, 150, 150);

  const outputIntervals: UnicodeInterval[] = [];
  const glyphs: RasterGlyph[] = [];
  for (const [start, end] of intervals) {
    let outputStart: number | undefined;
    let outputEnd: number | undefined;
    for (let codePoint = start; codePoint <= end; codePoint += 1) {
      let owner: Face | undefined;
      let glyphIndex = 0;
      for (const face of faces) {
        glyphIndex = face.charIndex(codePoint);
        if (glyphIndex > 0) {
          owner = face;
          break;
        }
      }

      if (!owner) {
        if (outputStart !== undefined && outputEnd !== undefined) {
          outputIntervals.push([outputStart, outputEnd]);
          outputStart = undefined;
          outputEnd = undefined;
        }
        continue;
      }

      glyphs.push(renderGlyph(ft, owner, glyphIndex, codePoint, styleId));
      outputStart ??= codePoint;
      outputEnd = codePoint;
    }
    if (outputStart !== undefined && outputEnd !== undefined) {
      outputIntervals.push([outputStart, outputEnd]);
    }
  }

  return {
    styleId,
    intervals: outputIntervals,
    glyphs,
    ...readLineMetrics(ft, primary, styleId),
  };
}
