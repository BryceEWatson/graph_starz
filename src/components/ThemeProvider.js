'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    // Get stored theme preference
    const stored = localStorage.getItem('theme');
    if (stored) {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const isDark = theme === 'dark' || 
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Update theme class
    document.documentElement.classList.toggle('dark', isDark);
    
    // Store preference
    localStorage.setItem('theme', theme);

    // Update background colors
    document.documentElement.style.setProperty('--graph-bg', isDark ? '#1a1f2e' : '#f7fafc');
    document.documentElement.style.setProperty('--graph-text', isDark ? '#e2e8f0' : '#2d3748');
  }, [theme, mounted]);

  const value = {
    theme,
    setTheme: (newTheme) => setTheme(newTheme),
    toggleTheme: () => setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  };

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}