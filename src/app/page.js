'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { GraphVisualization } from '../components/GraphVisualization';

console.log('Loading Home component...');

export default function Home() {
    console.log('Rendering Home component...');
    const { status } = useSession();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/api/graph');
                if (!response.ok) {
                    throw new Error('Failed to fetch graph data');
                }
                const graphData = await response.json();
                setData(graphData);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching graph data:', err);
                setError(err.message);
                setLoading(false);
            }
        }

        if (status === 'authenticated') {
            fetchData();
        }
    }, [status]);

    if (status === 'loading') {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    if (status === 'unauthenticated') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <h1 className="text-2xl font-bold">Welcome to Graph Starz</h1>
                <p>Please sign in to continue</p>
                <Link
                    href="/api/auth/signin"
                    className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                    Sign In
                </Link>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen text-red-500">
                Error: {error}
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading graph data...
            </div>
        );
    }

    return (
        <main className="h-full">
            <GraphVisualization data={data} />
        </main>
    );
}
