'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useD3Graph } from '../hooks/useD3Graph';
import Link from 'next/link';

console.log('Loading Home component...');

export default function Home() {
    console.log('Rendering Home component...');
    const { status } = useSession();
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [data, setData] = useState(null);
    
    // Use our custom hook for D3 graph
    const svgRef = useD3Graph(data);
    
    useEffect(() => {
        async function fetchAndRenderGraph() {
            try {
                setLoading(true);
                setError(null);
                setStats(null);
                setData(null);
                
                // Don't fetch if not authenticated
                if (status !== 'authenticated') {
                    setLoading(false);
                    return;
                }
                
                console.log('Fetching graph data...');
                const response = await fetch('/api/graph');
                console.log('Response status:', response.status);
                
                const responseData = await response.json();
                
                if (!response.ok) {
                    throw new Error(responseData.error || 'Failed to fetch graph data');
                }
                
                setData(responseData);
                setStats(responseData.stats);
            } catch (error) {
                console.error('Error:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        }
        
        fetchAndRenderGraph();
    }, [status]); // Re-fetch when auth status changes
    
    // Show loading state
    if (loading && status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        );
    }
    
    // Show sign in prompt if not authenticated
    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="max-w-md w-full space-y-8 p-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-extrabold">
                            Welcome to Graph Starz
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Please sign in to view and interact with the graph
                        </p>
                    </div>
                    <div className="mt-8 text-center">
                        <Link
                            href="/api/auth/signin"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    
    // Show error state
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">Error: {error}</div>
            </div>
        );
    }
    
    return (
        <main className="flex min-h-screen flex-col items-center justify-between mt-16 p-4 bg-background dark:bg-dark-background">
            <div className="relative w-full h-[80vh] bg-background-paper dark:bg-dark-background-paper rounded-lg shadow-xl overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 bg-opacity-75">
                        <div className="text-lg text-text dark:text-dark-text">Loading graph data...</div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900">
                        <div className="max-w-lg p-4">
                            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Graph</h3>
                            <p className="text-red-600 dark:text-red-300 whitespace-pre-wrap">{error}</p>
                            <div className="mt-4 flex space-x-4">
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                >
                                    Retry
                                </button>
                                <button 
                                    onClick={() => setError(null)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {stats && !error && (
                    <div className="absolute top-4 right-4 bg-background-paper dark:bg-dark-background-paper p-4 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold mb-2 text-text dark:text-dark-text">Graph Statistics</h3>
                        <ul className="space-y-1 text-text-secondary dark:text-dark-text-secondary">
                            <li>Users: {stats.users}</li>
                            <li>Images: {stats.images}</li>
                            <li>Attributes: {stats.attributes}</li>
                        </ul>
                    </div>
                )}
                <svg
                    ref={svgRef}
                    className="w-full h-full"
                    style={{ background: 'var(--graph-bg)' }}
                >
                    <style>
                        {`
                            .graph-node, .graph-link {
                                transition: all 0.2s ease-in-out;
                            }
                            .graph-node circle {
                                transition: stroke-width 0.2s ease-in-out, stroke 0.2s ease-in-out;
                            }
                            .graph-link {
                                transition: stroke-width 0.2s ease-in-out, stroke 0.2s ease-in-out, opacity 0.2s ease-in-out;
                            }
                        `}
                    </style>
                </svg>
            </div>
        </main>
    );
}
