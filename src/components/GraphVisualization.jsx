'use client';

import { useD3Graph } from '../hooks/useD3Graph';

export function GraphVisualization({ data, className = '' }) {
    const svgRef = useD3Graph(data);

    return (
        <div className={`absolute inset-0 ${className}`}>
            <svg
                ref={svgRef}
                className="w-full h-full"
                style={{
                    background: 'var(--background)'
                }}
            >
                {/* D3 will inject the graph here */}
            </svg>
        </div>
    );
}
