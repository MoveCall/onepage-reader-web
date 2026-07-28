# Firmware hosting (web flasher)

The website's `/firmware/` page flashes over Web Serial with esp-web-tools. It
loads a manifest from a **fixed URL** on the firmware repo's latest release:

    https://github.com/MoveCall/crosspoint-onepage/releases/latest/download/manifest.json

The URL is fixed; its *content* changes per release. So the firmware `.bin`
carries a version number, stays fully traceable, and **the website never changes
when new firmware ships** — everything is driven from the firmware repo's release.

## Division of labour

- **This repo (website):** hardcodes only the fixed `latest/download/manifest.json`
  URL above (`src/components/Firmware.astro`). Nothing else to touch per release.
- **Firmware repo (`MoveCall/crosspoint-onepage`):** on each version tag, builds
  the merged image, generates `manifest.json`, and uploads **both** to the release.

## What the firmware repo needs (deliverables in `docs/firmware-repo/`)

- `release.yml` → drop at `.github/workflows/release.yml`
- `gen-manifest.mjs` → drop at `.github/gen-manifest.mjs`

On pushing a `v*` tag, the workflow:

1. Builds with ESP-IDF (`idf.py build`, target `esp32c61`).
2. Merges into one flashable 0x0 image `onepage-firmware-<version>.bin`
   (`esptool merge_bin @build/flash_args`).
3. Generates `manifest.json` pinning that build's versioned `.bin`
   (`chipFamily: "ESP32-C61"`, single part at offset 0).
4. Publishes both as release assets — so `latest/download/manifest.json` and the
   versioned `.bin` both resolve.

Two `TODO`s in `release.yml` for the firmware side to confirm: the ESP-IDF
version, and that `build/flash_args` is the correct merge input for the project.

## If the build ships separate images instead of one merged file

If the firmware publishes bootloader / partition-table / app separately rather
than a merged image, `gen-manifest.mjs` should emit multiple `parts` (each with
its own release-asset URL and offset: bootloader @ 0x0, partition-table @ 0x8000,
app @ 0x10000, …) instead of the single part.

## Notes

- esptool-js recognises ESP32-C61 (magic `0x4f81606f` → `ESP32C61ROM`), so the
  browser flash path works for this chip.
- GitHub release assets are served with permissive CORS, so the website (a
  different origin) can fetch both the manifest and the `.bin`.
