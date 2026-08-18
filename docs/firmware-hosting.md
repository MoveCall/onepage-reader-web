# Firmware hosting (web flasher)

The website's `/firmware/` page flashes over Web Serial with **esptool-js**
(bundled from npm — see `src/firmware/flash.ts`). From the browser it fetches a
**manifest** and the firmware **`.bin`** — both hosted **same-origin** under
`public/firmware/`, served straight from GitHub Pages.

## Why same-origin

GitHub release assets do **not** send `Access-Control-Allow-Origin`, so fetching
them from the browser cross-origin fails with "Failed to download manifest".
GitHub Pages is static (no server of ours to proxy through), so the simplest
robust fix is to serve the manifest and the `.bin` from the same origin as the
site. No CORS involved.

## Layout

    public/firmware/
      manifest.json                  # flash manifest (small, in git)
      onepage-firmware-v0.1.0.bin    # merged 0x0 flash image (in git)

`manifest.json` pins `chipFamily: "ESP32-C61"` and a single part at offset 0 with
a **relative** path; the flasher resolves the `.bin` against the manifest URL
(same origin):

    { "path": "onepage-firmware-v0.1.0.bin", "offset": 0 }

The page reads it via `src/components/Firmware.astro` →
`${BASE_URL}firmware/manifest.json`, then hands the resolved URL + offset to
`flash()` in `src/firmware/flash.ts`.

## Flashing paths

`flash.ts` offers two paths, chosen by the two buttons on the page:

- **stub (default, full speed):** uploads esptool-js's `stub_flasher_32c61.json`
  to RAM, then flashes. esptool-js 0.6.0 ships the C61 stub, so this works on the
  reader (the approach crossmux.com also uses).
- **no-stub (fallback, slow):** skips the stub and flashes via the chip's ROM
  bootloader — for boards where the stub won't come up. Requires `compress: true`.

## To ship a new firmware build

1. Build the merged single-image `.bin` (full flash image from 0x0), e.g.
   `esptool.py --chip esp32c61 merge_bin -o onepage-firmware-vX.Y.Z.bin @build/flash_args`.
2. Drop it in `public/firmware/` (keep the version in the filename).
3. Edit `public/firmware/manifest.json`: bump `"version"` and set the part
   `"path"` to the new filename.
4. Delete the old `.bin` so the repo doesn't accumulate them.
5. Commit + push — GitHub Pages serves it; the page picks it up, no code change.

## Notes

- The `.bin` (~5.7 MB) is committed to this repo. That's the trade-off for
  same-origin simplicity. If firmware images get large or frequent, revisit a
  CORS-proxied release-asset approach instead.
- esptool-js recognises ESP32-C61 (magic `0x4f81606f` → `ESP32C61ROM`).
- If a build ships separate images (bootloader / partition-table / app) rather
  than one merged file, list multiple `parts`, each with its own filename and
  offset (bootloader @ 0x0, partition-table @ 0x8000, app @ 0x10000, …).

## To ship a new firmware build

1. Build the merged single-image `.bin` (full flash image from 0x0), e.g.
   `esptool.py --chip esp32c61 merge_bin -o onepage-firmware-vX.Y.Z.bin @build/flash_args`.
2. Drop it in `public/firmware/` (keep the version in the filename).
3. Edit `public/firmware/manifest.json`: bump `"version"` and set the part
   `"path"` to the new filename.
4. Delete the old `.bin` so the repo doesn't accumulate them.
5. Commit + push — GitHub Pages serves it; the page picks it up, no code change.

## Notes

- The `.bin` (~5.7 MB) is committed to this repo. That's the trade-off for
  same-origin simplicity. If firmware images get large or frequent, revisit a
  CORS-proxied release-asset approach instead.
- esptool-js recognises ESP32-C61 (magic `0x4f81606f` → `ESP32C61ROM`).
- If a build ships separate images (bootloader / partition-table / app) rather
  than one merged file, list multiple `parts`, each with its own filename and
  offset (bootloader @ 0x0, partition-table @ 0x8000, app @ 0x10000, …).
