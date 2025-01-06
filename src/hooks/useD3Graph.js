'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { setupGraph } from '../lib/d3/setupGraph';
import { setupInteractions } from '../lib/d3/interactions';
import { useTheme } from '../components/ThemeProvider';

export function useD3Graph(data) {
    const svgRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (!svgRef.current || !data) return;

        let mounted = true;
        const svg = svgRef.current;
        const width = svg.clientWidth || 800;
        const height = svg.clientHeight || 600;

        // Clear any existing content
        d3.select(svg).selectAll("*").remove();

        // Create the SVG element
        const svgElement = d3.select(svg)
            .attr('width', width)
            .attr('height', height);

        // Set up zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 2])  // Allow zooming from half to 2x
            .on('zoom', (event) => {
                container.attr('transform', event.transform);
            });

        svgElement.call(zoom);

        // Create container for zooming
        const container = svgElement.append('g');

        // Set up the simulation and create graph elements with theme
        const graphElements = setupGraph(container, data, width, height, theme)
        const { simulation, nodes, links, cleanup: graphCleanup } = graphElements

        // Set up interactions (drag, hover, etc.)
        const interactionsCleanup = setupInteractions(nodes, links)

        // Update positions on each tick
        simulation.on('tick', () => {
            if (!mounted) return

            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y)

            nodes
                .attr('transform', d => `translate(${d.x},${d.y})`)
        })

        // Cleanup function
        return () => {
            mounted = false
            if (graphCleanup) graphCleanup()
            if (interactionsCleanup) interactionsCleanup()
        };
    }, [data, theme]);

    return svgRef;
}
