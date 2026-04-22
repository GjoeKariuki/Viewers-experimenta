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
import {
  THEME_CHANGE_EVENT,
  ThemePreference,
  getActiveThemePreference,
  setThemePreference,
} from '../../lib/themePreference';

const themeOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: 'Default', value: 'default' },
  { label: 'Dark', value: 'dark' },
  { label: 'White', value: 'white' },
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
    if (value !== 'default' && value !== 'dark' && value !== 'white') {
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
          size="default"
          className="text-primary hover:bg-primary-dark h-8 px-3"
          dataCY="theme-selector"
        >
          {t('Themes')}
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
