'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTheme } from '@/components/ThemeProvider'

// Add loading skeleton component
const LoadingSkeleton = () => {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    
    return (
        <div className="flex min-h-[calc(100vh-64px)] mt-16 items-center justify-center">
            <div className="text-center">
                <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isDark ? 'border-gray-200' : 'border-gray-900'} mx-auto`}></div>
                <p className={`mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</p>
            </div>
        </div>
    )
}

// Separate the content into its own component to use Suspense
const EarlyAccessContent = () => {
    const searchParams = useSearchParams()
    const email = searchParams.get('email')
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`/api/auth/whitelist?email=${encodeURIComponent(email)}`)
                const data = await response.json()
                setStatus(data.status)
            } catch (error) {
                console.error('Error checking status:', error)
            }
            setLoading(false)
        }

        if (email) {
            checkStatus()
        } else {
            setLoading(false)
        }
    }, [email])

    const requestAccess = async () => {
        if (!email) {
            await signIn('google')
            return
        }

        try {
            setLoading(true)
            const response = await fetch('/api/auth/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            const data = await response.json()
            setStatus(data.status)
        } catch (error) {
            console.error('Error requesting access:', error)
        }
        setLoading(false)
    }

    if (loading) {
        return <LoadingSkeleton />
    }

    return (
        <div className={`flex min-h-[calc(100vh-64px)] mt-16 items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className={`max-w-md w-full space-y-8 p-8 rounded-xl shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                {status === 'APPROVED' ? (
                    <>
                        <h2 className={`text-3xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Welcome to Graph Starz!
                        </h2>
                        <p className={`mt-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Your account has been approved. Click below to sign in and get started.
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => signIn('google')}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Sign In
                            </button>
                        </div>
                    </>
                ) : status === 'PENDING' ? (
                    <>
                        <h2 className={`text-3xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Request Pending
                        </h2>
                        <p className={`mt-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Thanks for your interest! We received your request and will notify you when access is granted.
                        </p>
                        <div className={`mt-6 border rounded-md p-4 ${isDark ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
                            <p className={`text-sm ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}>
                                Status: Pending Review
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className={`text-3xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Early Access Coming Soon
                        </h2>
                        <p className={`mt-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Graph Starz is currently in early access. Request an invite to be among the first to try it out!
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={requestAccess}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Request Early Access
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

// Main component wrapped with Suspense
export default function EarlyAccess() {
    return (
        <Suspense fallback={<LoadingSkeleton />}>
            <EarlyAccessContent />
        </Suspense>
    )
}
