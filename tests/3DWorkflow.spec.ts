import { expect, test, visitStudy } from './utils';

test.describe('3D workflow', () => {
  test.beforeEach(async ({ page }) => {
    const studyInstanceUID = '1.3.6.1.4.1.25403.345050719074.3824.20170125095438.5';
    const mode = 'viewer';
    await visitStudy(page, studyInstanceUID, mode, 5000);
  });

  test('should reset from 3D four up to the default layout when double-clicking another series', async ({
    page,
    leftPanelPageObject,
    mainToolbarPageObject,
  }) => {
    await mainToolbarPageObject.layoutSelection.threeDFourUp.click();
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);

    await leftPanelPageObject.loadSeriesByDescription('Body 4.0 CE', 1);
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);

    const viewportIds = await page.evaluate(() => {
      return window.cornerstone
        .getEnabledElements()
        .map(({ viewport }) => viewport.id)
        .sort();
    });

    expect(viewportIds).toEqual(['default']);
  });

  test('should reset from 3D four up to the default layout when navigating to another series', async ({
    page,
    mainToolbarPageObject,
  }) => {
    await mainToolbarPageObject.layoutSelection.threeDFourUp.click();
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);

    await page.locator('[data-cy="viewport-pane"]').first().click();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);

    const viewportIds = await page.evaluate(() => {
      return window.cornerstone
        .getEnabledElements()
        .map(({ viewport }) => viewport.id)
        .sort();
    });

    expect(viewportIds).toEqual(['default']);
  });
});
