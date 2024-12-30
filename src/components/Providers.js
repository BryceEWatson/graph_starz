'use client'

import { SessionProvider } from 'next-auth/react'
import ThemeProvider from './ThemeProvider'

export default function Providers({ children }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
