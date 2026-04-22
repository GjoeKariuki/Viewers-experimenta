export type ThemePreference = 'default' | 'dark' | 'white';

export const THEME_STORAGE_KEY = 'ohif-ui-theme';
export const THEME_CHANGE_EVENT = 'ohif-theme-change';

function normalizeThemePreference(value?: string | null): ThemePreference {
  return value === 'dark' || value === 'white' ? value : 'default';
}

function persistThemePreference(themePreference: ThemePreference) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  } catch {
    // Ignore storage failures and still apply the theme for the current session.
  }
}

function applyThemeClass(themePreference: ThemePreference) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', themePreference === 'dark');
  root.classList.toggle('theme-white', themePreference === 'white');
  root.dataset.ohifTheme = themePreference;
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'default';
  }

  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'default';
  }
}

export function getActiveThemePreference(): ThemePreference {
  if (typeof document === 'undefined') {
    return getStoredThemePreference();
  }

  if (document.documentElement.classList.contains('theme-white')) {
    return 'white';
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'default';
}

export function setThemePreference(
  themePreference: ThemePreference,
  {
    persist = true,
    notify = true,
  }: {
    persist?: boolean;
    notify?: boolean;
  } = {}
) {
  applyThemeClass(themePreference);

  if (persist) {
    persistThemePreference(themePreference);
  }

  if (notify && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, {
        detail: themePreference,
      })
    );
  }
}

export function initializeThemePreference() {
  setThemePreference(getStoredThemePreference(), {
    persist: false,
    notify: false,
  });
}
