import React, { useEffect } from 'react';
import '../../tailwind.css';
import '../../assets/styles.css';
import { initializeThemePreference } from '../../lib/themePreference';

initializeThemePreference();

export const ThemeWrapper = ({ children }) => {
  useEffect(() => {
    initializeThemePreference();
  }, []);

  return <React.Fragment>{children}</React.Fragment>;
};
