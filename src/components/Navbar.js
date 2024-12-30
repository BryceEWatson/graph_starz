'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useTheme } from './ThemeProvider'
import Image from 'next/image'
import UploadButton from './UploadButton'
import { ErrorBoundary } from 'react-error-boundary'
import { useState } from 'react'
import { useWhitelist } from '@/hooks/useWhitelist'

function UserAvatar({ user }) {
  const [imageError, setImageError] = useState(false)
  
  if (!user?.image || imageError) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {user?.name?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
    )
  }

  return (
    <Image
      src={user.image}
      alt={`${user.name}'s avatar`}
      width={32}
      height={32}
      className="rounded-full"
      onError={() => setImageError(true)}
      priority={true}
    />
  )
}

export default function Navbar() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { isWhitelisted } = useWhitelist()

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const handleSignOut = async () => {
    const callbackUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : 'https://graphstarz.com'
    
    await signOut({
      redirect: true,
      callbackUrl
    })
  }

  if (!session || !session.user) {
    return (
      <nav className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm">
        <div className="flex-1" />
        <div className="flex items-center space-x-4">
          <button
            onClick={() => signIn('google')}
            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>
    )
  }

  return (
    <nav className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center space-x-4">
        {isWhitelisted && <UploadButton />}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <ErrorBoundary fallback={<div className="w-8 h-8 rounded-full bg-gray-200" />}>
          <UserAvatar user={session.user} />
        </ErrorBoundary>
        <button
          onClick={handleSignOut}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
