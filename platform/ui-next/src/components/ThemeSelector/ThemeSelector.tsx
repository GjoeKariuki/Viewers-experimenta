import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../DropdownMenu';
import { Button } from '../Button';
import { Icons } from '../Icons';
import {
  THEME_CHANGE_EVENT,
  ThemePreference,
  getActiveThemePreference,
  setThemePreference,
} from '../../lib/themePreference';

const themeOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: 'Default', value: 'default' },
  { label: 'Dark', value: 'dark' },
];

function ThemeSelector() {
  const { t } = useTranslation('Buttons');
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() =>
    getActiveThemePreference()
  );

  useEffect(() => {
    const syncThemePreference = () => {
      setThemePreferenceState(getActiveThemePreference());
    };

    window.addEventListener(THEME_CHANGE_EVENT, syncThemePreference as EventListener);
    window.addEventListener('storage', syncThemePreference);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncThemePreference as EventListener);
      window.removeEventListener('storage', syncThemePreference);
    };
  }, []);

  const onValueChange = (value: string) => {
    if (value !== 'default' && value !== 'dark') {
      return;
    }

    const nextThemePreference = value as ThemePreference;
    setThemePreference(nextThemePreference);
    setThemePreferenceState(nextThemePreference);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground hover:bg-primary/25 h-8 w-8"
          dataCY="theme-selector"
          aria-label={t('Themes')}
          title={t('Themes')}
        >
          <Icons.ColorChange className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[10rem]"
      >
        <DropdownMenuLabel>{t('Themes')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={themePreference}
          onValueChange={onValueChange}
        >
          {themeOptions.map(option => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeSelector;
