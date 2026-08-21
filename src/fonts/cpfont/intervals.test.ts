import { describe, expect, it } from 'vitest';
import type { IntervalPresetId } from './intervals';
import type { UnicodeInterval } from './types';
import {
  BASE_INTERVALS,
  DEFAULT_INTERVALS,
  INTERVAL_PRESETS,
  customIntervalsContainCjk,
  isIntervalPresetId,
  mergeIntervals,
  normalizeBuildSizes,
  parseCustomRanges,
  resolveIntervals,
} from './intervals';

const CJK_TRIGGER_BLOCKS = [
  [0x1100, 0x11ff],
  [0x2e80, 0x2fdf],
  [0x3000, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa960, 0xa97f],
  [0xac00, 0xd7ff],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xffef],
  [0x20000, 0x2ebef],
  [0x2f800, 0x2fa1f],
  [0x30000, 0x323af],
] as const;

const JUST_OUTSIDE_CJK_BLOCKS = [
  0x10ff, 0x1200,
  0x2e7f, 0x2fe0, 0x2fff,
  0x4dc0, 0x4dff, 0xa000,
  0xa95f, 0xa980, 0xabff, 0xd800,
  0xf8ff, 0xfb00, 0xfe2f, 0xfe50, 0xfeff, 0xfff0,
  0x1ffff, 0x2ebf0,
  0x2f7ff, 0x2fa20,
  0x2ffff, 0x323b0,
] as const;

const EXPECTED_INTERVAL_PRESETS = {
  base: [[0x0000, 0x007f], [0x2000, 0x206f]],
  default: [
    [0x0080, 0x00ff],
    [0x0100, 0x017f],
    [0x01a0, 0x01a1],
    [0x01af, 0x01b0],
    [0x01c4, 0x021f],
    [0x0300, 0x036f],
    [0x0400, 0x04ff],
    [0x1ea0, 0x1ef9],
    [0x20a0, 0x20cf],
    [0x2070, 0x209f],
    [0x2190, 0x21ff],
    [0x2200, 0x22ff],
    [0xfb00, 0xfb06],
  ],
  'latin-ext': [
    [0x0020, 0x007e],
    [0x0080, 0x00ff],
    [0x0100, 0x024f],
    [0x1e00, 0x1eff],
    [0x2000, 0x206f],
    [0xfb00, 0xfb06],
  ],
  greek: [[0x0370, 0x03ff], [0x1f00, 0x1fff]],
  cyrillic: [[0x0400, 0x04ff], [0x0500, 0x052f]],
  hebrew: [[0x0590, 0x05ff], [0xfb1d, 0xfb4f]],
  arabic: [
    [0x0600, 0x06ff],
    [0x0750, 0x077f],
    [0x08a0, 0x08ff],
    [0xfb50, 0xfdf9],
    [0xfe70, 0xfeff],
  ],
  georgian: [[0x10a0, 0x10ff], [0x2d00, 0x2d2f]],
  armenian: [[0x0530, 0x058f]],
  ethiopic: [[0x1200, 0x137f], [0x1380, 0x139f], [0x2d80, 0x2ddf]],
  vietnamese: [[0x01a0, 0x01b0], [0x1ea0, 0x1ef9]],
  'cjk-sc': [[0x3000, 0x303f], [0x4e00, 0x9fff], [0xf900, 0xfaff], [0xff00, 0xffef]],
  'cjk-tc': [
    [0x3000, 0x303f],
    [0x3100, 0x312f],
    [0x31a0, 0x31bf],
    [0x3400, 0x4dbf],
    [0x4e00, 0x9fff],
    [0xf900, 0xfaff],
    [0xff00, 0xffef],
  ],
  'cjk-jp': [
    [0x3000, 0x303f],
    [0x3040, 0x309f],
    [0x30a0, 0x30ff],
    [0x4e00, 0x9fff],
    [0xf900, 0xfaff],
    [0xff00, 0xffef],
  ],
  hangul: [[0xac00, 0xd7af], [0x1100, 0x11ff], [0x3130, 0x318f]],
  cherokee: [[0x13a0, 0x13ff], [0xab70, 0xabbf]],
  tifinagh: [[0x2d30, 0x2d7f]],
  thai: [[0x0e00, 0x0e7f]],
  bengali: [[0x0964, 0x0965], [0x0980, 0x09ff]],
  symbols: [
    [0x2070, 0x209f],
    [0x20a0, 0x20cf],
    [0x2150, 0x218f],
    [0x2190, 0x21ff],
    [0x2200, 0x22ff],
    [0x2500, 0x257f],
    [0x25a0, 0x25ff],
    [0x2600, 0x26ff],
    [0x2700, 0x27bf],
  ],
  reading: [
    [0x0080, 0x00ff],
    [0x0100, 0x017f],
    [0x01a0, 0x01a1],
    [0x01af, 0x01b0],
    [0x01c4, 0x021f],
    [0x0300, 0x036f],
    [0x0400, 0x04ff],
    [0x1ea0, 0x1ef9],
    [0x20a0, 0x20cf],
    [0x2070, 0x209f],
    [0x2190, 0x21ff],
    [0x2200, 0x22ff],
    [0xfb00, 0xfb06],
    [0x0180, 0x019f],
    [0x01a2, 0x01ae],
    [0x01b1, 0x01c3],
    [0x0220, 0x024f],
    [0x0370, 0x03ff],
    [0x1e00, 0x1e9f],
    [0x1efa, 0x1eff],
    [0x2150, 0x218f],
    [0x2500, 0x257f],
    [0x25a0, 0x25ff],
    [0x2600, 0x26ff],
    [0x2700, 0x27bf],
    [0x2900, 0x29ff],
    [0x2e00, 0x2e7f],
    [0x3000, 0x303f],
  ],
  'ipa-chars': [[0x0250, 0x02af], [0x02b0, 0x02ff]],
} as const satisfies Record<IntervalPresetId, readonly UnicodeInterval[]>;

function singleCodePointRange(codePoint: number): string {
  const hex = codePoint.toString(16).toUpperCase();
  return `(0x${hex}-0x${hex})`;
}

describe('cpfont intervals', () => {
  it('always includes base coverage and U+FFFD', () => {
    expect(resolveIntervals([])).toEqual([
      [0x0000, 0x007f],
      [0x2000, 0x206f],
      [0xfffd, 0xfffd],
    ]);
    expect(BASE_INTERVALS).toHaveLength(2);
  });

  it('parses and merges CrossPoint custom range syntax', () => {
    expect(parseCustomRanges('(0x2900-0x29FF),(0x29F0-0x2A0F)')).toEqual([
      [0x2900, 0x2a0f],
    ]);
  });

  it('sorts and merges overlapping or adjacent intervals', () => {
    expect(mergeIntervals([[0x20, 0x2f], [0x10, 0x1f], [0x2f, 0x30]])).toEqual([
      [0x10, 0x30],
    ]);
  });

  it('rejects malformed and reversed ranges', () => {
    expect(() => parseCustomRanges('0x2900-0x29FF')).toThrow('Use (0xSTART-0xEND)');
    expect(() => parseCustomRanges('(0X2900-0X29FF)')).toThrow('Use (0xSTART-0xEND)');
    expect(() => parseCustomRanges('(0x3000-0x2000)')).toThrow('Range start');
  });

  it('adds 8pt and 10pt UI sizes for CJK coverage', () => {
    expect(normalizeBuildSizes([12, 14, 16, 18], ['cjk-sc'], '')).toEqual([
      8, 10, 12, 14, 16, 18,
    ]);
    expect(normalizeBuildSizes([12, 14], ['reading'], '')).toEqual([12, 14]);
    expect(customIntervalsContainCjk('(0x3040-0x309F)')).toBe(true);
  });

  it.each(CJK_TRIGGER_BLOCKS)(
    'detects firmware CJK block boundaries %s-%s',
    (start, end) => {
      expect(customIntervalsContainCjk(singleCodePointRange(start))).toBe(true);
      expect(customIntervalsContainCjk(singleCodePointRange(end))).toBe(true);
    },
  );

  it.each(JUST_OUTSIDE_CJK_BLOCKS)(
    'does not classify just-outside codepoint %s as CJK',
    (codePoint) => {
      expect(customIntervalsContainCjk(singleCodePointRange(codePoint))).toBe(false);
    },
  );

  it.each(['cjk-sc', 'cjk-tc', 'cjk-jp', 'hangul'])(
    'adds UI sizes for the %s preset',
    (presetId) => {
      expect(normalizeBuildSizes([12], [presetId], '')).toEqual([8, 10, 12]);
    },
  );

  it('adds UI sizes when a custom range overlaps East Asian coverage', () => {
    expect(normalizeBuildSizes([12, 14], [], '(0x303F-0x3040)')).toEqual([8, 10, 12, 14]);
  });

  it('validates malformed custom ranges even when a CJK preset adds UI sizes', () => {
    expect(() => normalizeBuildSizes([12], ['cjk-sc'], '0x2900-0x29FF')).toThrow(
      'Use (0xSTART-0xEND)',
    );
  });

  it('matches the exact approved ranges for all 22 presets', () => {
    expect(Object.keys(EXPECTED_INTERVAL_PRESETS)).toHaveLength(22);
    expect(INTERVAL_PRESETS).toEqual(EXPECTED_INTERVAL_PRESETS);
  });

  it('composes base, preset, custom, and replacement intervals with merging', () => {
    expect(
      resolveIntervals(
        ['greek'],
        '(0x0080-0x0081),(0x03F0-0x040F),(0xFFFC-0xFFFC)',
      ),
    ).toEqual([
      [0x0000, 0x0081],
      [0x0370, 0x040f],
      [0x1f00, 0x206f],
      [0xfffc, 0xfffd],
    ]);
  });

  it('exports a typed preset guard while rejecting arbitrary strings', () => {
    const candidate: string = 'reading';

    expect(isIntervalPresetId(candidate)).toBe(true);
    if (isIntervalPresetId(candidate)) {
      const narrowed: IntervalPresetId = candidate;
      expect(narrowed).toBe('reading');
    }
    expect(isIntervalPresetId('not-a-preset')).toBe(false);
  });

  it('deep-freezes exported canonical interval policy', () => {
    expect(Object.isFrozen(BASE_INTERVALS)).toBe(true);
    expect(BASE_INTERVALS.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(DEFAULT_INTERVALS)).toBe(true);
    expect(DEFAULT_INTERVALS.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(INTERVAL_PRESETS)).toBe(true);
    expect(
      Object.values(INTERVAL_PRESETS).every(
        (intervals) => Object.isFrozen(intervals) && intervals.every(Object.isFrozen),
      ),
    ).toBe(true);
  });

  it('rejects unknown preset IDs', () => {
    expect(() => resolveIntervals(['not-a-preset'])).toThrow('Unknown interval preset');
    expect(() => normalizeBuildSizes([12], ['not-a-preset'], '')).toThrow(
      'Unknown interval preset',
    );
  });

  it('rejects custom codepoints above Unicode', () => {
    expect(() => parseCustomRanges('(0x10FFFF-0x110000)')).toThrow('0x10FFFF');
  });

  it.each([5, 49, 12.5])('rejects invalid font size %s', (size) => {
    expect(() => normalizeBuildSizes([size], [], '')).toThrow('integer from 6 to 48');
  });

  it('rejects more than eight distinct final sizes', () => {
    expect(() => normalizeBuildSizes([6, 7, 8, 9, 10, 11, 12, 13, 14], [], '')).toThrow(
      'at most eight distinct sizes',
    );
    expect(() => normalizeBuildSizes([6, 7, 11, 12, 13, 14, 15], ['cjk-sc'], '')).toThrow(
      'at most eight distinct sizes',
    );
  });

  it('explains automatic UI additions when they exceed the size limit', () => {
    expect(() =>
      normalizeBuildSizes([6, 7, 11, 12, 13, 14, 15], ['cjk-sc'], ''),
    ).toThrow(/automatic UI sizes.*6, 7, 8, 10, 11, 12, 13, 14, 15/i);
  });
});
