export type ThemePreference = 'default' | 'dark';

export const THEME_STORAGE_KEY = 'ohif-ui-theme';
export const THEME_CHANGE_EVENT = 'ohif-theme-change';
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'dark';

function normalizeThemePreference(value?: string | null): ThemePreference {
  return value === 'default' || value === 'dark' ? value : DEFAULT_THEME_PREFERENCE;
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
  root.classList.remove('theme-white');
  root.dataset.ohifTheme = themePreference;
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_PREFERENCE;
  }

  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function getActiveThemePreference(): ThemePreference {
  if (typeof document === 'undefined') {
    return getStoredThemePreference();
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
