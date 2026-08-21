import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import initFreeType, {
  FT,
  type Face,
  type FreeType,
  type LoadedGlyph,
} from '@zkl2333/freetype-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inspectCpfont, packCpfont } from './binary';
import { rasterizeStyle } from './rasterize';
import type { FontStyleId } from './types';

interface SizeMetrics {
  height: number;
  ascender: number;
  descender: number;
}

interface FakeGlyph extends LoadedGlyph {
  linearHoriAdvance: number;
}

interface FakeFaceController {
  face: Face;
  setCharSizeCalls: number[][];
  loadedIndexes: number[];
}

function glyph(overrides: Partial<FakeGlyph> = {}): FakeGlyph {
  return {
    width: 1,
    rows: 1,
    pitch: 1,
    pixelMode: FT.PIXEL_MODE_GRAY,
    numGrays: 256,
    bitmapLeft: 0,
    bitmapTop: 1,
    advance: { x: 64, y: 0 },
    metrics: {
      width: 64,
      height: 64,
      horiBearingX: 0,
      horiBearingY: 64,
      horiAdvance: 64,
      vertBearingX: 0,
      vertBearingY: 0,
      vertAdvance: 64,
    },
    buffer: new Uint8Array([255]),
    linearHoriAdvance: 1 << 16,
    ...overrides,
  };
}

function fakeRasterContext() {
  const faceGlyphOffset = 4;
  const linearAdvanceOffset = 8;
  const slots = new Map<number, number>();
  const linearAdvances = new Map<number, number>();
  const events: string[] = [];
  let nextPtr = 100;

  const ft = {
    offsets: {
      FT_FaceRec: { glyph: faceGlyphOffset },
      FT_GlyphSlotRec: { linearHoriAdvance: linearAdvanceOffset },
    },
    module: {
      getValue(address: number) {
        for (const [ptr, slot] of slots) {
          if (address === ptr + faceGlyphOffset) return slot;
        }
        for (const [slot, linear] of linearAdvances) {
          if (address === slot + linearAdvanceOffset) return linear;
        }
        throw new Error(`Unexpected fake memory read at ${address}`);
      },
    },
  } as unknown as FreeType;

  function makeFace(
    coverage: ReadonlyMap<number, { index: number; glyph: FakeGlyph }>,
    metrics: SizeMetrics = { height: 12 * 64, ascender: 9 * 64, descender: -3 * 64 },
    label = `face-${nextPtr}`,
  ): FakeFaceController {
    const ptr = nextPtr;
    const slot = nextPtr + 10_000;
    nextPtr += 100;
    slots.set(ptr, slot);
    const setCharSizeCalls: number[][] = [];
    const loadedIndexes: number[] = [];
    let configured = false;

    const face = {
      ptr,
      module: ft.module,
      setCharSize(...args: number[]) {
        configured = true;
        setCharSizeCalls.push(args);
        events.push(`${label}:size`);
        return this;
      },
      charIndex(codePoint: number) {
        if (!configured) throw new Error(`${label} coverage checked before sizing`);
        events.push(`${label}:char:${codePoint}`);
        return coverage.get(codePoint)?.index ?? 0;
      },
      loadGlyph({ index }: { index?: number } = {}) {
        if (!configured) throw new Error(`${label} glyph loaded before sizing`);
        const entry = [...coverage.values()].find((candidate) => candidate.index === index);
        if (!entry) throw new Error(`${label} missing glyph index ${index}`);
        loadedIndexes.push(index as number);
        linearAdvances.set(slot, entry.glyph.linearHoriAdvance);
        return entry.glyph;
      },
      sizeMetrics() {
        return metrics;
      },
    } as unknown as Face;

    return { face, setCharSizeCalls, loadedIndexes };
  }

  return { ft, events, makeFace };
}

function mapGlyphs(entries: Array<[number, number, FakeGlyph?]>): Map<number, {
  index: number;
  glyph: FakeGlyph;
}> {
  return new Map(entries.map(([codePoint, index, loaded = glyph()]) => [
    codePoint,
    { index, glyph: loaded },
  ]));
}

function readRealSizeMetrics(ft: FreeType, face: Face): SizeMetrics {
  const maybeFace = face as Face & { sizeMetrics?: () => SizeMetrics };
  if (maybeFace.sizeMetrics) return maybeFace.sizeMetrics();

  const size = ft.module.getValue(face.ptr + ft.offsets.FT_FaceRec.size, 'i32');
  const metrics = size + ft.offsets.FT_SizeRec.metrics;
  return {
    ascender: ft.module.getValue(metrics + ft.offsets.FT_Size_Metrics.ascender, 'i32'),
    descender: ft.module.getValue(metrics + ft.offsets.FT_Size_Metrics.descender, 'i32'),
    height: ft.module.getValue(metrics + ft.offsets.FT_Size_Metrics.height, 'i32'),
  };
}

describe('rasterizeStyle with FreeType WASM', () => {
  let ft: FreeType;
  let fontBytes: Uint8Array;
  let subsetPrimaryBytes: Uint8Array;
  let subsetFallbackBytes: Uint8Array;

  beforeAll(async () => {
    const wasm = readFileSync(fileURLToPath(
      import.meta.resolve('@zkl2333/freetype-wasm/freetype.wasm'),
    ));
    fontBytes = readFileSync(new URL('../../../tests/fixtures/fonts/ABeeZee-Regular.ttf', import.meta.url));
    subsetPrimaryBytes = readFileSync(new URL('../../../tests/fixtures/fonts/SubsetPrimary-A.ttf', import.meta.url));
    subsetFallbackBytes = readFileSync(new URL('../../../tests/fixtures/fonts/SubsetFallback-B.ttf', import.meta.url));
    ft = await initFreeType({ wasmBinary: new Uint8Array(wasm) });
  });

  afterAll(() => {
    ft?.destroy();
  });

  it('rasterizes printable ASCII as raw grayscale and packs as a valid cpfont', () => {
    const face = ft.newFace(fontBytes);
    try {
      const expectedCodePoints = Array.from(
        { length: 0x7f - 0x20 },
        (_, index) => 0x20 + index,
      );
      const style = rasterizeStyle(ft, face, [], 12, [[0x20, 0x7e]], 0);
      const metrics = readRealSizeMetrics(ft, face);
      const a = style.glyphs.find(({ codePoint }) => codePoint === 0x41);

      expect(style.intervals).toEqual([[0x20, 0x7e]]);
      expect(style.glyphs).toHaveLength(95);
      expect(style.glyphs.map(({ codePoint }) => codePoint)).toEqual(expectedCodePoints);
      expect(a).toBeDefined();
      expect(a!.width).toBeGreaterThan(0);
      expect(a!.height).toBeGreaterThan(0);
      expect(a!.bitmap).toHaveLength(a!.width * a!.height);
      expect(a!.bitmap.some((value) => value > 0)).toBe(true);
      expect(style.advanceY).toBe(Math.ceil(metrics.height / 64));
      expect(style.ascender).toBe(Math.ceil(metrics.ascender / 64));
      expect(style.descender).toBe(Math.floor(metrics.descender / 64));

      const bytes = packCpfont([style]);
      expect(inspectCpfont(bytes).styles[0].glyphCount).toBe(95);
    } finally {
      face.destroy();
    }
  });

  it('changes with point size and remains deterministic across repeated calls', () => {
    const face = ft.newFace(fontBytes);
    try {
      const smallFirst = rasterizeStyle(ft, face, [], 12, [[0x41, 0x41]], 0);
      const large = rasterizeStyle(ft, face, [], 14, [[0x41, 0x41]], 0);
      const smallAgain = rasterizeStyle(ft, face, [], 12, [[0x41, 0x41]], 0);

      expect(large.advanceY).not.toBe(smallFirst.advanceY);
      expect([large.glyphs[0].width, large.glyphs[0].height]).not.toEqual([
        smallFirst.glyphs[0].width,
        smallFirst.glyphs[0].height,
      ]);
      expect(smallAgain).toEqual(smallFirst);
    } finally {
      face.destroy();
    }
  });

  it('uses real FreeType coverage from primary and fallback subset faces', () => {
    const primary = ft.newFace(subsetPrimaryBytes);
    const fallback = ft.newFace(subsetFallbackBytes);
    try {
      const primaryOnly = rasterizeStyle(ft, primary, [], 12, [[0x41, 0x42]], 0);
      const withFallback = rasterizeStyle(ft, primary, [fallback], 12, [[0x41, 0x42]], 0);

      expect(primaryOnly.glyphs.map(({ codePoint }) => codePoint)).toEqual([0x41]);
      expect(withFallback.intervals).toEqual([[0x41, 0x42]]);
      expect(withFallback.glyphs.map(({ codePoint }) => codePoint)).toEqual([0x41, 0x42]);
      expect(withFallback.glyphs.every(({ bitmap }) => bitmap.some((value) => value > 0))).toBe(true);
    } finally {
      fallback.destroy();
      primary.destroy();
    }
  });
});

describe('rasterizeStyle coverage and bitmap normalization', () => {
  it('sizes every face first, then uses primary and fallback precedence without mutation', () => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([
      [0x41, 11, glyph({ linearHoriAdvance: 20 << 12 })],
    ]), { height: 705, ascender: 577, descender: -129 }, 'primary');
    const firstFallback = context.makeFace(mapGlyphs([
      [0x41, 21],
      [0x42, 22],
    ]), { height: 9999, ascender: 9999, descender: -9999 }, 'fallback-1');
    const secondFallback = context.makeFace(mapGlyphs([
      [0x42, 32],
      [0x43, 33],
    ]), undefined, 'fallback-2');
    const fallbacks = [firstFallback.face, secondFallback.face];
    const intervals: Array<readonly [number, number]> = [[0x41, 0x43]];
    const fallbackSnapshot = [...fallbacks];
    const intervalSnapshot = intervals.map((interval) => [...interval]);

    const style = rasterizeStyle(
      context.ft,
      primary.face,
      fallbacks,
      12,
      intervals,
      2,
    );

    expect(primary.setCharSizeCalls).toEqual([[12 << 6, 12 << 6, 150, 150]]);
    expect(firstFallback.setCharSizeCalls).toEqual([[12 << 6, 12 << 6, 150, 150]]);
    expect(secondFallback.setCharSizeCalls).toEqual([[12 << 6, 12 << 6, 150, 150]]);
    expect(context.events.slice(0, 3)).toEqual(['primary:size', 'fallback-1:size', 'fallback-2:size']);
    expect(primary.loadedIndexes).toEqual([11]);
    expect(firstFallback.loadedIndexes).toEqual([22]);
    expect(secondFallback.loadedIndexes).toEqual([33]);
    expect(style.glyphs.map(({ codePoint }) => codePoint)).toEqual([0x41, 0x42, 0x43]);
    expect(style.glyphs[0].advanceX).toBe(20);
    expect(style).toMatchObject({ styleId: 2, advanceY: 12, ascender: 10, descender: -3 });
    expect(fallbacks).toEqual(fallbackSnapshot);
    expect(intervals).toEqual(intervalSnapshot);
  });

  it('omits missing codepoints and splits covered output into contiguous intervals', () => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([
      [0x41, 1],
      [0x42, 2],
      [0x44, 4],
      [0x45, 5],
    ]));

    const style = rasterizeStyle(context.ft, primary.face, [], 12, [[0x41, 0x45]], 0);

    expect(style.intervals).toEqual([[0x41, 0x42], [0x44, 0x45]]);
    expect(style.glyphs.map(({ codePoint }) => codePoint)).toEqual([
      0x41,
      0x42,
      0x44,
      0x45,
    ]);
  });

  it('treats non-positive glyph indexes as missing coverage', () => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([
      [0x41, -1],
      [0x42, 2],
    ]));

    const style = rasterizeStyle(context.ft, primary.face, [], 12, [[0x41, 0x42]], 0);

    expect(style.intervals).toEqual([[0x42, 0x42]]);
    expect(style.glyphs.map(({ codePoint }) => codePoint)).toEqual([0x42]);
    expect(primary.loadedIndexes).toEqual([2]);
  });

  it('copies visible grayscale bytes from positive padding and negative pitch rows', () => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([
      [0x41, 1, glyph({
        width: 2,
        rows: 2,
        pitch: 3,
        buffer: new Uint8Array([1, 2, 99, 3, 4, 99]),
      })],
      [0x42, 2, glyph({
        width: 2,
        rows: 2,
        pitch: -3,
        buffer: new Uint8Array([3, 4, 99, 1, 2, 99]),
      })],
    ]));

    const style = rasterizeStyle(context.ft, primary.face, [], 12, [[0x41, 0x42]], 0);

    expect(style.glyphs[0].bitmap).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(style.glyphs[1].bitmap).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('accepts empty bitmaps even when their pixel mode is NONE', () => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([
      [0x20, 1, glyph({
        width: 0,
        rows: 3,
        pitch: 0,
        pixelMode: FT.PIXEL_MODE_NONE,
        buffer: new Uint8Array(),
      })],
    ]));

    const style = rasterizeStyle(context.ft, primary.face, [], 12, [[0x20, 0x20]], 0);

    expect(style.glyphs[0]).toMatchObject({ width: 0, height: 3 });
    expect(style.glyphs[0].bitmap).toEqual(new Uint8Array());
  });
});

describe('rasterizeStyle validation', () => {
  it('rejects unsupported non-empty bitmap modes with style and codepoint context', () => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([
      [0x41, 1, glyph({ pixelMode: FT.PIXEL_MODE_MONO })],
    ]));

    expect(() => rasterizeStyle(context.ft, primary.face, [], 12, [[0x41, 0x41]], 3))
      .toThrow(/style 3.*U\+0041.*pixel mode/i);
  });

  it.each([
    ['width', glyph({ width: 256, pitch: 256, buffer: new Uint8Array(256) })],
    ['height', glyph({ rows: 256, buffer: new Uint8Array(256) })],
    ['advanceX', glyph({ linearHoriAdvance: 65_536 * (1 << 12) })],
    ['left', glyph({ bitmapLeft: -32_769 })],
    ['top', glyph({ bitmapTop: 32_768 })],
  ])('rejects invalid %s fields with style and codepoint context', (field, loaded) => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([[0x41, 1, loaded]]));

    expect(() => rasterizeStyle(context.ft, primary.face, [], 12, [[0x41, 0x41]], 1))
      .toThrow(new RegExp(`style 1.*U\\+0041.*${field}`, 'i'));
  });

  it.each([
    ['pitch', glyph({ width: 2, pitch: 1, buffer: new Uint8Array(2) })],
    ['buffer', glyph({ width: 2, rows: 2, pitch: 3, buffer: new Uint8Array(4) })],
    ['pitch', glyph({ pitch: 1.5 })],
  ])('rejects corrupt %s storage with style and codepoint context', (field, loaded) => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([[0x41, 1, loaded]]));

    expect(() => rasterizeStyle(context.ft, primary.face, [], 12, [[0x41, 0x41]], 1))
      .toThrow(new RegExp(`style 1.*U\\+0041.*${field}`, 'i'));
  });

  it('rejects invalid line metrics with style context', () => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([[0x41, 1]]), {
      height: 256 * 64,
      ascender: 0,
      descender: 0,
    });

    expect(() => rasterizeStyle(context.ft, primary.face, [], 12, [[0x41, 0x41]], 2))
      .toThrow(/style 2.*advanceY/i);
  });

  const invalidArguments: Array<[
    string,
    number,
    Array<readonly [number, number]>,
    number,
  ]> = [
    ['size', 0, [[0x41, 0x41]], 0],
    ['size', 1.5, [[0x41, 0x41]], 0],
    ['size', 33_554_432, [[0x41, 0x41]], 0],
    ['style', 12, [[0x41, 0x41]], 4],
    ['interval', 12, [[0x42, 0x41]], 0],
    ['interval', 12, [[0x41, 0x110000]], 0],
    ['interval', 12, [[0x41, 0x42], [0x42, 0x43]], 0],
  ];

  it.each(invalidArguments)('rejects invalid %s arguments before rasterization', (
    field,
    size,
    intervals,
    styleId,
  ) => {
    const context = fakeRasterContext();
    const primary = context.makeFace(mapGlyphs([[0x41, 1]]));

    expect(() => rasterizeStyle(
      context.ft,
      primary.face,
      [],
      size,
      intervals,
      styleId as FontStyleId,
    )).toThrow(new RegExp(field, 'i'));
    expect(primary.setCharSizeCalls).toEqual([]);
  });
});
