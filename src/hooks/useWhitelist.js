'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export function useWhitelist() {
    const { data: session, status } = useSession()
    const [isWhitelisted, setIsWhitelisted] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkWhitelist() {
            if (status === 'authenticated' && session?.user?.email) {
                try {
                    const response = await fetch(`/api/auth/whitelist?email=${encodeURIComponent(session.user.email)}`)
                    const data = await response.json()
                    setIsWhitelisted(data.isWhitelisted)
                } catch (error) {
                    console.error('Error checking whitelist status:', error)
                    setIsWhitelisted(false)
                } finally {
                    setLoading(false)
                }
            } else {
                setIsWhitelisted(false)
                setLoading(false)
            }
        }

        checkWhitelist()
    }, [session?.user?.email, status])

    return { isWhitelisted, loading }
}
