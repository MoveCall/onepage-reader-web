import type { UnicodeInterval } from './types';

const MAX_CODE_POINT = 0x10ffff;
const CUSTOM_RANGE_PATTERN = /^\(0x([0-9a-fA-F]+)-0x([0-9a-fA-F]+)\)$/;

function freezeIntervals<const T extends readonly UnicodeInterval[]>(intervals: T): T {
  for (const interval of intervals) Object.freeze(interval);
  return Object.freeze(intervals);
}

function freezePresetMap<
  const T extends Readonly<Record<string, readonly UnicodeInterval[]>>,
>(presets: T): T {
  for (const intervals of Object.values(presets)) freezeIntervals(intervals);
  return Object.freeze(presets);
}

export const BASE_INTERVALS = freezeIntervals([
  [0x0000, 0x007f],
  [0x2000, 0x206f],
] as const satisfies readonly UnicodeInterval[]);

export const DEFAULT_INTERVALS = freezeIntervals([
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
] as const satisfies readonly UnicodeInterval[]);

const RAW_INTERVAL_PRESETS = {
  base: BASE_INTERVALS,
  default: DEFAULT_INTERVALS,
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
    ...DEFAULT_INTERVALS,
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
} as const satisfies Readonly<Record<string, readonly UnicodeInterval[]>>;

export type IntervalPresetId = keyof typeof RAW_INTERVAL_PRESETS;

export const INTERVAL_PRESETS = freezePresetMap(RAW_INTERVAL_PRESETS);

export function isIntervalPresetId(value: string): value is IntervalPresetId {
  return Object.prototype.hasOwnProperty.call(INTERVAL_PRESETS, value);
}

const EAST_ASIAN_PRESET_IDS = new Set<IntervalPresetId>(
  ['cjk-sc', 'cjk-tc', 'cjk-jp', 'hangul'] as const satisfies readonly IntervalPresetId[],
);
const CJK_TRIGGER_INTERVALS = freezeIntervals([
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
] as const satisfies readonly UnicodeInterval[]);

function validateInterval(start: number, end: number): void {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start > MAX_CODE_POINT ||
    end < 0 ||
    end > MAX_CODE_POINT
  ) {
    throw new Error('Unicode range codepoints must be integers from 0x0 to 0x10FFFF');
  }
  if (start > end) {
    throw new Error('Range start must be less than or equal to range end');
  }
}

function normalizePresetIds(presetIds: string[]): IntervalPresetId[] {
  return presetIds.map((presetId) => {
    const normalizedId = presetId.trim().toLowerCase();
    if (!isIntervalPresetId(normalizedId)) {
      throw new Error(`Unknown interval preset: ${presetId}`);
    }
    return normalizedId;
  });
}

function overlapsAny(interval: UnicodeInterval, candidates: readonly UnicodeInterval[]): boolean {
  return candidates.some(([start, end]) => interval[0] <= end && interval[1] >= start);
}

export function parseCustomRanges(input: string): UnicodeInterval[] {
  if (input.trim() === '') return [];

  const intervals = input.split(',').map((rawToken) => {
    const token = rawToken.trim();
    const match = CUSTOM_RANGE_PATTERN.exec(token);
    if (!match) {
      throw new Error(`Invalid custom range "${token}". Use (0xSTART-0xEND)`);
    }

    const start = Number.parseInt(match[1], 16);
    const end = Number.parseInt(match[2], 16);
    validateInterval(start, end);
    return [start, end] as const;
  });

  return mergeIntervals(intervals);
}

export function mergeIntervals(intervals: Iterable<UnicodeInterval>): UnicodeInterval[] {
  const sorted = Array.from(intervals, ([start, end]) => {
    validateInterval(start, end);
    return [start, end] as UnicodeInterval;
  }).sort((left, right) => left[0] - right[0] || left[1] - right[1]);

  const merged: UnicodeInterval[] = [];
  for (const [start, end] of sorted) {
    const previous = merged.at(-1);
    if (previous && start <= previous[1] + 1) {
      merged[merged.length - 1] = [previous[0], Math.max(previous[1], end)];
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

export function resolveIntervals(presetIds: string[], customRanges = ''): UnicodeInterval[] {
  const normalizedPresetIds = normalizePresetIds(presetIds);
  const intervals: UnicodeInterval[] = [...BASE_INTERVALS];

  for (const presetId of normalizedPresetIds) {
    intervals.push(...INTERVAL_PRESETS[presetId]);
  }
  intervals.push(...parseCustomRanges(customRanges), [0xfffd, 0xfffd]);

  return mergeIntervals(intervals);
}

export function customIntervalsContainCjk(input: string): boolean {
  return parseCustomRanges(input).some((interval) => overlapsAny(interval, CJK_TRIGGER_INTERVALS));
}

export function normalizeBuildSizes(
  sizes: number[],
  presetIds: string[],
  customRanges: string,
): number[] {
  const normalizedPresetIds = normalizePresetIds(presetIds);
  const customIntervals = parseCustomRanges(customRanges);
  for (const size of sizes) {
    if (!Number.isInteger(size) || size < 6 || size > 48) {
      throw new Error(`Font size must be an integer from 6 to 48: ${size}`);
    }
  }

  const normalizedSizes = new Set(sizes);
  const needsUiSizes =
    normalizedPresetIds.some((presetId) => EAST_ASIAN_PRESET_IDS.has(presetId)) ||
    customIntervals.some((interval) => overlapsAny(interval, CJK_TRIGGER_INTERVALS));
  if (needsUiSizes) {
    normalizedSizes.add(8);
    normalizedSizes.add(10);
  }

  const result = [...normalizedSizes].sort((left, right) => left - right);
  if (result.length > 8) {
    const automaticContext = needsUiSizes ? ' after automatic UI sizes were added' : '';
    throw new Error(
      `A build may contain at most eight distinct sizes${automaticContext}; resulting sizes: ${result.join(', ')}`,
    );
  }

  return result;
}
