'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { setupGraph } from '../lib/d3/setupGraph';
import { setupInteractions } from '../lib/d3/interactions';
import { applyStyles } from '../lib/d3/styles';

export function useD3Graph(data) {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current || !data) return;

        let mounted = true;
        const svg = svgRef.current;
        const width = svg.clientWidth;
        const height = svg.clientHeight;

        // Clear any existing content
        d3.select(svg).selectAll("*").remove();

        // Create the SVG element and container
        const svgElement = d3.select(svg)
            .attr('width', width)
            .attr('height', height);

        // Set up the simulation and create graph elements
        const { simulation, container, nodes, links } = setupGraph(svgElement, data, width, height);

        // Apply visual styles and effects
        applyStyles(svgElement, nodes, links);

        // Set up interactions (drag, hover, etc.)
        setupInteractions(nodes, links);

        // Update positions on each tick
        simulation.on('tick', () => {
            if (!mounted) return;

            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            nodes
                .attr('transform', d => `translate(${d.x},${d.y})`);
        });

        // Cleanup function
        return () => {
            mounted = false;
            simulation.stop();
            if (svg) {
                d3.select(svg).selectAll("*").remove();
            }
        };
    }, [data]);

    return svgRef;
}
