import React, { createContext, useContext, useEffect, useState } from 'react';

type ColorScheme = 'light' | 'dark';

interface ThemeContextValue {
  isDark: boolean;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialColorScheme = (): ColorScheme => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem('saal-theme');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // localStorageアクセス制限等の例外を無視
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
};

const applyThemeToDOM = (scheme: ColorScheme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (scheme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    root.setAttribute('data-mantine-color-scheme', 'dark');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.setAttribute('data-mantine-color-scheme', 'light');
  }
  try {
    localStorage.setItem('saal-theme', scheme);
  } catch {
    // localStorageアクセス制限等の例外を無視
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(getInitialColorScheme);

  useEffect(() => {
    applyThemeToDOM(colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      try {
        const saved = localStorage.getItem('saal-theme');
        if (!saved) {
          setColorSchemeState(e.matches ? 'dark' : 'light');
        }
      } catch {
        setColorSchemeState(e.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const toggleTheme = () => {
    setColorSchemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  const isDark = colorScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ isDark, colorScheme, toggleTheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): {
  isDark: boolean;
  colorScheme: 'light' | 'dark';
  toggleTheme: () => void;
  setColorScheme: (scheme: 'light' | 'dark') => void;
} => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
