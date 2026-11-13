'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type CaretStyle = 'line' | 'block' | 'underline' | 'glow';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  fontSize: number; // in pixels (e.g. 18, 24, 28)
  setFontSize: (size: number) => void;
  caretStyle: CaretStyle;
  setCaretStyle: (style: CaretStyle) => void;
  showLiveWpm: boolean;
  setShowLiveWpm: (show: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [fontSize, setFontSizeState] = useState<number>(24);
  const [caretStyle, setCaretStyleState] = useState<CaretStyle>('line');
  const [showLiveWpm, setShowLiveWpmState] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('cyber_theme') as Theme | null;
    const savedFontSize = localStorage.getItem('cyber_font_size');
    const savedCaret = localStorage.getItem('cyber_caret') as CaretStyle | null;
    const savedLiveWpm = localStorage.getItem('cyber_live_wpm');

    if (savedTheme) {
      setThemeState(savedTheme);
      applyHtmlClass(savedTheme);
    } else {
      applyHtmlClass('dark');
    }

    if (savedFontSize) {
      setFontSizeState(Number(savedFontSize) || 24);
    }
    if (savedCaret) {
      setCaretStyleState(savedCaret);
    }
    if (savedLiveWpm !== null) {
      setShowLiveWpmState(savedLiveWpm === 'true');
    }
  }, []);

  function applyHtmlClass(t: Theme) {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (t === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  }

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('cyber_theme', t);
    applyHtmlClass(t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const setFontSize = (size: number) => {
    setFontSizeState(size);
    localStorage.setItem('cyber_font_size', String(size));
  };

  const setCaretStyle = (style: CaretStyle) => {
    setCaretStyleState(style);
    localStorage.setItem('cyber_caret', style);
  };

  const setShowLiveWpm = (show: boolean) => {
    setShowLiveWpmState(show);
    localStorage.setItem('cyber_live_wpm', String(show));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        fontSize,
        setFontSize,
        caretStyle,
        setCaretStyle,
        showLiveWpm,
        setShowLiveWpm,
      }}
    >
      <div className={theme === 'dark' ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
