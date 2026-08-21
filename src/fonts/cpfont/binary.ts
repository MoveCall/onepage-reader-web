import type { RasterStyle } from './types';

export const CPFONT_VERSION = 4;
export const CPFONT_HEADER_SIZE = 32;
export const CPFONT_STYLE_TOC_SIZE = 32;
export const CPFONT_GLYPH_SIZE = 16;

const INTERVAL_SIZE = 12;
const MAX_CODE_POINT = 0x10ffff;
const MAX_UINT32 = 0xffffffff;
const MAGIC = new Uint8Array([67, 80, 70, 79, 78, 84, 0, 0]);

function assertIntegerRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}`);
  }
}

function checkedSize(label: string, ...parts: number[]): number {
  const total = parts.reduce((sum, part) => sum + part, 0);
  if (!Number.isSafeInteger(total) || total > MAX_UINT32) {
    throw new Error(`${label} exceeds 32-bit offset arithmetic`);
  }
  return total;
}

function assertZeroBytes(bytes: Uint8Array, start: number, end: number, label: string): void {
  for (let offset = start; offset < end; offset += 1) {
    if (bytes[offset] !== 0) throw new Error(`${label} bytes must be zero`);
  }
}

export function quantizeGrayTo2Bit(
  buffer: Uint8Array,
  width: number,
  rows: number,
  pitch: number,
): Uint8Array {
  if (!Number.isSafeInteger(width) || width < 0) {
    throw new Error('Bitmap width must be a nonnegative integer');
  }
  if (!Number.isSafeInteger(rows) || rows < 0) {
    throw new Error('Bitmap rows must be a nonnegative integer');
  }
  if (!Number.isSafeInteger(pitch)) throw new Error('Bitmap pitch must be an integer');
  if (width === 0 || rows === 0) return new Uint8Array();

  const absolutePitch = Math.abs(pitch);
  if (absolutePitch < width) throw new Error('Bitmap pitch must be at least the width');
  const requiredBufferLength = (rows - 1) * absolutePitch + width;
  if (!Number.isSafeInteger(requiredBufferLength) || buffer.length < requiredBufferLength) {
    throw new Error('Bitmap buffer does not cover all addressed pixels');
  }

  const packed = new Uint8Array(Math.ceil((width * rows) / 4));
  let pixelIndex = 0;

  for (let y = 0; y < rows; y += 1) {
    const rowOffset = pitch < 0 ? (rows - 1 - y) * absolutePitch : y * absolutePitch;
    for (let x = 0; x < width; x += 1) {
      const value = buffer[rowOffset + x] >> 6;
      packed[pixelIndex >> 2] |= value << (6 - (pixelIndex & 3) * 2);
      pixelIndex += 1;
    }
  }

  return packed;
}

interface PlannedStyle {
  style: RasterStyle;
  packedLengths: number[];
  bitmapLength: number;
  sectionLength: number;
  dataOffset: number;
}

interface PackedStyle extends PlannedStyle {
  bitmaps: Uint8Array[];
}

function validateStyles(styles: RasterStyle[]): void {
  if (styles.length < 1 || styles.length > 4) {
    throw new Error('A cpfont must contain one to four styles');
  }

  const styleIds = new Set<number>();
  let fixedFileLength = checkedSize(
    'Header and TOC size',
    CPFONT_HEADER_SIZE,
    styles.length * CPFONT_STYLE_TOC_SIZE,
  );

  for (const style of styles) {
    assertIntegerRange(style.styleId, 0, 3, 'Style ID');
    if (styleIds.has(style.styleId)) throw new Error('Style IDs must be unique');
    styleIds.add(style.styleId);

    assertIntegerRange(style.intervals.length, 0, MAX_UINT32, 'Interval count');
    assertIntegerRange(style.glyphs.length, 0, MAX_UINT32, 'Glyph count');
    fixedFileLength = checkedSize(
      'Fixed sections size',
      fixedFileLength,
      style.intervals.length * INTERVAL_SIZE,
      style.glyphs.length * CPFONT_GLYPH_SIZE,
    );
  }

  for (const style of styles) {
    assertIntegerRange(style.advanceY, 0, 0xff, 'advanceY');
    assertIntegerRange(style.ascender, -0x8000, 0x7fff, 'ascender');
    assertIntegerRange(style.descender, -0x8000, 0x7fff, 'descender');

    let expectedGlyphCount = 0;
    let previousEnd = -1;
    for (const [start, end] of style.intervals) {
      assertIntegerRange(start, 0, MAX_CODE_POINT, 'Unicode interval start');
      assertIntegerRange(end, 0, MAX_CODE_POINT, 'Unicode interval end');
      if (start > end) throw new Error('Interval start must not exceed its end');
      if (start <= previousEnd) throw new Error('Intervals must be sorted and not overlap');
      previousEnd = end;
      expectedGlyphCount = checkedSize(
        'Glyph count from intervals',
        expectedGlyphCount,
        end - start + 1,
      );
    }
    if (style.glyphs.length !== expectedGlyphCount) {
      throw new Error('Glyph count must exactly match interval coverage');
    }

    let intervalIndex = 0;
    let codePoint = style.intervals[0]?.[0];
    for (const glyph of style.glyphs) {
      if (glyph.codePoint !== codePoint) {
        throw new Error('Glyph codepoints must exactly match intervals in order');
      }
      assertIntegerRange(glyph.width, 0, 0xff, 'Glyph width');
      assertIntegerRange(glyph.height, 0, 0xff, 'Glyph height');
      assertIntegerRange(glyph.advanceX, 0, 0xffff, 'Glyph advanceX');
      assertIntegerRange(glyph.left, -0x8000, 0x7fff, 'Glyph left');
      assertIntegerRange(glyph.top, -0x8000, 0x7fff, 'Glyph top');
      const expectedBitmapLength = glyph.width * glyph.height;
      if (!(glyph.bitmap instanceof Uint8Array) || glyph.bitmap.length !== expectedBitmapLength) {
        throw new Error('Glyph bitmap length must equal width times height');
      }
      const packedLength = Math.ceil(expectedBitmapLength / 4);
      assertIntegerRange(packedLength, 0, 0xffff, 'Glyph dataLength');

      const interval = style.intervals[intervalIndex];
      if (codePoint === interval[1]) {
        intervalIndex += 1;
        codePoint = style.intervals[intervalIndex]?.[0];
      } else {
        codePoint += 1;
      }
    }
  }
}

function planStyles(styles: RasterStyle[]): { plannedStyles: PlannedStyle[]; fileLength: number } {
  const plannedStyles = [...styles]
    .sort((left, right) => left.styleId - right.styleId)
    .map((style): PlannedStyle => {
      const packedLengths: number[] = [];
      let bitmapLength = 0;
      for (const glyph of style.glyphs) {
        const packedLength = Math.ceil((glyph.width * glyph.height) / 4);
        bitmapLength = checkedSize('Style bitmap size', bitmapLength, packedLength);
        packedLengths.push(packedLength);
      }
      const sectionLength = checkedSize(
        'Style section size',
        style.intervals.length * INTERVAL_SIZE,
        style.glyphs.length * CPFONT_GLYPH_SIZE,
        bitmapLength,
      );
      return { style, packedLengths, bitmapLength, sectionLength, dataOffset: 0 };
    });

  let fileLength = checkedSize(
    'Header and TOC size',
    CPFONT_HEADER_SIZE,
    plannedStyles.length * CPFONT_STYLE_TOC_SIZE,
  );
  for (const plannedStyle of plannedStyles) {
    plannedStyle.dataOffset = fileLength;
    fileLength = checkedSize('Cpfont file size', fileLength, plannedStyle.sectionLength);
  }

  return { plannedStyles, fileLength };
}

export function packCpfont(styles: RasterStyle[]): Uint8Array {
  validateStyles(styles);
  const { plannedStyles, fileLength } = planStyles(styles);
  const packedStyles: PackedStyle[] = plannedStyles.map((plannedStyle) => ({
    ...plannedStyle,
    bitmaps: plannedStyle.style.glyphs.map((glyph) =>
      quantizeGrayTo2Bit(glyph.bitmap, glyph.width, glyph.height, glyph.width),
    ),
  }));

  const bytes = new Uint8Array(fileLength);
  bytes.set(MAGIC);
  const view = new DataView(bytes.buffer);
  view.setUint16(8, CPFONT_VERSION, true);
  view.setUint16(10, 1, true);
  view.setUint8(12, packedStyles.length);

  for (const [styleIndex, packedStyle] of packedStyles.entries()) {
    const { style, bitmaps, packedLengths, dataOffset } = packedStyle;
    const tocOffset = CPFONT_HEADER_SIZE + styleIndex * CPFONT_STYLE_TOC_SIZE;
    view.setUint8(tocOffset, style.styleId);
    view.setUint32(tocOffset + 4, style.intervals.length, true);
    view.setUint32(tocOffset + 8, style.glyphs.length, true);
    view.setUint8(tocOffset + 12, style.advanceY);
    view.setInt16(tocOffset + 13, style.ascender, true);
    view.setInt16(tocOffset + 15, style.descender, true);
    view.setUint32(tocOffset + 24, dataOffset, true);

    let glyphOffset = 0;
    for (const [intervalIndex, [start, end]] of style.intervals.entries()) {
      const intervalOffset = dataOffset + intervalIndex * INTERVAL_SIZE;
      view.setUint32(intervalOffset, start, true);
      view.setUint32(intervalOffset + 4, end, true);
      view.setUint32(intervalOffset + 8, glyphOffset, true);
      glyphOffset += end - start + 1;
    }

    const glyphsOffset = dataOffset + style.intervals.length * INTERVAL_SIZE;
    const bitmapOffset = glyphsOffset + style.glyphs.length * CPFONT_GLYPH_SIZE;
    let relativeBitmapOffset = 0;
    for (const [glyphIndex, glyph] of style.glyphs.entries()) {
      const recordOffset = glyphsOffset + glyphIndex * CPFONT_GLYPH_SIZE;
      const bitmap = bitmaps[glyphIndex];
      const dataLength = packedLengths[glyphIndex];
      view.setUint8(recordOffset, glyph.width);
      view.setUint8(recordOffset + 1, glyph.height);
      view.setUint16(recordOffset + 2, glyph.advanceX, true);
      view.setInt16(recordOffset + 4, glyph.left, true);
      view.setInt16(recordOffset + 6, glyph.top, true);
      view.setUint16(recordOffset + 8, dataLength, true);
      view.setUint32(recordOffset + 12, relativeBitmapOffset, true);
      bytes.set(bitmap, bitmapOffset + relativeBitmapOffset);
      relativeBitmapOffset += dataLength;
    }
  }

  return bytes;
}

export interface CpfontStyleMetadata {
  styleId: number;
  intervalCount: number;
  glyphCount: number;
  advanceY: number;
  ascender: number;
  descender: number;
  kernLeftCount: number;
  kernRightCount: number;
  kernLeftClasses: number;
  kernRightClasses: number;
  ligatureCount: number;
  dataOffset: number;
}

export interface CpfontMetadata {
  version: number;
  flags: number;
  styleCount: number;
  styles: CpfontStyleMetadata[];
}

export function inspectCpfont(bytes: Uint8Array): CpfontMetadata {
  if (bytes.length < CPFONT_HEADER_SIZE) throw new Error('Cpfont header is truncated');
  for (let offset = 0; offset < MAGIC.length; offset += 1) {
    if (bytes[offset] !== MAGIC[offset]) throw new Error('Invalid cpfont magic');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint16(8, true);
  const flags = view.getUint16(10, true);
  const styleCount = view.getUint8(12);
  if (version !== CPFONT_VERSION) throw new Error(`Unsupported cpfont version: ${version}`);
  if (flags !== 1) throw new Error(`Unsupported cpfont flags: ${flags}`);
  if (styleCount < 1 || styleCount > 4) throw new Error(`Invalid style count: ${styleCount}`);
  assertZeroBytes(bytes, 13, CPFONT_HEADER_SIZE, 'Header reserved');

  const tocEnd = CPFONT_HEADER_SIZE + styleCount * CPFONT_STYLE_TOC_SIZE;
  if (bytes.length < tocEnd) throw new Error('Cpfont style TOC is truncated');

  const styles: CpfontStyleMetadata[] = [];
  const styleIds = new Set<number>();
  for (let styleIndex = 0; styleIndex < styleCount; styleIndex += 1) {
    const offset = CPFONT_HEADER_SIZE + styleIndex * CPFONT_STYLE_TOC_SIZE;
    assertZeroBytes(bytes, offset + 1, offset + 4, 'Style TOC reserved');
    assertZeroBytes(bytes, offset + 28, offset + 32, 'Style TOC reserved');

    const style: CpfontStyleMetadata = {
      styleId: view.getUint8(offset),
      intervalCount: view.getUint32(offset + 4, true),
      glyphCount: view.getUint32(offset + 8, true),
      advanceY: view.getUint8(offset + 12),
      ascender: view.getInt16(offset + 13, true),
      descender: view.getInt16(offset + 15, true),
      kernLeftCount: view.getUint16(offset + 17, true),
      kernRightCount: view.getUint16(offset + 19, true),
      kernLeftClasses: view.getUint8(offset + 21),
      kernRightClasses: view.getUint8(offset + 22),
      ligatureCount: view.getUint8(offset + 23),
      dataOffset: view.getUint32(offset + 24, true),
    };
    if (style.styleId > 3) throw new Error(`Style ID is out of range: ${style.styleId}`);
    if (styleIds.has(style.styleId)) throw new Error('Style IDs must be unique');
    if (styleIndex > 0 && style.styleId <= styles[styleIndex - 1].styleId) {
      throw new Error('Style IDs must be strictly increasing');
    }
    styleIds.add(style.styleId);
    if (
      style.kernLeftCount !== 0 ||
      style.kernRightCount !== 0 ||
      style.kernLeftClasses !== 0 ||
      style.kernRightClasses !== 0
    ) {
      throw new Error('Kerning sections are not supported by this cpfont format');
    }
    if (style.ligatureCount !== 0) {
      throw new Error('Ligature sections are not supported by this cpfont format');
    }
    if (style.dataOffset < tocEnd || style.dataOffset > bytes.length) {
      throw new Error(`Style data offset is outside the file: ${style.dataOffset}`);
    }
    if (styleIndex > 0 && style.dataOffset < styles[styleIndex - 1].dataOffset) {
      throw new Error('Style data offsets are out of order');
    }
    styles.push(style);
  }

  for (const [styleIndex, style] of styles.entries()) {
    const styleEnd = styles[styleIndex + 1]?.dataOffset ?? bytes.length;
    const intervalBytes = style.intervalCount * INTERVAL_SIZE;
    const glyphBytes = style.glyphCount * CPFONT_GLYPH_SIZE;
    const fixedEnd = style.dataOffset + intervalBytes + glyphBytes;
    if (!Number.isSafeInteger(fixedEnd) || fixedEnd > styleEnd) {
      if (styleIndex + 1 < styles.length) {
        throw new Error('Style fixed sections overlap the next style');
      }
      throw new Error('Style fixed section is outside the file');
    }

    let derivedGlyphCount = 0;
    let previousEnd = -1;
    for (let intervalIndex = 0; intervalIndex < style.intervalCount; intervalIndex += 1) {
      const offset = style.dataOffset + intervalIndex * INTERVAL_SIZE;
      const start = view.getUint32(offset, true);
      const end = view.getUint32(offset + 4, true);
      const glyphOffset = view.getUint32(offset + 8, true);
      if (start > MAX_CODE_POINT || end > MAX_CODE_POINT) {
        throw new Error('Interval codepoints must not exceed the Unicode maximum');
      }
      if (start > end) throw new Error('Interval start exceeds interval end');
      if (start <= previousEnd) throw new Error('Intervals are unsorted or overlapping');
      if (glyphOffset !== derivedGlyphCount) {
        throw new Error('Interval glyph offset is not contiguous');
      }
      previousEnd = end;
      derivedGlyphCount += end - start + 1;
      if (derivedGlyphCount > MAX_UINT32) {
        throw new Error('Interval-derived glyph count exceeds uint32');
      }
    }
    if (derivedGlyphCount !== style.glyphCount) {
      throw new Error('Interval-derived glyph count does not match the TOC');
    }

    const glyphsOffset = style.dataOffset + intervalBytes;
    const bitmapLength = styleEnd - fixedEnd;
    let expectedBitmapOffset = 0;
    for (let glyphIndex = 0; glyphIndex < style.glyphCount; glyphIndex += 1) {
      const offset = glyphsOffset + glyphIndex * CPFONT_GLYPH_SIZE;
      const width = view.getUint8(offset);
      const height = view.getUint8(offset + 1);
      const dataLength = view.getUint16(offset + 8, true);
      const dataOffset = view.getUint32(offset + 12, true);
      if (view.getUint16(offset + 10, true) !== 0) {
        throw new Error('Glyph padding bytes must be zero');
      }
      if (dataLength !== Math.ceil((width * height) / 4)) {
        throw new Error('Glyph data length does not match its dimensions');
      }
      if (dataOffset !== expectedBitmapOffset) {
        throw new Error('Glyph bitmap offsets must be contiguous');
      }
      if (dataOffset + dataLength > bitmapLength) {
        throw new Error('Glyph bitmap range is outside the style bitmap region');
      }
      expectedBitmapOffset += dataLength;
    }
    if (expectedBitmapOffset !== bitmapLength) {
      throw new Error('Style bitmap region has trailing or missing data');
    }
  }

  return { version, flags, styleCount, styles };
}
