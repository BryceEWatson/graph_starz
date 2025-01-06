'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { GraphVisualization } from '../components/GraphVisualization'
import { useTheme } from '@/components/ThemeProvider'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function Home() {
    const { data: session, status: authStatus } = useSession()
    const [error, setError] = useState(null)
    const [isCheckingWhitelist, setIsCheckingWhitelist] = useState(false)
    const [isLoadingGraph, setIsLoadingGraph] = useState(false)
    const [data, setData] = useState(null)
    const [whitelistStatus, setWhitelistStatus] = useState(null)
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    // Fetch graph data function
    const fetchGraphData = useCallback(async () => {
        if (!whitelistStatus) return
        setIsLoadingGraph(true)
        try {
            const res = await fetch('/api/graph')
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('Early access not yet granted')
                }
                throw new Error('Failed to fetch graph data')
            }
            const graphData = await res.json()
            setData(graphData)
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setIsLoadingGraph(false)
        }
    }, [whitelistStatus])

    // Listen for graph refresh events
    useEffect(() => {
        const handleRefresh = () => {
            console.log('Refreshing graph data...')
            fetchGraphData()
        }
        
        window.addEventListener('refreshGraph', handleRefresh)
        return () => window.removeEventListener('refreshGraph', handleRefresh)
    }, [fetchGraphData])

    // Check whitelist status when user is authenticated
    useEffect(() => {

        if (authStatus === 'authenticated' && session?.user?.email) {
            setIsCheckingWhitelist(true)
            fetch(`/api/auth/whitelist?email=${encodeURIComponent(session.user.email)}`)
                .then(res => {
                    if (!res.ok) throw new Error('Failed to check whitelist status')
                    return res.json()
                })
                .then(data => {
                    setWhitelistStatus(data.isWhitelisted)
                    // Load graph data if whitelisted
                    if (data.isWhitelisted === true) {
                        fetchGraphData()
                    }
                })
                .catch(err => {
                    console.error('Error:', err)
                    setError(err.message)
                })
                .finally(() => {
                    setIsCheckingWhitelist(false)
                })
        } else if (authStatus === 'unauthenticated') {
            console.log('Resetting states due to unauthenticated status')
            // Reset states when user signs out
            setWhitelistStatus(null)
            setData(null)
            setError(null)
        }
    }, [authStatus, session, fetchGraphData])

    // Show initial loading state
    if (authStatus === 'loading') {
        return <LoadingSpinner />;
    }

    // Show loading state while checking whitelist
    if (isCheckingWhitelist || isLoadingGraph) {
        return <LoadingSpinner message={isLoadingGraph ? 'Loading graph...' : 'Loading...'} />;
    }

    // Show graph for whitelisted users
    if (whitelistStatus === true) {
        console.log('Rendering graph view')
        if (isLoadingGraph || !data) {
            return <LoadingSpinner message="Loading graph..." />;
        }
        return <GraphVisualization data={data} />;
    }

    // Show early access or sign in states
    return (
        <div className={`flex min-h-screen items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className={`max-w-md w-full space-y-8 p-8 rounded-xl shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                {!(authStatus === 'authenticated' && session?.user?.email) ? (
                    // Not signed in
                    <>
                        <h2 className={`text-3xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Welcome to Graph Starz
                        </h2>
                        <p className={`mt-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Sign in to request early access or view your graph
                        </p>
                        <div className="mt-6">
                            <button
                                onClick={() => signIn('google')}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Sign in with Google
                            </button>
                        </div>
                    </>
                ) : (
                    // Signed in but not whitelisted
                    <>
                        <h2 className={`text-3xl font-bold text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Early Access Coming Soon
                        </h2>
                        <p className={`mt-2 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Graph Starz is currently in early access. We are excited to have you join us!
                        </p>
                        
                        <div className={`mt-6 border rounded-md p-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                            <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {whitelistStatus === false ? 'Access Requested' : 'Request Early Access'}
                            </h3>
                            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {whitelistStatus === false 
                                    ? 'Your request is pending review. We will notify you when access is granted.'
                                    : 'Click below to request early access to Graph Starz.'}
                            </p>
                            {whitelistStatus === null && (
                                <button
                                    onClick={() => {
                                        // Don't proceed if no session or email
                                        if (!session?.user?.email) {
                                            console.error('No valid session or email')
                                            setError('Please sign in again')
                                            return
                                        }

                                        setIsCheckingWhitelist(true)
                                        fetch('/api/auth/whitelist', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({ email: session.user.email }),
                                        })
                                        .then(res => {
                                            if (!res.ok) throw new Error('Failed to request access')
                                            return res.json()
                                        })
                                        .then(() => setWhitelistStatus(false))
                                        .catch(err => {
                                            console.error('Error:', err)
                                            setError(err.message)
                                        })
                                        .finally(() => setIsCheckingWhitelist(false))
                                    }}
                                    disabled={isCheckingWhitelist || !session?.user?.email}
                                    className={`mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                                        ${(isCheckingWhitelist || !session?.user?.email)
                                            ? 'bg-indigo-400 cursor-not-allowed' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                        }`}
                                >
                                    {isCheckingWhitelist ? 'Requesting...' : 'Request Early Access'}
                                </button>
                            )}
                            {error && (
                                <p className={`mt-2 text-sm text-red-${isDark ? '400' : '600'}`}>
                                    {error}
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
