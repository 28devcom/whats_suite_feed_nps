import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import defaultTheme, { themes } from '../theme.js';

const ThemeModeContext = createContext(null);

const storageKey = 'whatssuite-theme-mode';
const DEFAULT_MODE = 'light';
const DARK_MODE_ENABLED = true; // Habilitado por solicitação do usuário.

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(DEFAULT_MODE);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored && themes[stored]) setMode(stored);
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(storageKey, next);
      return next;
    });
  };

  const value = useMemo(() => ({ mode, toggleMode }), [mode]);
  const theme = themes[mode] || defaultTheme;

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
};
