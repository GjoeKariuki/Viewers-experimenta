import { expect, test, visitStudy } from './utils';

test.describe('MIP workflow', () => {
  test.beforeEach(async ({ page }) => {
    const studyInstanceUID = '1.3.6.1.4.1.25403.345050719074.3824.20170125095438.5';
    const mode = 'viewer';
    await visitStudy(page, studyInstanceUID, mode, 5000);
  });

  test('should open the MIP + MPR workflow and disable depth-based measurement tools in MIP', async ({
    page,
  }) => {
    await page.getByTestId('MIPLayout').click();
    await page.waitForTimeout(4000);

    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);

    const viewportIds = await page.evaluate(() => {
      return window.cornerstone
        .getEnabledElements()
        .map(({ viewport }) => viewport.id)
        .sort();
    });

    expect(viewportIds).toEqual(['mip-overview', 'mpr-axial', 'mpr-coronal', 'mpr-sagittal']);

    await page.locator('[data-cy="viewport-pane"]').nth(0).click();
    await page.getByTestId('MeasurementTools-split-button-secondary').click();

    const lengthState = await page
      .locator('[data-cy="Length"][role="menuitem"]')
      .evaluate(element => ({
        ariaDisabled: element.getAttribute('aria-disabled'),
        dataDisabled: element.getAttribute('data-disabled'),
      }));

    expect(lengthState.ariaDisabled === 'true' || lengthState.dataDisabled === '').toBeTruthy();

    await page.getByTestId('MoreTools-split-button-secondary').click();

    const angleState = await page.getByTestId('Angle').evaluate(element => ({
      ariaDisabled: element.getAttribute('aria-disabled'),
      dataDisabled: element.getAttribute('data-disabled'),
    }));

    expect(angleState.ariaDisabled === 'true' || angleState.dataDisabled === '').toBeTruthy();
  });

  test('should apply CTA slab presets to the dedicated MIP viewport', async ({ page }) => {
    await page.getByTestId('MIPLayout').click();
    await page.waitForTimeout(4000);

    await page.getByTestId('MoreTools-split-button-secondary').click();
    await page.getByTestId('CTAThinMIPPreset').click();
    await page.waitForTimeout(1000);

    const thinSlabThickness = await page.evaluate(() => {
      const viewport = window.cornerstone
        .getEnabledElements()
        .find(({ viewport }) => viewport.id === 'mip-overview')?.viewport;

      return viewport?.getSlabThickness?.();
    });

    expect(Math.abs(thinSlabThickness - 10)).toBeLessThan(0.25);

    await page.getByTestId('MoreTools-split-button-secondary').click();
    await page.getByTestId('CTAThickMIPPreset').click();
    await page.waitForTimeout(1000);

    const thickSlabThickness = await page.evaluate(() => {
      const viewport = window.cornerstone
        .getEnabledElements()
        .find(({ viewport }) => viewport.id === 'mip-overview')?.viewport;

      return viewport?.getSlabThickness?.();
    });

    expect(Math.abs(thickSlabThickness - 40)).toBeLessThan(0.25);
  });

  test('should reset from MIP to the default layout when double-clicking another series', async ({
    page,
    leftPanelPageObject,
  }) => {
    await page.getByTestId('MIPLayout').click();
    await page.waitForTimeout(4000);

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

  test('should reset from MIP to the default layout when navigating to another series', async ({
    page,
  }) => {
    await page.getByTestId('MIPLayout').click();
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

  test('should route measurement jumps from the MIP overview back to a source viewport', async ({
    page,
    DOMOverlayPageObject,
    leftPanelPageObject,
    rightPanelPageObject,
    viewportPageObject,
  }) => {
    await rightPanelPageObject.toggle();
    await rightPanelPageObject.measurementsPanel.select();

    await leftPanelPageObject.loadSeriesByDescription('Body 4.0 CE', 1);
    await page.waitForTimeout(5000);

    await page.evaluate(() => {
      const { cornerstone } = window;
      const viewport = cornerstone?.getEnabledElements?.()[0]?.viewport;
      viewport?.setImageIdIndex?.(20);
      viewport?.render?.();
    });

    await page.waitForTimeout(2000);

    await page.getByTestId('MeasurementTools-split-button-secondary').click();
    await page.locator('[data-cy="Bidirectional"][role="menuitem"]').click();
    await viewportPageObject.active.clickAt([
      { x: 405, y: 277 },
      { x: 515, y: 339 },
    ]);

    await page.waitForTimeout(1500);
    await DOMOverlayPageObject.viewport.measurementTracking.confirm.click();

    await page.getByTestId('MIPLayout').click();
    await page.waitForTimeout(4000);

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
});
