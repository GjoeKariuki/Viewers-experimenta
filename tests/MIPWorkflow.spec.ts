import { expect, test, visitStudy } from './utils';

const MIP_VIEWPORT_IDS = ['mip-overview', 'mpr-axial', 'mpr-coronal', 'mpr-sagittal'];
const MPR_VIEWPORT_IDS = ['mpr-axial', 'mpr-coronal', 'mpr-sagittal'];

async function expectDiagnosticViewportCanvases(page, expectedViewportIds: string[]) {
  let lastStats: Array<{ id: string; ok: boolean; [key: string]: unknown }> = [];

  for (let attempt = 0; attempt < 30; attempt++) {
    lastStats = [];

    for (const id of expectedViewportIds) {
      const pane = page.locator(`[data-cy="viewport-pane"]:has(div[data-viewportid="${id}"])`);

      if (!(await pane.count())) {
        lastStats.push({ id, ok: false, reason: 'missing pane' });
        continue;
      }

      const screenshot = await pane.screenshot();
      const imageDataUrl = `data:image/png;base64,${screenshot.toString('base64')}`;
      const stats = await page.evaluate(async dataUrl => {
        const image = new Image();
        image.src = dataUrl;

        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('viewport screenshot decode failed'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');

        if (!context) {
          return { ok: false, reason: 'missing 2d context' };
        }

        context.drawImage(image, 0, 0);

        const cropX = Math.floor(canvas.width * 0.25);
        const cropY = Math.floor(canvas.height * 0.25);
        const cropWidth = Math.floor(canvas.width * 0.5);
        const cropHeight = Math.floor(canvas.height * 0.5);
        const pixels = context.getImageData(cropX, cropY, cropWidth, cropHeight).data;
        const samples = [];
        const sampleStride = Math.max(1, Math.floor(Math.sqrt((cropWidth * cropHeight) / 500)));

        for (let y = 0; y < cropHeight; y += sampleStride) {
          for (let x = 0; x < cropWidth; x += sampleStride) {
            const index = (y * cropWidth + x) * 4;
            samples.push((pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3);
          }
        }

        const sampleCount = samples.length;
        const mean = samples.reduce((sum, value) => sum + value, 0) / sampleCount;
        const variance =
          samples.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sampleCount;
        const standardDeviation = Math.sqrt(variance);
        const uniqueBuckets = new Set(samples.map(value => Math.round(value / 4))).size;

        return {
          width: canvas.width,
          height: canvas.height,
          sampleCount,
          standardDeviation,
          uniqueBuckets,
          ok: sampleCount >= 16 && standardDeviation > 2 && uniqueBuckets > 3,
        };
      }, imageDataUrl);

      lastStats.push({ id, ...stats });
    }

    if (lastStats.every(({ ok }) => ok)) {
      return lastStats;
    }

    await page.waitForTimeout(1000);
  }

  const viewportDiagnostics = await page.evaluate(ids => {
    const services = (window as unknown as { services?: Record<string, any> }).services;
    const cornerstoneViewportService = services?.cornerstoneViewportService;
    const viewportGridService = services?.viewportGridService;

    return ids.map(id => {
      const viewport = cornerstoneViewportService?.getCornerstoneViewport?.(id);
      const viewportInfo = cornerstoneViewportService?.getViewportInfo?.(id);
      const canvas = viewport?.element?.querySelector?.('canvas');

      const summarizeScalarData = scalarData => {
        if (!scalarData?.length) {
          return null;
        }

        const step = Math.max(1, Math.floor(scalarData.length / 512));
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let sum = 0;
        let count = 0;

        for (let index = 0; index < scalarData.length; index += step) {
          const value = scalarData[index];

          if (!Number.isFinite(value)) {
            continue;
          }

          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
          count++;
        }

        return {
          length: scalarData.length,
          sampledCount: count,
          sampledMin: min,
          sampledMax: max,
          sampledMean: count ? sum / count : null,
        };
      };

      let actors = [];
      try {
        actors =
          viewport?.getActors?.().map(({ uid, actor, referencedId }) => {
            const actorImageData = actor?.getMapper?.()?.getInputData?.();
            const actorScalars = actorImageData?.getPointData?.()?.getScalars?.();
            const viewportImageData = viewport?.getImageData?.(referencedId);
            const voxelManager = viewportImageData?.voxelManager;
            const scalarData = viewportImageData?.scalarData;

            return {
              uid,
              referencedId,
              dimensions: actorImageData?.getDimensions?.(),
              actorScalarRange: actorScalars?.getRange?.(),
              actorScalarLength: actorScalars?.getData?.()?.length,
              voxelRange: voxelManager?.getRange?.(),
              voxelMinMax: voxelManager?.getMinMax?.(),
              scalarSummary: summarizeScalarData(scalarData),
            };
          }) || [];
      } catch (error) {
        actors = [{ error: String(error) }];
      }

      return {
        id,
        viewportType: viewport?.type,
        displaySetUIDs: viewportGridService?.getDisplaySetsUIDsForViewport?.(id),
        viewportInfoType: viewportInfo?.getViewportType?.(),
        orientation: viewportInfo?.getOrientation?.(),
        imageIdsLength: viewport?.getImageIds?.()?.length,
        currentImageId: viewport?.getCurrentImageId?.(),
        canvas: canvas
          ? {
              width: canvas.width,
              height: canvas.height,
              clientWidth: canvas.clientWidth,
              clientHeight: canvas.clientHeight,
            }
          : null,
        actors,
      };
    });
  }, expectedViewportIds);

  throw new Error(
    `Expected diagnostic viewport pixels, received ${JSON.stringify({
      pixelStats: lastStats,
      viewportDiagnostics,
    })}`
  );
}

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

    expect(viewportIds).toEqual(MIP_VIEWPORT_IDS);

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

  test('should render diagnostic MIP + MPR after returning to the original CT series', async ({
    page,
    leftPanelPageObject,
    mainToolbarPageObject,
  }) => {
    const webglContextMessages = [];

    page.on('console', message => {
      const text = message.text();

      if (
        text.includes('Too many active WebGL contexts') ||
        text.includes('WebGL: INVALID_OPERATION: bindTexture')
      ) {
        webglContextMessages.push(text);
      }
    });

    await leftPanelPageObject.loadSeriesByDescription('Body 4.0 CE', 0);
    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);

    await mainToolbarPageObject.layoutSelection.MPR.click();
    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(3);
    await expectDiagnosticViewportCanvases(page, MPR_VIEWPORT_IDS);

    await mainToolbarPageObject.layoutSelection.MIPAndMPR.click();
    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);
    await expectDiagnosticViewportCanvases(page, MIP_VIEWPORT_IDS);

    await leftPanelPageObject.loadSeriesByDescription('Body 4.0 CE', 1);
    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);

    await leftPanelPageObject.loadSeriesByDescription('Body 4.0 CE', 0);
    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(1);

    await mainToolbarPageObject.layoutSelection.MIPAndMPR.click();
    await expect(page.locator('[data-cy="viewport-pane"]')).toHaveCount(4);
    await expectDiagnosticViewportCanvases(page, MIP_VIEWPORT_IDS);

    await page.screenshot({
      path: 'tests/test-results/mip-return-diagnostic.png',
      fullPage: true,
    });

    expect(webglContextMessages).toEqual([]);
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
