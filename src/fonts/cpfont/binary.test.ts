import { describe, expect, it } from 'vitest';
import type { FontStyleId, RasterGlyph, RasterStyle } from './types';
import {
  CPFONT_GLYPH_SIZE,
  CPFONT_HEADER_SIZE,
  CPFONT_STYLE_TOC_SIZE,
  CPFONT_VERSION,
  inspectCpfont,
  packCpfont,
  quantizeGrayTo2Bit,
} from './binary';

function makeStyle(
  styleId: FontStyleId = 0,
  overrides: Partial<RasterStyle> = {},
): RasterStyle {
  return {
    styleId,
    intervals: [[0x41, 0x41]],
    glyphs: [{
      codePoint: 0x41,
      width: 2,
      height: 1,
      advanceX: 7,
      left: -1,
      top: 9,
      bitmap: new Uint8Array([0, 255]),
    }],
    advanceY: 12,
    ascender: 9,
    descender: -3,
    ...overrides,
  };
}

function mutateCpfont(
  bytes: Uint8Array,
  mutate: (copy: Uint8Array, view: DataView) => void,
): Uint8Array {
  const copy = bytes.slice();
  mutate(copy, new DataView(copy.buffer));
  return copy;
}

describe('quantizeGrayTo2Bit', () => {
  it('quantizes threshold boundaries and packs four pixels MSB-first', () => {
    expect(
      quantizeGrayTo2Bit(
        new Uint8Array([0, 63, 64, 127, 128, 191, 192, 255]),
        8,
        1,
        8,
      ),
    ).toEqual(new Uint8Array([0x05, 0xaf]));
  });

  it('ignores row padding for a positive pitch without resetting byte packing', () => {
    expect(
      quantizeGrayTo2Bit(
        new Uint8Array([
          0, 64, 128, 255, 255,
          255, 128, 64, 0, 255,
        ]),
        4,
        2,
        5,
      ),
    ).toEqual(new Uint8Array([0x1b, 0xe4]));
  });

  it('reads rows bottom-up for a negative pitch', () => {
    expect(
      quantizeGrayTo2Bit(
        new Uint8Array([
          255, 128, 64, 0,
          0, 64, 128, 255,
        ]),
        4,
        2,
        -4,
      ),
    ).toEqual(new Uint8Array([0x1b, 0xe4]));
  });

  it('returns no bytes for a zero-size glyph', () => {
    expect(quantizeGrayTo2Bit(new Uint8Array(), 0, 0, 0)).toEqual(new Uint8Array());
    expect(quantizeGrayTo2Bit(new Uint8Array(), 0, 3, 0)).toEqual(new Uint8Array());
    expect(quantizeGrayTo2Bit(new Uint8Array(), 3, 0, 0)).toEqual(new Uint8Array());
  });

  it('leaves the low padding bits clear in a partial final byte', () => {
    expect(quantizeGrayTo2Bit(new Uint8Array([255, 128, 64]), 3, 1, 3)).toEqual(
      new Uint8Array([0xe4]),
    );
  });

  it('rejects negative or fractional dimensions', () => {
    expect(() => quantizeGrayTo2Bit(new Uint8Array(), -1, 1, 1)).toThrow(/width/i);
    expect(() => quantizeGrayTo2Bit(new Uint8Array(), 1.5, 1, 2)).toThrow(/width/i);
    expect(() => quantizeGrayTo2Bit(new Uint8Array(), 1, -1, 1)).toThrow(/rows/i);
    expect(() => quantizeGrayTo2Bit(new Uint8Array(), 1, 1.5, 1)).toThrow(/rows/i);
  });

  it('rejects a non-integer pitch and row storage narrower than the glyph', () => {
    expect(() => quantizeGrayTo2Bit(new Uint8Array([0]), 1, 1, 1.5)).toThrow(/pitch/i);
    expect(() => quantizeGrayTo2Bit(new Uint8Array([0, 0]), 2, 1, 1)).toThrow(/pitch/i);
    expect(() => quantizeGrayTo2Bit(new Uint8Array([0, 0]), 2, 1, -1)).toThrow(/pitch/i);
  });

  it('rejects buffers truncated within positive or negative pitched rows', () => {
    expect(() => quantizeGrayTo2Bit(new Uint8Array(4), 2, 2, 3)).toThrow(/buffer/i);
    expect(() => quantizeGrayTo2Bit(new Uint8Array(4), 2, 2, -3)).toThrow(/buffer/i);
  });
});

describe('packCpfont', () => {
  it('writes the exact V4 layout for one style with one glyph', () => {
    const bytes = packCpfont([makeStyle()]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(CPFONT_VERSION).toBe(4);
    expect(CPFONT_HEADER_SIZE).toBe(32);
    expect(CPFONT_STYLE_TOC_SIZE).toBe(32);
    expect(CPFONT_GLYPH_SIZE).toBe(16);
    expect(bytes).toHaveLength(93);
    expect(Array.from(bytes.subarray(0, 8))).toEqual([67, 80, 70, 79, 78, 84, 0, 0]);
    expect(view.getUint16(8, true)).toBe(4);
    expect(view.getUint16(10, true)).toBe(1);
    expect(view.getUint8(12)).toBe(1);
    expect(Array.from(bytes.subarray(13, 32))).toEqual(new Array(19).fill(0));

    expect(view.getUint8(32)).toBe(0);
    expect(view.getUint32(36, true)).toBe(1);
    expect(view.getUint32(40, true)).toBe(1);
    expect(view.getUint8(44)).toBe(12);
    expect(view.getInt16(45, true)).toBe(9);
    expect(view.getInt16(47, true)).toBe(-3);
    expect(Array.from(bytes.subarray(49, 56))).toEqual(new Array(7).fill(0));
    expect(view.getUint32(56, true)).toBe(64);
    expect(Array.from(bytes.subarray(60, 64))).toEqual(new Array(4).fill(0));

    expect(view.getUint32(64, true)).toBe(0x41);
    expect(view.getUint32(68, true)).toBe(0x41);
    expect(view.getUint32(72, true)).toBe(0);

    expect(view.getUint8(76)).toBe(2);
    expect(view.getUint8(77)).toBe(1);
    expect(view.getUint16(78, true)).toBe(7);
    expect(view.getInt16(80, true)).toBe(-1);
    expect(view.getInt16(82, true)).toBe(9);
    expect(view.getUint16(84, true)).toBe(1);
    expect(view.getUint16(86, true)).toBe(0);
    expect(view.getUint32(88, true)).toBe(0);
    expect(bytes[92]).toBe(0x30);
  });

  it('sorts styles by ID and calculates each absolute data offset independently', () => {
    const style3 = makeStyle(3, {
      glyphs: [{
        codePoint: 0x41,
        width: 5,
        height: 1,
        advanceX: 8,
        left: 0,
        top: 9,
        bitmap: new Uint8Array([255, 255, 255, 255, 255]),
      }],
    });
    const bytes = packCpfont([style3, makeStyle(1)]);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(view.getUint8(32)).toBe(1);
    expect(view.getUint32(56, true)).toBe(96);
    expect(view.getUint8(64)).toBe(3);
    expect(view.getUint32(88, true)).toBe(125);
    expect(bytes).toHaveLength(155);
    expect(Array.from(bytes.subarray(153))).toEqual([0xff, 0xc0]);
  });

  it.each([
    { position: 'beginning', emptyIds: [0, 1], offsets: [160, 160, 160, 189] },
    { position: 'middle', emptyIds: [1, 2], offsets: [160, 189, 189, 189] },
    { position: 'end', emptyIds: [2, 3], offsets: [160, 189, 218, 218] },
  ])(
    'round-trips all four styles with adjacent zero-length sections at the $position',
    ({ emptyIds, offsets }) => {
      const emptyIdSet = new Set(emptyIds);
      const inputIds: FontStyleId[] = [3, 2, 1, 0];
      const bytes = packCpfont(inputIds.map((styleId) =>
        emptyIdSet.has(styleId)
          ? makeStyle(styleId, { intervals: [], glyphs: [] })
          : makeStyle(styleId),
      ));
      const metadata = inspectCpfont(bytes);

      expect(bytes).toHaveLength(218);
      expect(metadata.styles.map(({ styleId }) => styleId)).toEqual([0, 1, 2, 3]);
      expect(metadata.styles.map(({ dataOffset }) => dataOffset)).toEqual(offsets);
    },
  );

  it('requires one to four styles', () => {
    expect(() => packCpfont([])).toThrow(/one to four styles/i);
    expect(() =>
      packCpfont([makeStyle(0), makeStyle(1), makeStyle(2), makeStyle(3), makeStyle(0)]),
    ).toThrow(/one to four styles/i);
  });

  it('requires unique style IDs in the on-disk range', () => {
    expect(() => packCpfont([makeStyle(1), makeStyle(1)])).toThrow(/unique/i);
    expect(() => packCpfont([makeStyle(0, { styleId: 4 as FontStyleId })])).toThrow(
      /style ID/i,
    );
    expect(() => packCpfont([makeStyle(0, { styleId: -1 as FontStyleId })])).toThrow(
      /style ID/i,
    );
  });

  it('requires sorted, non-overlapping interval ranges of Unicode codepoints', () => {
    expect(() => packCpfont([makeStyle(0, { intervals: [[0x42, 0x41]] })])).toThrow(
      /interval/i,
    );
    expect(() =>
      packCpfont([makeStyle(0, {
        intervals: [[0x41, 0x42], [0x42, 0x43]],
        glyphs: [
          { ...makeStyle().glyphs[0], codePoint: 0x41 },
          { ...makeStyle().glyphs[0], codePoint: 0x42 },
          { ...makeStyle().glyphs[0], codePoint: 0x42 },
          { ...makeStyle().glyphs[0], codePoint: 0x43 },
        ],
      })]),
    ).toThrow(/overlap/i);
    expect(() => packCpfont([makeStyle(0, { intervals: [[0, 0x110000]] })])).toThrow(
      /Unicode/i,
    );
  });

  it('requires glyph codepoints to cover intervals exactly and in order', () => {
    expect(() => packCpfont([makeStyle(0, { intervals: [[0x41, 0x42]] })])).toThrow(
      /glyph count/i,
    );
    expect(() =>
      packCpfont([makeStyle(0, {
        intervals: [[0x41, 0x42]],
        glyphs: [
          { ...makeStyle().glyphs[0], codePoint: 0x42 },
          { ...makeStyle().glyphs[0], codePoint: 0x41 },
        ],
      })]),
    ).toThrow(/codepoint/i);
  });

  it('rejects style metrics outside their integer fields', () => {
    expect(() => packCpfont([makeStyle(0, { advanceY: 256 })])).toThrow(/advanceY/i);
    expect(() => packCpfont([makeStyle(0, { advanceY: 1.5 })])).toThrow(/advanceY/i);
    expect(() => packCpfont([makeStyle(0, { ascender: -32769 })])).toThrow(/ascender/i);
    expect(() => packCpfont([makeStyle(0, { descender: 32768 })])).toThrow(/descender/i);
  });

  it('rejects glyph metrics outside their integer fields', () => {
    const invalidGlyphs = [
      { field: 'width', value: 256 },
      { field: 'height', value: -1 },
      { field: 'advanceX', value: 65536 },
      { field: 'left', value: -32769 },
      { field: 'top', value: 32768 },
    ] as const;

    for (const { field, value } of invalidGlyphs) {
      const glyph = { ...makeStyle().glyphs[0], [field]: value };
      expect(() => packCpfont([makeStyle(0, { glyphs: [glyph] })]), field).toThrow(
        new RegExp(field, 'i'),
      );
    }
  });

  it('requires tightly packed grayscale bitmap lengths to match dimensions', () => {
    const glyph = { ...makeStyle().glyphs[0], bitmap: new Uint8Array([0]) };
    expect(() => packCpfont([makeStyle(0, { glyphs: [glyph] })])).toThrow(/bitmap length/i);
  });

  it('rejects section and file offsets that do not fit uint32', () => {
    const intervals: RasterStyle['intervals'] = [];
    intervals.length = 0xffffffff;
    expect(() => packCpfont([makeStyle(0, { intervals, glyphs: [] })])).toThrow(/32-bit/i);
  });

  it('rejects oversized aggregate bitmap data before quantizing glyphs', () => {
    const glyphCount = 265_000;
    const glyph: RasterGlyph = {
      codePoint: 0,
      width: 255,
      height: 255,
      advanceX: 0,
      left: 0,
      top: 0,
      bitmap: new Uint8Array(255 * 255),
    };
    let quantizationAttempted = false;
    const glyphs = {
      length: glyphCount,
      *[Symbol.iterator]() {
        for (let codePoint = 0; codePoint < glyphCount; codePoint += 1) {
          glyph.codePoint = codePoint;
          yield glyph;
        }
      },
      map() {
        quantizationAttempted = true;
        throw new Error('Quantization was attempted');
      },
    } as unknown as RasterStyle['glyphs'];

    expect(() => packCpfont([makeStyle(0, {
      intervals: [[0, glyphCount - 1]],
      glyphs,
    })])).toThrow(/32-bit/i);
    expect(quantizationAttempted).toBe(false);
  });
});

describe('inspectCpfont', () => {
  it('returns detached V4 header and per-style metadata', () => {
    const bytes = packCpfont([makeStyle()]);
    const metadata = inspectCpfont(bytes);

    expect(metadata).toEqual({
      version: 4,
      flags: 1,
      styleCount: 1,
      styles: [{
        styleId: 0,
        intervalCount: 1,
        glyphCount: 1,
        advanceY: 12,
        ascender: 9,
        descender: -3,
        kernLeftCount: 0,
        kernRightCount: 0,
        kernLeftClasses: 0,
        kernRightClasses: 0,
        ligatureCount: 0,
        dataOffset: 64,
      }],
    });

    bytes.fill(0);
    expect(metadata.version).toBe(4);
    expect(metadata.styles[0].dataOffset).toBe(64);
  });

  it('returns sorted metadata with independent offsets for multiple styles', () => {
    const metadata = inspectCpfont(packCpfont([makeStyle(3), makeStyle(1)]));

    expect(metadata.styleCount).toBe(2);
    expect(metadata.styles.map(({ styleId, dataOffset }) => ({ styleId, dataOffset }))).toEqual([
      { styleId: 1, dataOffset: 96 },
      { styleId: 3, dataOffset: 125 },
    ]);
  });

  it('rejects a truncated header or TOC', () => {
    expect(() => inspectCpfont(new Uint8Array(31))).toThrow(/header/i);
    expect(() => inspectCpfont(packCpfont([makeStyle()]).subarray(0, 63))).toThrow(/TOC/i);
  });

  it('rejects incompatible header fields', () => {
    const valid = packCpfont([makeStyle()]);
    const cases = [
      mutateCpfont(valid, (bytes) => { bytes[0] = 0; }),
      mutateCpfont(valid, (_bytes, view) => { view.setUint16(8, 3, true); }),
      mutateCpfont(valid, (_bytes, view) => { view.setUint16(10, 0, true); }),
      mutateCpfont(valid, (bytes) => { bytes[12] = 0; }),
      mutateCpfont(valid, (bytes) => { bytes[12] = 5; }),
    ];

    expect(() => inspectCpfont(cases[0])).toThrow(/magic/i);
    expect(() => inspectCpfont(cases[1])).toThrow(/version/i);
    expect(() => inspectCpfont(cases[2])).toThrow(/flags/i);
    expect(() => inspectCpfont(cases[3])).toThrow(/style count/i);
    expect(() => inspectCpfont(cases[4])).toThrow(/style count/i);
  });

  it('rejects duplicate or out-of-range style IDs', () => {
    const valid = packCpfont([makeStyle(1), makeStyle(3)]);
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes) => { bytes[64] = 1; }))).toThrow(
      /unique/i,
    );
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes) => { bytes[64] = 4; }))).toThrow(
      /style ID/i,
    );
  });

  it('rejects style IDs that are not strictly increasing', () => {
    const valid = packCpfont([makeStyle(1), makeStyle(3)]);
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes) => { bytes[64] = 0; }))).toThrow(
      /strictly increasing/i,
    );
  });

  it('rejects style data offsets before the TOCs, out of order, or overlapping', () => {
    const oneStyle = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(oneStyle, (_bytes, view) => {
      view.setUint32(56, 63, true);
    }))).toThrow(/data offset/i);

    const twoStyles = packCpfont([makeStyle(1), makeStyle(3)]);
    expect(() => inspectCpfont(mutateCpfont(twoStyles, (_bytes, view) => {
      view.setUint32(56, 126, true);
    }))).toThrow(/order/i);
    expect(() => inspectCpfont(mutateCpfont(twoStyles, (_bytes, view) => {
      view.setUint32(88, 100, true);
    }))).toThrow(/overlap/i);
  });

  it('rejects interval or glyph fixed sections outside the style region', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint32(36, 100, true);
    }))).toThrow(/fixed section/i);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint32(40, 100, true);
    }))).toThrow(/fixed section/i);
  });

  it('rejects reversed interval ranges and interval-derived glyph count mismatches', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint32(64, 0x42, true);
    }))).toThrow(/interval start/i);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint32(68, 0x42, true);
    }))).toThrow(/glyph count/i);
  });

  it('rejects interval codepoints above the Unicode maximum', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint32(64, 0x110000, true);
      view.setUint32(68, 0x110000, true);
    }))).toThrow(/Unicode/i);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint32(68, 0x110000, true);
    }))).toThrow(/Unicode/i);
  });

  it('rejects non-contiguous interval glyph offsets', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint32(72, 1, true);
    }))).toThrow(/glyph offset/i);
  });

  it('rejects glyph bitmap ranges outside the style bitmap region', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes, view) => {
      bytes[76] = 8;
      view.setUint16(84, 2, true);
    }))).toThrow(/outside the style bitmap region/i);
  });

  it('rejects data lengths inconsistent with glyph dimensions', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint16(84, 0, true);
    }))).toThrow(/data length/i);
  });

  it('rejects unsupported kerning or ligature sections', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (_bytes, view) => {
      view.setUint16(49, 1, true);
    }))).toThrow(/kerning/i);
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes) => { bytes[55] = 1; }))).toThrow(
      /ligature/i,
    );
  });

  it('rejects nonzero reserved and glyph padding bytes', () => {
    const valid = packCpfont([makeStyle()]);
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes) => { bytes[13] = 1; }))).toThrow(
      /reserved/i,
    );
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes) => { bytes[33] = 1; }))).toThrow(
      /reserved/i,
    );
    expect(() => inspectCpfont(mutateCpfont(valid, (bytes) => { bytes[86] = 1; }))).toThrow(
      /padding/i,
    );
  });
});
