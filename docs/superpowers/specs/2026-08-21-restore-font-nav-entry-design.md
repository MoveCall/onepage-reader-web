# Restore Font Tool Navigation Entry

## Goal

Restore the bilingual Font Tool link in the site navigation without causing the compact mobile navigation to overflow.

## Design

- Add the existing localized `fontTool` label and `fontsPath` target beside Firmware.
- Show Font Tool on every viewport.
- Keep GitHub visible on `sm` and wider viewports, and hide it below `sm` so the first-party Font Tool remains discoverable on mobile.
- Leave the existing home, build log, firmware, language switch, and footer links unchanged.
- Do not add a menu, alter page routes, or change Font Tool behavior.

## Verification

- Confirm the English link points to `/onepage-reader-web/fonts/` and the Chinese link points to `/onepage-reader-web/zh/fonts/`.
- Check the navigation at desktop and 320 px mobile widths for overlap or wrapping.
- Run the static build and existing automated tests.
