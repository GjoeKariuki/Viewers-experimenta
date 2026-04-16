import { expect, test, visitStudy } from './utils';

test.beforeEach(async ({ page }) => {
  const studyInstanceUID = '1.3.6.1.4.1.14519.5.2.1.7695.4007.324475281161490036195179843543';
  const mode = 'viewer';
  await visitStudy(page, studyInstanceUID, mode, 2000);
});

test('should preserve the MIP + MPR workflow for SR hydration and jump back to source views', async ({
  page,
  DOMOverlayPageObject,
  leftPanelPageObject,
  rightPanelPageObject,
}) => {
  await page.getByTestId('MIPLayout').click();
  await page.waitForTimeout(4000);

  const mipOverlayText = page
    .locator('[data-cy="viewport-pane"]')
    .nth(0)
    .getByTestId('viewport-overlay-top-right');
  await expect(mipOverlayText).toContainText('MIP');

  await rightPanelPageObject.toggle();
  await rightPanelPageObject.measurementsPanel.select();

  await leftPanelPageObject.loadSeriesByModality('SR');
  await page.waitForTimeout(2000);

  await DOMOverlayPageObject.viewport.segmentationHydration.yes.click();
  await page.waitForTimeout(3000);

  await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);

  const viewportIds = await page.evaluate(() => {
    return window.cornerstone
      .getEnabledElements()
      .map(({ viewport }) => viewport.id)
      .sort();
  });

  expect(viewportIds).toEqual(['mip-overview', 'mpr-axial', 'mpr-coronal', 'mpr-sagittal']);

  await page.locator('[data-cy="viewport-pane"]').nth(0).click();
  await rightPanelPageObject.measurementsPanel.panel.nthMeasurement(0).click();
  await page.waitForTimeout(2000);

  const activeViewportId = await page.evaluate(() => {
    const enabledElements = window.cornerstone.getEnabledElements();
    const active = enabledElements.find(({ viewport }) => {
      const pane = viewport.element.closest('[data-cy="viewport-pane"]');
      return pane?.getAttribute('data-is-active') === 'true';
    });

    return active?.viewport?.id;
  });

  expect(activeViewportId).toBe('mpr-axial');
});
