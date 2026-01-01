import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const updateTheme = () => {
      let effective: 'light' | 'dark' = 'light';
      
      if (theme === 'auto') {
        effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        effective = theme;
      }
      
      setEffectiveTheme(effective);
      document.documentElement.setAttribute('data-theme', effective);
      
      if (effective === 'dark') {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    };

    updateTheme();

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Utility hook to get theme-aware colors
 * Returns light colors for dark mode and dark colors for light mode
 */
export function useThemeColors() {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  return {
    text: {
      primary: isDark ? '#e0e0e0' : '#2c3e50',
      secondary: isDark ? '#b0b0b0' : '#7f8c8d',
      muted: isDark ? '#8a8a8a' : '#6c757d',
    },
    background: {
      primary: isDark ? '#2a2a2a' : '#ffffff',
      secondary: isDark ? '#1a1a1a' : '#f5f7fa',
      card: isDark ? '#2a2a2a' : '#ffffff',
    },
    border: {
      default: isDark ? '#3a3a3a' : '#ecf0f1',
    },
  };
}



