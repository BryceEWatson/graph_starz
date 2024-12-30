'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export default function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    // Get stored theme
    const stored = localStorage.getItem('theme')
    if (stored) {
      setTheme(stored)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Update theme
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = theme === 'dark' || (theme === 'system' && prefersDark)
    
    root.classList.toggle('dark', dark)
    setIsDark(dark)
    localStorage.setItem('theme', theme)
  }, [theme, mounted])

  const value = {
    theme,
    setTheme,
    isDark
  }

  if (!mounted) {
    return null
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}