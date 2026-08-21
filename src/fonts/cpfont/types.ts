export type FontStyleId = 0 | 1 | 2 | 3;
export type UnicodeInterval = readonly [number, number];

export interface FontSource {
  label: string;
  bytes: ArrayBuffer;
}

export interface CpfontBuildRequest {
  family: string;
  sizes: number[];
  presetIds: string[];
  customRanges: string;
  styles: Partial<Record<FontStyleId, FontSource>>;
  fallbacks: FontSource[];
}

export interface RasterGlyph {
  codePoint: number;
  width: number;
  height: number;
  advanceX: number;
  left: number;
  top: number;
  bitmap: Uint8Array;
}

export interface RasterStyle {
  styleId: FontStyleId;
  intervals: UnicodeInterval[];
  glyphs: RasterGlyph[];
  advanceY: number;
  ascender: number;
  descender: number;
}

export interface CpfontOutput {
  name: string;
  size: number;
  bytes: Uint8Array;
}

export type BuildEvent =
  | { type: 'progress'; percent: number; message: string }
  | { type: 'log'; message: string };
