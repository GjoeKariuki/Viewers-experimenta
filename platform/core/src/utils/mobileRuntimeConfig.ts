const MEBIBYTE = 1024 * 1024;

const DEFAULT_MOBILE_REQUEST_LIMITS = {
  interaction: 6,
  thumbnail: 3,
  prefetch: 2,
  compute: 2,
};

const DEFAULT_MOBILE_PREFETCH = {
  maxNumPrefetchRequests: 2,
};

type BrowserNavigator = Navigator & {
  deviceMemory?: number;
};

type MobileRenderingConfig = NonNullable<AppTypes.Config['mobileRendering']>;

const capPositiveNumber = (configuredValue: number | undefined, cap: number): number =>
  Math.max(1, Math.min(configuredValue ?? cap, cap));

const getBrowserWindow = (): Window | undefined =>
  typeof window === 'undefined' ? undefined : window;

const getBrowserNavigator = (): BrowserNavigator | undefined =>
  typeof navigator === 'undefined' ? undefined : (navigator as BrowserNavigator);

export const isMobileRenderingEnvironment = (
  browserWindow = getBrowserWindow(),
  browserNavigator = getBrowserNavigator()
): boolean => {
  if (!browserWindow) {
    return false;
  }

  const narrowViewport = browserWindow.matchMedia?.('(max-width: 767px)').matches;
  const constrainedTouchViewport =
    browserWindow.matchMedia?.('(pointer: coarse)').matches && browserWindow.innerWidth <= 1024;
  const touchPoints = browserNavigator?.maxTouchPoints ?? 0;

  return Boolean(
    narrowViewport ||
      constrainedTouchViewport ||
      (touchPoints > 0 && browserWindow.innerWidth <= 767)
  );
};

const getDefaultMobileCacheSize = (browserNavigator?: BrowserNavigator): number => {
  const deviceMemory = browserNavigator?.deviceMemory;

  if (deviceMemory && deviceMemory <= 4) {
    return 256 * MEBIBYTE;
  }

  if (deviceMemory && deviceMemory >= 8) {
    return 512 * MEBIBYTE;
  }

  return 384 * MEBIBYTE;
};

export const applyMobileRenderingConfig = (
  appConfig: AppTypes.Config,
  browserWindow = getBrowserWindow(),
  browserNavigator = getBrowserNavigator()
): AppTypes.Config => {
  const mobileConfig = appConfig.mobileRendering;

  if (
    mobileConfig?.enabled === false ||
    !isMobileRenderingEnvironment(browserWindow, browserNavigator)
  ) {
    return appConfig;
  }

  const maxCacheSize = mobileConfig?.maxCacheSize ?? getDefaultMobileCacheSize(browserNavigator);
  const maxNumberOfWebWorkers = mobileConfig?.maxNumberOfWebWorkers ?? 2;
  const webGlContextCount = mobileConfig?.webGlContextCount ?? 1;
  const requestLimits = mobileConfig?.maxNumRequests ?? {};
  const mobilePrefetch = mobileConfig?.studyPrefetcher ?? {};
  const configuredPrefetch = appConfig.studyPrefetcher;

  return {
    ...appConfig,
    autoPlayCine: mobileConfig?.autoPlayCine ?? false,
    maxCacheSize: Math.min(appConfig.maxCacheSize ?? maxCacheSize, maxCacheSize),
    maxNumberOfWebWorkers: capPositiveNumber(
      appConfig.maxNumberOfWebWorkers,
      maxNumberOfWebWorkers
    ),
    webGlContextCount: capPositiveNumber(appConfig.webGlContextCount, webGlContextCount),
    maxNumRequests: {
      ...appConfig.maxNumRequests,
      interaction: capPositiveNumber(
        appConfig.maxNumRequests?.interaction,
        requestLimits.interaction ?? DEFAULT_MOBILE_REQUEST_LIMITS.interaction
      ),
      thumbnail: capPositiveNumber(
        appConfig.maxNumRequests?.thumbnail,
        requestLimits.thumbnail ?? DEFAULT_MOBILE_REQUEST_LIMITS.thumbnail
      ),
      prefetch: capPositiveNumber(
        appConfig.maxNumRequests?.prefetch,
        requestLimits.prefetch ?? DEFAULT_MOBILE_REQUEST_LIMITS.prefetch
      ),
      compute: capPositiveNumber(
        appConfig.maxNumRequests?.compute,
        requestLimits.compute ?? DEFAULT_MOBILE_REQUEST_LIMITS.compute
      ),
    },
    studyPrefetcher: configuredPrefetch
      ? {
          ...configuredPrefetch,
          ...mobilePrefetch,
          displaySetsCount:
            mobilePrefetch.displaySetsCount === undefined
              ? configuredPrefetch.displaySetsCount
              : capPositiveNumber(
                  configuredPrefetch.displaySetsCount,
                  mobilePrefetch.displaySetsCount
                ),
          maxNumPrefetchRequests: capPositiveNumber(
            configuredPrefetch.maxNumPrefetchRequests,
            mobilePrefetch.maxNumPrefetchRequests ?? DEFAULT_MOBILE_PREFETCH.maxNumPrefetchRequests
          ),
          prefetchAllDisplaySets:
            mobilePrefetch.prefetchAllDisplaySets ?? configuredPrefetch.prefetchAllDisplaySets,
          waitForActiveDisplaySet:
            mobilePrefetch.waitForActiveDisplaySet ?? configuredPrefetch.waitForActiveDisplaySet,
        }
      : configuredPrefetch,
  };
};

export const getMobileVolumeRenderingSettings = (
  appConfig: AppTypes.Config,
  browserWindow = getBrowserWindow(),
  browserNavigator = getBrowserNavigator()
): { sampleDistance: number; maximumSamplesPerRay: number } | null => {
  if (
    appConfig.mobileRendering?.enabled === false ||
    !isMobileRenderingEnvironment(browserWindow, browserNavigator)
  ) {
    return null;
  }

  const mobileVolumeConfig: MobileRenderingConfig['volumeRendering'] =
    appConfig.mobileRendering?.volumeRendering;
  const hasHighMemory = (browserNavigator?.deviceMemory ?? 0) >= 8;

  return {
    sampleDistance: mobileVolumeConfig?.sampleDistance ?? (hasHighMemory ? 0.8 : 1.1),
    maximumSamplesPerRay: mobileVolumeConfig?.maximumSamplesPerRay ?? (hasHighMemory ? 2400 : 1400),
  };
};
