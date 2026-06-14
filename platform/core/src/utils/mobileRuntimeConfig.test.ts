import {
  applyMobileRenderingConfig,
  getMobileVolumeRenderingSettings,
  isMobileRenderingEnvironment,
} from './mobileRuntimeConfig';

const createWindow = ({
  width,
  narrow = false,
  coarse = false,
}: {
  width: number;
  narrow?: boolean;
  coarse?: boolean;
}) =>
  ({
    innerWidth: width,
    matchMedia: query => ({
      matches: query.includes('max-width: 767px') ? narrow : coarse,
    }),
  }) as Window;

describe('mobileRuntimeConfig', () => {
  it('identifies narrow and constrained touch viewports', () => {
    expect(isMobileRenderingEnvironment(createWindow({ width: 390, narrow: true }))).toBe(true);
    expect(
      isMobileRenderingEnvironment(createWindow({ width: 900, coarse: true }), {
        maxTouchPoints: 5,
      } as Navigator)
    ).toBe(true);
    expect(isMobileRenderingEnvironment(createWindow({ width: 1440 }))).toBe(false);
  });

  it('caps mobile concurrency without changing all-study prefetch scope', () => {
    const result = applyMobileRenderingConfig(
      {
        maxCacheSize: 3 * 1024 * 1024 * 1024,
        maxNumberOfWebWorkers: 6,
        webGlContextCount: 3,
        maxNumRequests: {
          interaction: 9,
          thumbnail: 8,
          prefetch: 10,
          compute: 6,
        },
        studyPrefetcher: {
          enabled: true,
          displaySetsCount: 1024,
          prefetchAllDisplaySets: true,
          maxNumPrefetchRequests: 10,
          waitForActiveDisplaySet: false,
          includeActiveDisplaySet: true,
          order: 'closest',
        },
      },
      createWindow({ width: 390, narrow: true }),
      { deviceMemory: 4 } as Navigator
    );

    expect(result.maxCacheSize).toBe(256 * 1024 * 1024);
    expect(result.maxNumberOfWebWorkers).toBe(2);
    expect(result.webGlContextCount).toBe(1);
    expect(result.maxNumRequests).toEqual({
      interaction: 6,
      thumbnail: 3,
      prefetch: 2,
      compute: 2,
    });
    expect(result.studyPrefetcher).toMatchObject({
      displaySetsCount: 1024,
      prefetchAllDisplaySets: true,
      maxNumPrefetchRequests: 2,
      waitForActiveDisplaySet: false,
    });
    expect(result.autoPlayCine).toBe(false);
  });

  it('leaves desktop configuration unchanged', () => {
    const config = { maxCacheSize: 1024 };

    expect(applyMobileRenderingConfig(config, createWindow({ width: 1440 }))).toBe(config);
    expect(getMobileVolumeRenderingSettings(config, createWindow({ width: 1440 }))).toBeNull();
  });

  it('allows a deployment to tune the mobile 3D quality profile', () => {
    const settings = getMobileVolumeRenderingSettings(
      {
        mobileRendering: {
          volumeRendering: {
            sampleDistance: 0.9,
            maximumSamplesPerRay: 1800,
          },
        },
      },
      createWindow({ width: 390, narrow: true })
    );

    expect(settings).toEqual({
      sampleDistance: 0.9,
      maximumSamplesPerRay: 1800,
    });
  });
});
