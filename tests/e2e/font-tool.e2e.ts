import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { inspectCpfont } from '../../src/fonts/cpfont/binary';

const fixture = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fonts/ABeeZee-Regular.ttf',
);

async function chooseRegularFont(page: Page): Promise<void> {
  await page.locator('#fileRegular').setInputFiles(fixture);
  await page.locator('#familyName').fill('ABeeZee');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/onepage-reader-web/fonts/');
  await expect(page.getByRole('heading', { name: 'Build fonts for OnePage.' })).toBeVisible();
});

test('builds and downloads valid cpfont files and a family zip', async ({ page }) => {
  await chooseRegularFont(page);
  await page.locator('#fontSizes').fill('12,14');
  await page.getByRole('button', { name: 'Build .cpfont' }).click();

  await expect(page.locator('#progressText')).toHaveText('Build complete.');
  await expect(page.getByRole('progressbar', { name: 'Font build progress' }))
    .toHaveAttribute('aria-valuenow', '100');
  await expect(page.locator('details')).not.toHaveAttribute('open', '');

  const fileLink = page.getByRole('link', { name: 'Download: ABeeZee_12.cpfont' });
  const [fontDownload] = await Promise.all([
    page.waitForEvent('download'),
    fileLink.click(),
  ]);
  const fontPath = await fontDownload.path();
  expect(fontPath).not.toBeNull();
  const fontBytes = new Uint8Array(await readFile(fontPath!));
  const metadata = inspectCpfont(fontBytes);
  expect(fontDownload.suggestedFilename()).toBe('ABeeZee_12.cpfont');
  expect(metadata.version).toBe(4);
  expect(metadata.styleCount).toBe(1);
  expect(metadata.styles.map((style) => style.styleId)).toEqual([0]);
  expect(metadata.styles[0].glyphCount).toBeGreaterThan(0);

  const [zipDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download all (.zip)' }).click(),
  ]);
  const zipPath = await zipDownload.path();
  expect(zipPath).not.toBeNull();
  const zip = await JSZip.loadAsync(await readFile(zipPath!));
  expect(Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort()).toEqual([
    'ABeeZee/ABeeZee_12.cpfont',
    'ABeeZee/ABeeZee_14.cpfont',
  ]);
});

test.describe('cancellation', () => {
  test.use({ serviceWorkers: 'block' });

  test('cancels an in-progress build without publishing partial results', async ({ page }) => {
    await page.route('**/worker-*.js', (route) => route.fulfill({
      contentType: 'application/javascript',
      body: 'self.onmessage = () => {};',
    }));
    await chooseRegularFont(page);
    await page.locator('input[name="preset"][value="cjk-sc"]').check();

    const workerRequested = page.waitForRequest('**/worker-*.js');
    await page.getByRole('button', { name: 'Build .cpfont' }).click();
    await workerRequested;

    const cancel = page.getByRole('button', { name: 'Cancel' });
    await expect(cancel).toBeEnabled();
    await cancel.click();

    await expect(page.locator('#progressText')).toHaveText('Build cancelled.');
    await expect(page.locator('#resultsPanel')).toHaveClass(/hidden/);
    await expect(page.getByRole('button', { name: 'Build .cpfont' })).toBeEnabled();
  });
});
