// Client-side font subsetter built on harfbuzz's subset wasm (hb_subset_*).
// Runs entirely in the browser — fonts never leave the device.
import wasmUrl from './harfbuzz-subset.wasm?url';
import { GB2312, GB2312_L1 } from './cjk';

type HB = Record<string, (...args: number[]) => number> & { memory: WebAssembly.Memory };

let hbPromise: Promise<HB> | null = null;
async function loadHB(): Promise<HB> {
  if (!hbPromise) {
    hbPromise = (async () => {
      const res = await fetch(wasmUrl);
      const bytes = await res.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return instance.exports as unknown as HB;
    })();
  }
  return hbPromise;
}

export interface Preset {
  id: string;
  ranges?: [number, number][];
  chars?: string;
}

// Base coverage is always included: ASCII, Latin-1, and common punctuation
// (smart quotes, dashes, ellipsis) so plain text never loses basic glyphs.
export const BASE_RANGES: [number, number][] = [
  [0x20, 0x7e],
  [0xa0, 0xff],
  [0x2010, 0x2027],
  [0x2030, 0x205e],
];

export const PRESETS: Record<string, Preset> = {
  'latin-ext': { id: 'latin-ext', ranges: [[0x100, 0x24f], [0x1e00, 0x1eff]] },
  greek: { id: 'greek', ranges: [[0x370, 0x3ff]] },
  cyrillic: { id: 'cyrillic', ranges: [[0x400, 0x4ff]] },
  'cjk-punct': { id: 'cjk-punct', ranges: [[0x3000, 0x303f], [0xfe30, 0xfe4f], [0xff00, 0xffef]] },
  symbols: {
    id: 'symbols',
    ranges: [
      [0x2190, 0x21ff], [0x2200, 0x22ff], [0x2460, 0x24ff],
      [0x2500, 0x257f], [0x25a0, 0x25ff], [0x2600, 0x26ff], [0x2700, 0x27bf],
    ],
  },
  'chinese-l1': { id: 'chinese-l1', chars: GB2312_L1 },
  'chinese-full': { id: 'chinese-full', chars: GB2312 },
  'cjk-all': { id: 'cjk-all', ranges: [[0x4e00, 0x9fff]] },
};

/** Parse "(0x2900-0x29FF),(0x2E00-0x2EFF)" or "0x100-0x17F, 0x2022" into ranges. */
export function parseRanges(input: string): [number, number][] {
  const out: [number, number][] = [];
  if (!input) return out;
  for (let chunk of input.split(',')) {
    chunk = chunk.trim().replace(/^\(|\)$/g, '').trim();
    if (!chunk) continue;
    const m = chunk.match(/^(0x[0-9a-f]+|\d+)\s*-\s*(0x[0-9a-f]+|\d+)$/i);
    if (m) {
      out.push([parseInt(m[1], m[1].startsWith('0x') ? 16 : 10), parseInt(m[2], m[2].startsWith('0x') ? 16 : 10)]);
    } else {
      const n = chunk.match(/^(0x[0-9a-f]+|\d+)$/i);
      if (n) {
        const v = parseInt(chunk, chunk.startsWith('0x') ? 16 : 10);
        out.push([v, v]);
      }
    }
  }
  return out;
}

/** Expand selected presets + custom ranges + literal "keep these characters" into a codepoint set. */
export function buildCodepointSet(presetIds: string[], customRanges: string, keepText: string): Set<number> {
  const cps = new Set<number>();
  const addRanges = (ranges: [number, number][]) => {
    for (const [a, b] of ranges) for (let c = a; c <= b; c++) cps.add(c);
  };
  addRanges(BASE_RANGES);
  for (const id of presetIds) {
    const p = PRESETS[id];
    if (!p) continue;
    if (p.ranges) addRanges(p.ranges);
    if (p.chars) for (const ch of p.chars) cps.add(ch.codePointAt(0)!);
  }
  addRanges(parseRanges(customRanges));
  for (const ch of keepText) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x20) cps.add(c);
  }
  return cps;
}

const HB_SUBSET_FLAGS_NO_HINTING = 0x02;
const HB_SUBSET_FLAGS_DESUBROUTINIZE = 0x40;

/** Subset a font (TTF/OTF bytes) down to the given codepoints. Returns new font bytes. */
export async function subsetFont(
  fontBytes: Uint8Array,
  codepoints: Iterable<number>,
  opts: { dropHints?: boolean } = {},
): Promise<Uint8Array> {
  const hb = await loadHB();
  const heap = () => new Uint8Array(hb.memory.buffer);

  const fontPtr = hb.malloc(fontBytes.length);
  heap().set(fontBytes, fontPtr);
  const blob = hb.hb_blob_create(fontPtr, fontBytes.length, 2 /* WRITABLE */, 0, 0);
  const face = hb.hb_face_create(blob, 0);
  hb.hb_blob_destroy(blob);

  const input = hb.hb_subset_input_create_or_fail();
  if (!input) {
    hb.hb_face_destroy(face); hb.free(fontPtr);
    throw new Error('Failed to create subset input');
  }
  const unicodeSet = hb.hb_subset_input_unicode_set(input);
  for (const cp of codepoints) hb.hb_set_add(unicodeSet, cp);

  let flags = HB_SUBSET_FLAGS_DESUBROUTINIZE;
  if (opts.dropHints) flags |= HB_SUBSET_FLAGS_NO_HINTING;
  hb.hb_subset_input_set_flags(input, flags);

  const subsetFace = hb.hb_subset_or_fail(face, input);
  hb.hb_subset_input_destroy(input);
  hb.hb_face_destroy(face);
  hb.free(fontPtr);
  if (!subsetFace) throw new Error('Subsetting failed (the font may be unsupported or corrupt)');

  const resultBlob = hb.hb_face_reference_blob(subsetFace);
  const lenPtr = hb.malloc(4);
  const dataPtr = hb.hb_blob_get_data(resultBlob, lenPtr);
  const len = new Uint32Array(hb.memory.buffer, lenPtr, 1)[0];
  const out = heap().slice(dataPtr, dataPtr + len);

  hb.free(lenPtr);
  hb.hb_blob_destroy(resultBlob);
  hb.hb_face_destroy(subsetFace);
  return out;
}
