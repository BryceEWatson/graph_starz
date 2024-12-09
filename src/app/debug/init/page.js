'use client';

import { useState, useEffect } from 'react';

export default function InitDebugPage() {
  const [initState, setInitState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInitState = async () => {
    try {
      const response = await fetch('/api/init');
      const data = await response.json();
      setInitState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch initialization state');
    }
  };

  const triggerInit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/init', { method: 'POST' });
      const data = await response.json();
      setInitState(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger initialization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitState();
    // Poll every 5 seconds if initialization is in progress
    const interval = setInterval(() => {
      if (initState?.inProgress) {
        fetchInitState();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [initState?.inProgress]);

  if (!initState) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
          <p className="font-bold">Loading</p>
          <p>Fetching initialization state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Initialization Debug Panel</h2>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700 text-lg">Status</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              initState.initialized ? 'bg-green-100 text-green-800' : 
              initState.inProgress ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {initState.initialized ? 'Initialized' : 
               initState.inProgress ? 'In Progress' : 
               'Not Initialized'}
            </span>
          </div>

          {initState.lastInitTime && (
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-gray-600">Last Initialization</span>
              <span className="text-gray-900">{new Date(initState.lastInitTime).toLocaleString()}</span>
            </div>
          )}

          {initState.initStartTime && (
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-gray-600">Current Attempt Started</span>
              <span className="text-gray-900">{new Date(initState.initStartTime).toLocaleString()}</span>
            </div>
          )}

          {initState.error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mt-4" role="alert">
              <p className="font-bold">Error</p>
              <p className="mt-1">{initState.error}</p>
            </div>
          )}

          {initState.result && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="text-lg font-semibold mb-3 text-gray-800">Initialization Results</h4>
              <pre className="whitespace-pre-wrap bg-white p-4 rounded border border-gray-200 text-gray-700 font-mono text-sm overflow-auto">
                {JSON.stringify(initState.result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-between">
          <button 
            onClick={fetchInitState} 
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            Refresh Status
          </button>
          <button 
            onClick={triggerInit} 
            disabled={loading || initState.inProgress}
            className={`px-4 py-2 rounded ${
              initState.initialized 
                ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } disabled:opacity-50`}
          >
            {loading ? 'Loading...' : initState.initialized ? 'Re-initialize' : 'Initialize Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
