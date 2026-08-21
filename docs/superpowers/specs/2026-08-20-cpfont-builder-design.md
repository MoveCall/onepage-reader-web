# OnePage `.cpfont` Builder Design

## Goal

Replace the current browser-only TTF/OTF subsetter with a fully static font builder that produces CrossPoint-compatible `.cpfont` v4 files for OnePage. It must run on GitHub Pages, keep source fonts on the user's device, generate one `.cpfont` per requested point size, and provide individual downloads plus a family zip.

## Confirmed Compatibility Target

OnePage consumes CrossPoint's SD-card font format, not TTF, OTF, or TTC files directly. The builder follows the CrossPoint Tools converter at reference commit `7f341c7b3514056c983f5a2e62a1d7884a7a113a`:

- File magic: `CPFONT\0\0`
- Format version: `4`
- One output file per point size: `<Family>_<size>.cpfont`
- Each file can bundle regular, bold, italic, and bold-italic styles
- Glyphs are 2-bit grayscale bitmaps with interval, metric, optional kerning and ligature, and bitmap sections
- Installation path: `/.fonts/<Family>/` or `/fonts/<Family>/`

The existing HarfBuzz subsetter only removes unused outlines and emits another TTF/OTF. It cannot produce the bitmap-oriented `.cpfont` layout, which is the root cause of the current tool being incompatible with OnePage.

## Architecture

The entire conversion pipeline runs in the browser:

```text
FontTool.astro
  -> cpfont request validation
  -> dedicated Web Worker
       -> FreeType WASM rasterization
       -> CrossPoint interval and fallback resolution
       -> 8-bit coverage to 2-bit bitmap packing
       -> .cpfont v4 binary writer
  -> header validation
  -> individual downloads and family zip
```

No API request, server process, Python runtime, or external CDN is used. All JavaScript, WASM, and license files are bundled into the static Astro output. Source font bytes are transferred to the worker and never leave the browser.

### FreeType WASM

Use the immutable npm release `@zkl2333/freetype-wasm@2.14.3`, backed by FreeType 2.14.3. Its WASM build enables memory growth, supports multi-megabyte CJK fonts, exposes TTF/OTF/TTC/CFF rasterization, and is under 1 MB unpacked. The package lock pins its npm integrity hash.

The worker creates one FreeType face per uploaded style/fallback, selects Unicode character maps, and sets each requested point size at 150 DPI to match CrossPoint's Python converter. Glyphs use rendered grayscale output with embedded bitmaps disabled. The worker reads the returned bitmap pitch rather than assuming tightly packed, top-down rows.

### Browser worker

All expensive work runs in a module Web Worker so large CJK builds do not freeze the page. The worker processes one point size and style at a time and emits progress messages for interval validation, rasterization, packing, and completion.

The worker owns FreeType faces and releases them in `finally` blocks. A cancel action terminates the worker immediately, which also releases its WASM memory. Each build starts with a fresh worker so a previous large build cannot retain memory.

### `.cpfont` writer

The TypeScript writer mirrors CrossPoint v4's little-endian layout:

- 32-byte global header
- One 32-byte table-of-contents entry per style
- Per-style Unicode interval records
- 16-byte glyph records
- Optional kerning sections
- Optional ligature section
- Packed bitmap bytes

The first implementation writes zero kerning and ligature counts. Those sections are optional in v4 and the resulting files remain structurally valid and device-readable. This keeps the initial compatibility work focused on glyph coverage, metrics, rasterization, fallback behavior, and binary layout. Kerning and ligature extraction are a separate follow-up because FreeType's basic kerning API does not reproduce CrossPoint's FontTools GPOS/GSUB extraction.

## Source And Licensing

The TypeScript format constants and packing behavior are ported from these MIT-licensed CrossPoint Tools files, with the source repository and reference commit recorded in the project notice:

- `scripts/font-builder/fontconvert_sdcard.py`
- `scripts/font-builder/cpfont_version.py`

The FreeType WASM distribution includes FreeType, Brotli, and zlib. Their bundled license files are retained in the built assets, and project documentation credits the FreeType Project as required by the FreeType License.

Do not bundle CrossPoint's large default fallback font collection. Users can supply up to two regular-style fallback fonts; missing glyphs absent from the supplied chain are omitted.

## User Interface

The builder exposes:

- Family name
- Regular font, required
- Bold, italic, and bold-italic fonts, optional
- Fallback family 1 and 2 regular fonts, optional
- Point sizes, defaulting to `12, 14, 16, 18`
- CrossPoint coverage presets: reading, default, Latin Extended, Greek, Cyrillic, Vietnamese, Hebrew, Arabic, Armenian, Georgian, Ethiopic, Cherokee, Tifinagh, Bengali, Thai, Hangul, Simplified Chinese, Traditional Chinese, Japanese, symbols, and IPA
- Custom ranges in CrossPoint syntax such as `(0x2900-0x29FF)`
- Build/cancel control, progress, and a collapsed low-emphasis conversion log
- Individual `.cpfont` downloads and `<Family>_cpfonts.zip`

The old "drop hinting" control and TTF/OTF size-savings language are removed. Source inputs accept TTF and OTF. TTC is excluded from the UI until explicit face selection is implemented.

For CJK, Hangul, Japanese, or overlapping custom ranges, the client adds sizes 8 and 10 so OnePage can use the same family for small UI fallback text. Size 12 is already part of the default reading sizes.

## Conversion Rules

Base coverage is always included and contains `U+0000-U+007F`, `U+2000-U+206F`, and replacement character `U+FFFD`. Selected presets and custom ranges are additive, sorted, merged, and deduplicated.

For every style and codepoint, coverage resolves in this order:

1. The selected primary style
2. Fallback family 1 regular
3. Fallback family 2 regular

Fallbacks only fill missing glyphs; they never replace a glyph available in an earlier face. Font-wide line metrics come from the primary face to keep spacing stable.

Rasterization matches CrossPoint's main path:

- 150 DPI character sizing
- Rendered grayscale with embedded bitmaps disabled
- `advanceX` encoded as unsigned 12.4 fixed point
- Ascender, descender, and line advance derived from FreeType size metrics
- 8-bit coverage quantized at `4/16`, `8/16`, and `12/16` into 2-bit values
- Four 2-bit pixels packed into each byte

## Validation And Errors

Before building, the client validates the family name, required regular font, point sizes, interval syntax, file count, and total source size. Limits are explicit: four primary faces, two fallbacks, point sizes from 6 to 48, no more than eight distinct sizes, and no more than 128 MB of input font data.

Before offering a result, the main thread validates every generated file:

- At least a complete 32-byte global header
- `CPFONT\0\0` magic
- Version `4`
- A style count between 1 and 4
- A filename matching the sanitized family and requested size
- TOC and section offsets within the file bounds

Unsupported or corrupt fonts identify the failing style. Out-of-memory errors suggest reducing coverage or building fewer sizes. Cancellation is reported as cancelled, not failed. The worker log includes glyph and byte counts without exposing font contents.

## Testing

Tests are written before implementation and cover four boundaries:

1. Interval tests cover presets, custom range parsing, merging, fallback ownership, CJK detection, and automatic UI-size injection.
2. Binary writer tests use synthetic glyph data and assert exact header bytes, version, style TOC values, section offsets, glyph records, 2-bit packing, and rejection of truncated/out-of-bounds files.
3. FreeType integration tests rasterize a small local fixture font and assert glyph metrics, non-empty bitmap output, multiple point sizes, fallback glyph ownership, and valid `.cpfont` files.
4. Browser tests build a real family through the page, verify progress/cancellation, inspect every zip entry and header, and confirm that no TTF/OTF result or network upload is offered.

Final verification includes the full static Astro build and browser tests against the built GitHub Pages base path. A CJK smoke test confirms the worker remains responsive and WASM memory can grow beyond the old fixed-heap limit.

## Out Of Scope

- Server-side conversion or font uploads
- Shipping default Noto fallback fonts
- TTC face selection
- GPOS kerning and GSUB ligature extraction in the first implementation
- Bit-for-bit identity with CrossPoint's Python output
- Changing the OnePage firmware font reader
