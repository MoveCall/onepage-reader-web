# Pure-Static `.cpfont` Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incompatible TTF/OTF subset output with a GitHub Pages-compatible browser tool that generates validated CrossPoint `.cpfont` v4 files without uploading source fonts.

**Architecture:** A module Web Worker owns a memory-growable FreeType WASM instance, resolves requested Unicode coverage through primary and fallback faces, rasterizes 8-bit grayscale glyphs, and passes structured style data to a focused v4 binary writer. The Astro component collects inputs and renders progress/results; all expensive work and source font bytes stay in the browser.

**Tech Stack:** Astro 5, TypeScript, Web Workers, `@zkl2333/freetype-wasm@2.14.3`, JSZip, Vitest 4.1.11.

---

## File Map

- Create `src/fonts/cpfont/types.ts`: shared request, progress, raster, and output types.
- Create `src/fonts/cpfont/intervals.ts`: official CrossPoint presets, custom range parsing, merging, CJK detection, and size normalization.
- Create `src/fonts/cpfont/binary.ts`: 2-bit pixel packing, `.cpfont` v4 writer, and structural inspector.
- Create `src/fonts/cpfont/rasterize.ts`: FreeType face coverage resolution and one-style rasterization.
- Create `src/fonts/cpfont/builder.ts`: multi-size/multi-style build orchestration.
- Create `src/fonts/cpfont/worker.ts`: module Worker transport and WASM initialization.
- Create `src/fonts/cpfont/client.ts`: browser-side Worker lifecycle, cancellation, and validation.
- Create `src/fonts/cpfont/*.test.ts`: Vitest coverage for each pure boundary and FreeType integration.
- Add `tests/fixtures/fonts/ABeeZee-Regular.ttf` and its `OFL.txt`: small licensed integration fixture.
- Modify `src/components/FontTool.astro`: `.cpfont` controls, progress, log, results, and zip download.
- Modify `src/i18n/ui.ts`: truthful bilingual `.cpfont` copy and new control/error labels.
- Modify `src/pages/fonts.astro`, `src/pages/zh/fonts.astro`, and `README.md`: correct metadata and documentation.
- Add `public/licenses/freetype-wasm/`: notices shipped with the WASM artifact.
- Modify `package.json`, `package-lock.json`, and `.github/workflows/deploy.yml`: pinned dependencies and test gate.

Execution stays in the current worktree because the related font-page edits are already uncommitted there. Do not stage or commit anything without explicit authorization.

### Task 1: Install The Runtime And Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/fixtures/fonts/ABeeZee-Regular.ttf`
- Create: `tests/fixtures/fonts/OFL.txt`

- [ ] **Step 1: Install exact dependencies**

Run:

```bash
npm install @zkl2333/freetype-wasm@2.14.3
npm install --save-dev vitest@4.1.11
```

Expected: `package-lock.json` pins `@zkl2333/freetype-wasm` with npm integrity `sha512-A7fgJM0s+yh8NCQ9CAk4pbV+SpJp0DC3tirNPebL60ssc5D0awftWcR6zdD6teZUQgG2J8pk3AiqVXyHmElxDg==` and adds Vitest.

- [ ] **Step 2: Add deterministic test scripts**

Set the scripts section to include:

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Add the licensed fixture**

Download these exact upstream files from Google Fonts:

```text
https://raw.githubusercontent.com/google/fonts/main/ofl/abeezee/ABeeZee-Regular.ttf
https://raw.githubusercontent.com/google/fonts/main/ofl/abeezee/OFL.txt
```

Store them under `tests/fixtures/fonts/`. The test suite must never fetch a font at runtime.

- [ ] **Step 4: Verify the empty test harness**

Run: `npm test -- --passWithNoTests`

Expected: PASS with no test files found.

### Task 2: Implement CrossPoint Interval And Size Rules

**Files:**
- Create: `src/fonts/cpfont/types.ts`
- Create: `src/fonts/cpfont/intervals.ts`
- Create: `src/fonts/cpfont/intervals.test.ts`

- [ ] **Step 1: Write failing interval tests**

Create tests with these assertions:

```ts
import { describe, expect, it } from 'vitest';
import {
  BASE_INTERVALS,
  customIntervalsContainCjk,
  normalizeBuildSizes,
  parseCustomRanges,
  resolveIntervals,
} from './intervals';

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

  it('rejects malformed and reversed ranges', () => {
    expect(() => parseCustomRanges('0x2900-0x29FF')).toThrow('Use (0xSTART-0xEND)');
    expect(() => parseCustomRanges('(0x3000-0x2000)')).toThrow('Range start');
  });

  it('adds 8pt and 10pt UI sizes for CJK coverage', () => {
    expect(normalizeBuildSizes([12, 14, 16, 18], ['cjk-sc'], '')).toEqual([8, 10, 12, 14, 16, 18]);
    expect(normalizeBuildSizes([12, 14], ['reading'], '')).toEqual([12, 14]);
    expect(customIntervalsContainCjk('(0x3040-0x309F)')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/fonts/cpfont/intervals.test.ts`

Expected: FAIL because `./intervals` does not exist.

- [ ] **Step 3: Define shared types**

`types.ts` must export these stable interfaces:

```ts
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
```

- [ ] **Step 4: Implement interval behavior**

`intervals.ts` must port `BASE_INTERVALS`, `DEFAULT_INTERVALS`, and every `INTERVAL_PRESETS` entry from the approved design/reference converter. Export:

```ts
export function parseCustomRanges(input: string): UnicodeInterval[];
export function mergeIntervals(intervals: Iterable<UnicodeInterval>): UnicodeInterval[];
export function resolveIntervals(presetIds: string[], customRanges?: string): UnicodeInterval[];
export function customIntervalsContainCjk(input: string): boolean;
export function normalizeBuildSizes(sizes: number[], presetIds: string[], customRanges: string): number[];
```

Validation rules are exact: codepoints `0..0x10FFFF`, sizes `6..48`, at most eight distinct output sizes, custom tokens only in `(0xSTART-0xEND)` syntax, unknown preset IDs rejected, and CJK coverage appends sizes 8 and 10 before sorting.

- [ ] **Step 5: Run the focused and full tests**

Run:

```bash
npm test -- src/fonts/cpfont/intervals.test.ts
npm test
```

Expected: PASS.

### Task 3: Implement And Validate `.cpfont` V4 Binary Layout

**Files:**
- Create: `src/fonts/cpfont/binary.ts`
- Create: `src/fonts/cpfont/binary.test.ts`

- [ ] **Step 1: Write failing bitmap and writer tests**

```ts
import { describe, expect, it } from 'vitest';
import { inspectCpfont, packCpfont, quantizeGrayTo2Bit } from './binary';

describe('cpfont v4 binary writer', () => {
  it('quantizes four 8-bit grayscale pixels into each byte', () => {
    const pixels = Uint8Array.from([0, 63, 64, 127, 128, 191, 192, 255]);
    expect([...quantizeGrayTo2Bit(pixels, 8, 1, 8)]).toEqual([0x05, 0xaf]);
  });

  it('writes the exact v4 header, TOC, interval, glyph and bitmap offsets', () => {
    const bytes = packCpfont([{
      styleId: 0,
      intervals: [[0x41, 0x41]],
      glyphs: [{ codePoint: 0x41, width: 1, height: 1, advanceX: 16, left: 0, top: 1, bitmap: Uint8Array.of(0xc0) }],
      advanceY: 20,
      ascender: 15,
      descender: -5,
    }]);
    expect(new TextDecoder().decode(bytes.slice(0, 6))).toBe('CPFONT');
    expect(bytes.length).toBe(93);
    expect(inspectCpfont(bytes)).toMatchObject({ version: 4, styleCount: 1, styles: [{ styleId: 0, dataOffset: 64 }] });
  });

  it('rejects truncated and out-of-bounds data', () => {
    expect(() => inspectCpfont(new Uint8Array(31))).toThrow('header');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/fonts/cpfont/binary.test.ts`

Expected: FAIL because `./binary` does not exist.

- [ ] **Step 3: Implement 2-bit packing**

Implement `quantizeGrayTo2Bit(buffer, width, rows, pitch)` by visiting visible pixels in top-to-bottom row order, using `(rows - 1 - y) * abs(pitch)` for negative pitch. Convert coverage to `0`, `1`, `2`, or `3` at thresholds 64, 128, and 192, then append four pixels MSB-first to each byte. Padding bits in the last byte remain zero.

- [ ] **Step 4: Implement the writer and inspector**

Use these constants and exact little-endian offsets:

```ts
export const CPFONT_VERSION = 4;
export const CPFONT_HEADER_SIZE = 32;
export const CPFONT_STYLE_TOC_SIZE = 32;
export const CPFONT_GLYPH_SIZE = 16;

// Header: magic[8], version@8 u16, flags@10 u16=1, styleCount@12 u8.
// TOC: styleId@0 u8, intervalCount@4 u32, glyphCount@8 u32,
// advanceY@12 u8, ascender@13 i16, descender@15 i16,
// kernLeftCount@17 u16=0, kernRightCount@19 u16=0,
// kernLeftClasses@21 u8=0, kernRightClasses@22 u8=0,
// ligatureCount@23 u8=0, dataOffset@24 u32.
```

Intervals are 12-byte `<start u32, end u32, glyphOffset u32>` records. Glyphs are 16-byte `<width u8, height u8, advanceX u16, left i16, top i16, dataLength u16, pad u16, dataOffset u32>` records. Per-style section order is intervals, glyphs, empty kerning/ligature sections, then bitmap bytes.

`inspectCpfont` must reject bad magic, non-v4 versions, style counts outside `1..4`, duplicate style IDs, truncated TOCs, and section offsets outside the file.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- src/fonts/cpfont/binary.test.ts`

Expected: PASS.

### Task 4: Rasterize One Style With FreeType WASM

**Files:**
- Create: `src/fonts/cpfont/rasterize.ts`
- Create: `src/fonts/cpfont/rasterize.test.ts`

- [ ] **Step 1: Write the failing FreeType integration test**

The test loads the pinned WASM via `import.meta.resolve`, loads `ABeeZee-Regular.ttf`, and checks a compact ASCII build:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import initFreeType from '@zkl2333/freetype-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rasterizeStyle } from './rasterize';

describe('FreeType cpfont rasterization', () => {
  let ft: Awaited<ReturnType<typeof initFreeType>>;
  beforeAll(async () => {
    const wasm = readFileSync(fileURLToPath(import.meta.resolve('@zkl2333/freetype-wasm/freetype.wasm')));
    ft = await initFreeType({ wasmBinary: new Uint8Array(wasm) });
  });
  afterAll(() => ft.destroy());

  it('rasterizes grayscale glyphs with CrossPoint metrics', () => {
    const font = readFileSync('tests/fixtures/fonts/ABeeZee-Regular.ttf');
    const primary = ft.newFace(new Uint8Array(font));
    const style = rasterizeStyle(ft, primary, [], 12, [[0x20, 0x7e]], 0);
    primary.destroy();
    expect(style.glyphs.length).toBeGreaterThan(90);
    expect(style.glyphs.find((glyph) => glyph.codePoint === 0x41)?.bitmap.length).toBeGreaterThan(0);
    expect(style.advanceY).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/fonts/cpfont/rasterize.test.ts`

Expected: FAIL because `rasterizeStyle` does not exist.

- [ ] **Step 3: Implement coverage ownership**

For every requested codepoint, call `charIndex` on the primary face, then each fallback in order. Missing codepoints split validated Unicode runs. Return glyphs in interval/codepoint order so interval offsets stay valid.

- [ ] **Step 4: Implement CrossPoint rasterization**

For every involved face call `setCharSize(size << 6, size << 6, 150, 150)`. Load glyphs with `FT.LOAD_RENDER | FT.LOAD_NO_BITMAP`; require `FT.PIXEL_MODE_GRAY`; convert the bitmap with `quantizeGrayTo2Bit`.

Read `linearHoriAdvance` through the package's raw struct offsets after `loadGlyph`:

```ts
const faceRecord = ft.offsets.FT_FaceRec;
const slotRecord = ft.offsets.FT_GlyphSlotRec;
const slot = ft.module.getValue(face.ptr + faceRecord.glyph, 'i32');
const linearAdvance = ft.module.getValue(slot + slotRecord.linearHoriAdvance, 'i32');
const advanceX = (linearAdvance + (1 << 11)) >> 12;
```

Use `Math.ceil(metrics.height / 64)`, `Math.ceil(metrics.ascender / 64)`, and `Math.floor(metrics.descender / 64)` for line metrics. Reject glyph dimensions above 255, advance outside `0..65535`, or bitmap lengths above 65535 with a style/codepoint-specific error.

- [ ] **Step 5: Verify GREEN and regression tests**

Run:

```bash
npm test -- src/fonts/cpfont/rasterize.test.ts
npm test
```

Expected: PASS with no FreeType errors.

### Task 5: Build Multiple Styles And Sizes In A Worker

**Files:**
- Create: `src/fonts/cpfont/builder.ts`
- Create: `src/fonts/cpfont/builder.test.ts`
- Create: `src/fonts/cpfont/worker.ts`
- Create: `src/fonts/cpfont/client.ts`

- [ ] **Step 1: Write a failing multi-size builder test**

Build sizes 12 and 14 from the fixture and assert:

```ts
const outputs = await buildCpfontFamily({
  family: 'ABeeZee',
  sizes: [12, 14],
  presetIds: [],
  customRanges: '',
  styles: { 0: { label: 'regular', bytes: font.buffer.slice(font.byteOffset, font.byteOffset + font.byteLength) } },
  fallbacks: [],
}, { wasmBinary });

expect(outputs.map((output) => output.name)).toEqual(['ABeeZee_12.cpfont', 'ABeeZee_14.cpfont']);
for (const output of outputs) expect(inspectCpfont(output.bytes).version).toBe(4);
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/fonts/cpfont/builder.test.ts`

Expected: FAIL because `buildCpfontFamily` does not exist.

- [ ] **Step 3: Implement deterministic family orchestration**

Export:

```ts
export async function buildCpfontFamily(
  request: CpfontBuildRequest,
  options: { wasmBinary: Uint8Array; onEvent?: (event: BuildEvent) => void },
): Promise<CpfontOutput[]>;
```

Sanitize family names to `[A-Za-z0-9_-]`, require style `0`, resolve intervals/sizes once, create faces once, rasterize styles in ID order for each size, call `packCpfont`, inspect the result, and emit names `<Family>_<size>.cpfont`. Destroy all faces and FreeType in `finally`.

- [ ] **Step 4: Implement Worker transport**

`worker.ts` imports the WASM as a Vite asset:

```ts
import wasmUrl from '@zkl2333/freetype-wasm/freetype.wasm?url';
```

It handles one `{ type: 'build', request }` message, fetches the same-origin WASM URL, calls `buildCpfontFamily`, forwards progress/log events, then posts `{ type: 'complete', outputs }` with every output `ArrayBuffer` in the transfer list. Errors are normalized to `{ type: 'error', message }`.

- [ ] **Step 5: Implement browser lifecycle and cancellation**

`client.ts` exports `startCpfontBuild(request, callbacks)` and returns `{ cancel() }`. It creates a fresh worker with:

```ts
new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
```

It terminates the worker after completion/error, validates returned files with `inspectCpfont`, distinguishes cancellation from failure, and never calls `fetch` except inside the worker for the same-origin WASM asset.

- [ ] **Step 6: Verify GREEN**

Run: `npm test -- src/fonts/cpfont/builder.test.ts`

Expected: PASS with two v4 outputs.

### Task 6: Replace The Font Tool UI And Copy

**Files:**
- Modify: `src/components/FontTool.astro`
- Modify: `src/i18n/ui.ts`
- Modify: `src/pages/fonts.astro`
- Modify: `src/pages/zh/fonts.astro`

- [ ] **Step 1: Add a failing request-normalization test**

Extract and test `createBuildRequest(formState)` in `client.ts`. It must reject a missing regular font, preserve style IDs `0..3`, cap total inputs at 128 MB, parse four default sizes, and append CJK UI sizes through `normalizeBuildSizes`.

Run: `npm test -- src/fonts/cpfont/client.test.ts`

Expected: FAIL before the function exists.

- [ ] **Step 2: Implement request normalization and verify GREEN**

Run: `npm test -- src/fonts/cpfont/client.test.ts`

Expected: PASS.

- [ ] **Step 3: Replace incompatible controls**

Keep the existing compact visual language, but change the form to these IDs and semantics:

```text
familyName
fileRegular, fileBold, fileItalic, fileBoldItalic
fallback1Regular, fallback2Regular
fontSizes (comma-separated, default "12,14,16,18")
preset checkboxes using official preset IDs
customRanges
buildBtn, cancelBtn
progressWrap, progressBar, progressText
buildLog inside a collapsed <details>
resultsPanel, fileList, downloadAllBtn
```

Remove `extraText`, `dropHints`, HarfBuzz imports, and every `.ttf`/`.otf` output path. File inputs accept only `.ttf,.otf` in this release.

- [ ] **Step 4: Wire progress, cancellation, and downloads**

Read files with `arrayBuffer`, call `startCpfontBuild`, update progress without resizing the layout, and show errors in the panel instead of `alert`. Each result row downloads a `.cpfont`; the zip contains `<Family>/<Family>_<size>.cpfont` and is named `<Family>_cpfonts.zip`. Revoke all object URLs before rebuilding and on page unload.

- [ ] **Step 5: Replace bilingual copy**

English lede:

```text
Build CrossPoint-compatible .cpfont files for OnePage, entirely in your browser. Your source fonts never leave this device.
```

Chinese lede:

```text
在浏览器里生成 OnePage 可直接读取的 CrossPoint .cpfont 字体。源字体始终留在你的设备上。
```

Installation steps must point to `/.fonts/<Family>/` or `/fonts/<Family>/`, say that files are named `<Family>_<size>.cpfont`, and mention rebooting/rescanning fonts. Page metadata must describe `.cpfont`, not TTF subsetting.

- [ ] **Step 6: Run tests and type/build checks**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass and Astro builds under `/onepage-reader-web/`.

### Task 7: Ship Licenses, Documentation, CI, And Browser Verification

**Files:**
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `public/licenses/freetype-wasm/*`
- Modify: `README.md`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Preserve upstream notices**

Copy the installed package's `LICENSE` and complete `dist/licenses/` directory into `public/licenses/freetype-wasm/`. Add `THIRD_PARTY_NOTICES.md` naming:

```text
CrossPoint Tools converter logic, MIT, reference commit 7f341c7b3514056c983f5a2e62a1d7884a7a113a.
@zkl2333/freetype-wasm wrapper/build scripts, MIT.
Portions of this software are copyright © The FreeType Project (www.freetype.org). All rights reserved.
```

- [ ] **Step 2: Correct README documentation**

Describe the font tool as a static FreeType WASM `.cpfont` v4 builder. Remove the HarfBuzz subsetter claim. Document that TTF/OTF files stay local, outputs install under `/.fonts/<Family>/` or `/fonts/<Family>/`, and first-release output omits GPOS/GSUB kerning/ligature tables.

- [ ] **Step 3: Gate deployment on tests**

Add this step between `npm ci` and the Astro build in `.github/workflows/deploy.yml`:

```yaml
- name: Run tests
  run: npm test
```

- [ ] **Step 4: Run final automated verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass; `dist/` contains the worker chunk, FreeType WASM, `.cpfont` page assets, and `licenses/freetype-wasm/`.

- [ ] **Step 5: Run browser verification**

Start `npm run dev -- --host 127.0.0.1`, open `http://127.0.0.1:4321/onepage-reader-web/fonts/`, select the fixture font, build sizes 12 and 14, and verify:

```text
Progress advances while the UI remains interactive.
Two files are offered: ABeeZee_12.cpfont and ABeeZee_14.cpfont.
Each begins with CPFONT\0\0 and reports v4/styleCount=1.
The zip contains ABeeZee/ABeeZee_12.cpfont and ABeeZee/ABeeZee_14.cpfont.
No font upload request appears in the network log.
Cancel terminates an active build and permits a fresh build.
English and Chinese pages fit at desktop and mobile widths without overlap.
```

- [ ] **Step 6: Run a CJK smoke test**

Use a local CJK TTF/OTF without adding it to the repository. Select Simplified Chinese, verify automatic sizes `8,10,12,14,16,18`, build at least size 12, inspect the generated v4 header, and confirm the worker does not freeze the page or fail at the old fixed 16 MB WASM heap boundary.
