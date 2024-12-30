'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import LoadingSpinner from '@/components/LoadingSpinner'

// Main component wrapped with Suspense
export default function EarlyAccess() {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [status, setStatus] = useState(null)

    useEffect(() => {
        if (session?.user?.email) {
            fetch(`/api/auth/whitelist?email=${encodeURIComponent(session.user.email)}`)
                .then(res => res.json())
                .then(data => {
                    setStatus(data)
                })
                .catch(err => {
                    console.error('Error:', err)
                    setError('Failed to check whitelist status')
                })
                .finally(() => {
                    setIsLoading(false)
                })
        }
    }, [session])

    return (
        <Suspense fallback={<LoadingSpinner />}>
            {isLoading ? (
                <LoadingSpinner />
            ) : error ? (
                <div className="flex min-h-[calc(100vh-64px)] mt-16 items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-500">{error}</p>
                    </div>
                </div>
            ) : !session ? (
                <div className="flex min-h-[calc(100vh-64px)] mt-16 items-center justify-center">
                    <div className="text-center">
                        <p>Please sign in to check your early access status.</p>
                    </div>
                </div>
            ) : (
                <div className="flex min-h-[calc(100vh-64px)] mt-16 items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">Early Access Status</h1>
                        <p className="mb-2">Email: {session.user.email}</p>
                        <p>Status: {status?.isWhitelisted ? 'Approved' : 'Pending'}</p>
                    </div>
                </div>
            )}
        </Suspense>
    )
}
