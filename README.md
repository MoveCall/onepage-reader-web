<h1 align="center">
  <img src="docs/_archive/onepage_logo_blink.svg" alt="OnePage logo" height="46" />
  &nbsp;&nbsp;OnePage · 壹页
</h1>

<p align="center">
  Website &amp; build log for a 4.26″ open e-ink reader I'm building for myself, on an ESP32-C61.
</p>

<p align="center">
  <a href="https://movecall.github.io/onepage-reader-web/"><b>Live ↗</b></a>
</p>

---

It's a personal tinkering project, shared in the open — reflowable TXT/EPUB, careful CJK typography, a phone-friendly web setup. No roadmap promises, just what works so far, written down as it does.

---

## What's on the site

- **Build log** — rough notes from bring-up, newest first.
- **The object** — materials, and a live **in-browser simulator** of the reader.
- **Renders & tech specs** — a look at the design and the full hardware sheet.
- **Font tool** (`/fonts`) — converts local TTF/OTF sources into CrossPoint-compatible v4 `.cpfont` files, entirely in the browser. Nothing is uploaded.
- Bilingual: English (`/`) and 中文 (`/zh/`).

## The device, in short

4.26″ e-ink · 800×480 · 219 dpi · 1-bit B/W text (4-gray covers) · no frontlight · ESP32-C61 · 16 MB flash · 2 MB PSRAM · microSD (SPI, FAT32) · 7 physical keys, no touch · Wi-Fi 6 + Bluetooth LE · USB-C · 1000 mAh · 66.5 × 116 × 5 mm · 64 g.

## Tech stack

- [Astro](https://astro.build/) 5 (static output)
- Tailwind CSS 4
- The simulator is a port of the open-source [CrossPoint](https://github.com/crosspoint-reader) reader firmware compiled to WebAssembly.
- The font tool uses FreeType compiled to WebAssembly for glyph rasterization, plus JSZip for batch downloads.

## Font tool

The font tool is a pure-static browser converter: it reads local TTF or OTF
files and builds CrossPoint-compatible v4 `.cpfont` files without a server.
FreeType WebAssembly rasterizes the selected glyphs locally; source font bytes
never leave the browser.

Each build supports Regular, Bold, Italic, and Bold Italic styles, up to two
fallback fonts, the official CrossPoint character-range presets, custom Unicode
ranges, and point sizes from 6 to 48. CJK coverage automatically includes the
firmware UI sizes 8 and 10. Outputs are named `<Family>_<size>.cpfont`.

This first version stores raw glyph advances only; it does not apply GPOS/GSUB
kerning or ligature substitutions.

Keep those filenames and place the generated files in either
`/.fonts/<Family>/` or `/fonts/<Family>/` on the reader's SD card.

## Local development

```bash
npm install
npm run dev       # http://localhost:4321/onepage-reader-web/
npm test          # run the automated test suite
npm run build     # static output → dist/
npm run preview   # serve the built site locally
```

> The site is served under a base path (`/onepage-reader-web/`) to match GitHub Pages. If you rename the repo, change `base` in `astro.config.mjs` — that's the only place it lives.

## Deployment

Pushed to `main` → built and published to **GitHub Pages** by the workflow in `.github/workflows/deploy.yml`. Enable it once under **Settings → Pages → Source: GitHub Actions**.

### About the simulator

It needs cross-origin isolation (SharedArrayBuffer, for the threaded WASM). That's provided client-side by `coi-serviceworker.js`, which only works in a secure context — so it runs on GitHub Pages (HTTPS) and on `http://localhost`, but **not** over a plain-HTTP LAN address. The first visit reloads once to activate the service worker.

## Credits

- Reader firmware in the simulator: **CrossPoint** (MIT).
- Logo glyph outline: **LXGW WenKai / 霞鹜文楷** (SIL OFL 1.1).
- Font-builder dependencies and converter references: see [Third-Party Notices](THIRD_PARTY_NOTICES.md) and the [shipped FreeType WASM license assets](public/licenses/freetype-wasm/).

---

A personal build log. Names and brand are still settling.
