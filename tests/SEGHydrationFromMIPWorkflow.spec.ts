import { expect, test, visitStudy } from './utils';

test.beforeEach(async ({ page }) => {
  const studyInstanceUID = '1.3.12.2.1107.5.2.32.35162.30000015050317233592200000046';
  const mode = 'viewer';
  await visitStudy(page, studyInstanceUID, mode, 2000);
});

test('should preserve the MIP + MPR workflow when SEG is hydrated', async ({
  page,
  DOMOverlayPageObject,
  leftPanelPageObject,
}) => {
  await page.getByTestId('MIPLayout').click();
  await page.waitForTimeout(4000);

  await leftPanelPageObject.loadSeriesByDescription('SEG');
  await page.waitForTimeout(4000);

  await DOMOverlayPageObject.viewport.segmentationHydration.yes.click();
  await page.waitForTimeout(4000);

  await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);

  const viewportIds = await page.evaluate(() => {
    return window.cornerstone
      .getEnabledElements()
      .map(({ viewport }) => viewport.id)
      .sort();
  });

  expect(viewportIds).toEqual(['mip-overview', 'mpr-axial', 'mpr-coronal', 'mpr-sagittal']);
});
