'use client';

import { useState, useEffect } from 'react';
import { useD3Graph } from '../hooks/useD3Graph';

export default function Home() {
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
                
                console.log('Fetching graph data...');
                const response = await fetch('/api/graph');
                console.log('Response status:', response.status);
                
                const responseData = await response.json();
                console.log('Response data:', JSON.stringify(responseData, null, 2));
                
                if (!response.ok) {
                    const errorMessage = responseData.details || responseData.error || `HTTP error! status: ${response.status}`;
                    console.error('API error:', errorMessage);
                    throw new Error(errorMessage);
                }
                
                if (!responseData) {
                    console.error('No data received from API');
                    throw new Error('No data received from API');
                }
                
                if (!responseData.nodes || !responseData.links) {
                    console.error('Missing nodes or links in data:', responseData);
                    throw new Error('Invalid graph data structure: missing nodes or links');
                }
                
                if (!Array.isArray(responseData.nodes) || !Array.isArray(responseData.links)) {
                    console.error('Nodes or links are not arrays:', {
                        nodesType: typeof responseData.nodes,
                        linksType: typeof responseData.links
                    });
                    throw new Error('Invalid graph data structure: nodes or links are not arrays');
                }
                
                if (responseData.nodes.length === 0) {
                    console.error('No nodes in data');
                    throw new Error('No graph data available. Please ensure the database is initialized.');
                }
                
                if (responseData.stats) {
                    console.log('Setting stats:', responseData.stats);
                    setStats(responseData.stats);
                }
                
                setData(responseData);
                setLoading(false);
            } catch (error) {
                console.error('Failed to render graph:', error);
                setError(error.message);
                setLoading(false);
            }
        }
        
        fetchAndRenderGraph();
    }, []);
    
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
