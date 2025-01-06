'use client';

import { useD3Graph } from '../hooks/useD3Graph';
import { useTheme } from '../components/ThemeProvider';

export function GraphVisualization({ data, className = '' }) {
    const svgRef = useD3Graph(data);
    const { theme } = useTheme();

    const backgroundColor = theme === 'dark' ? '#111827' : '#FFFFFF';

    return (
        <div className={`absolute inset-0 ${className}`}>
            <svg
                ref={svgRef}
                className="w-full h-full"
                style={{
                    backgroundColor
                }}
            >
                {/* D3 will inject the graph here */}
            </svg>
        </div>
    );
}
