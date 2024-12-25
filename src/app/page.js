'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { GraphVisualization } from '../components/GraphVisualization';

console.log('Loading Home component...');

export default function Home() {
    console.log('Rendering Home component...');
    const { data: session, status } = useSession();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false); 
    const [data, setData] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const response = await fetch('/api/graph');
                if (!response.ok) {
                    throw new Error('Failed to fetch graph data');
                }
                const graphData = await response.json();
                setData(graphData);
            } catch (err) {
                console.error('Error fetching graph data:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        // Only fetch graph data if authenticated
        if (status === 'authenticated' && session?.user) {
            fetchData();
        }
    }, [status, session]);

    // Show loading state only when authenticating
    if (status === 'loading') {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    // Show sign in prompt when not authenticated
    if (status === 'unauthenticated' || !session?.user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <h1 className="text-2xl font-bold">Welcome to Graph Starz</h1>
                <p>Please sign in to continue</p>
                <button
                    onClick={() => signIn('google')}
                    className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    // Show loading state while fetching graph data
    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading graph data...</div>;
    }

    // Show error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <h1 className="text-2xl font-bold text-red-500">Error</h1>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                    Retry
                </button>
            </div>
        );
    }

    // Show graph visualization when data is loaded
    return (
        <div className="h-full pt-16">
            <GraphVisualization data={data} />
        </div>
    );
}
