# Restore Font Tool Navigation Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the localized Font Tool navigation link on desktop and mobile without overflowing the compact mobile header.

**Architecture:** Keep routing and labels in the existing `Nav.astro` and `ui.ts` boundaries. Add a focused Playwright navigation test that verifies localized destinations and the mobile visibility policy before changing the component.

**Tech Stack:** Astro 5, Tailwind CSS 4, Playwright 1.62, Chromium

---

### Task 1: Add Navigation Regression Coverage

**Files:**
- Create: `tests/e2e/navigation.e2e.ts`

- [ ] **Step 1: Write the failing localized-link test**

```ts
import { expect, test } from '@playwright/test';

test('links to the localized Font Tool from the site navigation', async ({ page }) => {
  await page.goto('/onepage-reader-web/');
  const englishLink = page.getByRole('link', { name: 'Font Tool' });
  await expect(englishLink).toBeVisible();
  await expect(englishLink).toHaveAttribute('href', '/onepage-reader-web/fonts/');

  await page.goto('/onepage-reader-web/zh/');
  const chineseLink = page.getByRole('link', { name: '字体工具' });
  await expect(chineseLink).toBeVisible();
  await expect(chineseLink).toHaveAttribute('href', '/onepage-reader-web/zh/fonts/');
});

test('keeps Font Tool discoverable in the 320 px mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/onepage-reader-web/');

  await expect(page.getByRole('link', { name: 'Font Tool' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
```

- [ ] **Step 2: Run the navigation test and verify RED**

Run: `npm run test:e2e -- tests/e2e/navigation.e2e.ts`

Expected: FAIL because neither `Font Tool` nor `字体工具` is rendered in the navigation.

### Task 2: Restore the Responsive Navigation Entry

**Files:**
- Modify: `src/components/Nav.astro:43-47`
- Test: `tests/e2e/navigation.e2e.ts`

- [ ] **Step 1: Add the Font Tool link and mobile GitHub policy**

Insert the localized first-party link immediately before Firmware and hide GitHub below `sm`:

```astro
<a href={fontsPath} class="px-1.5 py-1 font-medium text-ink/55 no-underline hover:text-ink">{t.fontTool}</a>
<a href={firmwarePath} class="px-1.5 py-1 font-medium text-ink/55 no-underline hover:text-ink">{t.firmware}</a>
<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="hidden px-1.5 py-1 font-medium text-ink/55 no-underline hover:text-ink sm:inline">{t.github}</a>
```

- [ ] **Step 2: Run the navigation test and verify GREEN**

Run: `npm run test:e2e -- tests/e2e/navigation.e2e.ts`

Expected: 2 tests pass in Chromium.

- [ ] **Step 3: Run full verification**

Run: `npm test`

Expected: all Vitest tests pass.

Run: `npm run build`

Expected: Astro builds 9 static pages.

Run: `npm run test:e2e`

Expected: all Font Tool and navigation Playwright tests pass.

- [ ] **Step 4: Commit the implementation**

```bash
git add src/components/Nav.astro tests/e2e/navigation.e2e.ts docs/superpowers/plans/2026-08-21-restore-font-nav-entry.md
git commit -m "feat: restore font tool navigation link"
```
