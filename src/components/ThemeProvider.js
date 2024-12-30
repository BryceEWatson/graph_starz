'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

function initializeTheme() {
  if (typeof window === 'undefined') return 'system'
  
  try {
    const stored = localStorage.getItem('theme')
    if (stored) return stored
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    
    return 'system'
  } catch (e) {
    console.error('Theme initialization error:', e)
    return 'system'
  }
}

export default function ThemeProvider({ children }) {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState(initializeTheme)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    try {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
      localStorage.setItem('theme', theme)
      
      // Update theme-color meta tag
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', isDark ? '#1a1a1a' : '#ffffff')
      }
    } catch (e) {
      console.error('Theme update error:', e)
    }
  }, [theme, mounted])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        const isDark = mediaQuery.matches
        document.documentElement.classList.toggle('dark', isDark)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const toggleTheme = () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light'
      setTheme(newTheme)
    } catch (e) {
      console.error('Theme toggle error:', e)
    }
  }

  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'system', toggleTheme: () => {} }}>
        {children}
      </ThemeContext.Provider>
    )
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}