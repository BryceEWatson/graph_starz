// edgeBundling.js - Implements hierarchical edge bundling for visual clarity
import * as d3 from 'd3'
import { hierarchy, cluster } from 'd3-hierarchy'

/**
 * Create a hierarchical bundle layout for graph edges
 * Bundles parallel edges to reduce visual clutter
 */
export function setupEdgeBundling(container, links, nodes, theme) {
    // Create hierarchical structure for bundling
    const edgeBundling = createEdgeBundling(links)
    
    // Render bundled paths
    renderBundledPaths(container, edgeBundling, theme)
    
    return edgeBundling
}

/**
 * Create hierarchical structure for bundling
 */
export function createEdgeBundling(links) {
    // Create a hierarchy for edge bundling
    const nodesMap = new Map()
    const root = { name: "root", children: [] }
    
    // Build hierarchy
    links.forEach(link => {
        const sourceId = link.source.id || link.source
        const targetId = link.target.id || link.target
        
        if (!nodesMap.has(sourceId)) {
            nodesMap.set(sourceId, { name: sourceId, children: [] })
            root.children.push(nodesMap.get(sourceId))
        }
        if (!nodesMap.has(targetId)) {
            nodesMap.set(targetId, { name: targetId, children: [] })
            root.children.push(nodesMap.get(targetId))
        }
    })
    
    // Create the cluster layout
    const radius = 960 / 2
    const clusterLayout = cluster()
        .size([360, radius - 160])
    
    // Create the bundle layout
    const bundleLayout = hierarchy(root)
    
    return {
        nodes: clusterLayout(bundleLayout).descendants(),
        links: links.map(d => [
            nodesMap.get(d.source.id || d.source),
            nodesMap.get(d.target.id || d.target)
        ])
    }
}

/**
 * Generate bundled paths from hierarchy
 */
function generateBundledPaths(bundle, hierarchy, links) {
    // Convert links to path points
    const points = links.map(link => {
        const source = hierarchy.find(d => d.data.name === link.source.id)
        const target = hierarchy.find(d => d.data.name === link.target.id)
        return {
            source,
            target,
            link
        }
    }).filter(d => d.source && d.target)
    
    // Generate bundled paths
    return bundle(points)
}

/**
 * Render bundled paths with theme-based styling
 */
function renderBundledPaths(container, edgeBundling, theme) {
    // Get theme colors
    const linkColor = theme === 'dark' ?
        'rgba(107, 114, 128, 0.6)' : // Gray-500 with 0.6 opacity
        'rgba(156, 163, 175, 0.6)'   // Gray-400 with 0.6 opacity
    
    const highlightColor = theme === 'dark' ?
        'rgba(147, 197, 253, 0.8)' : // Blue-300 with 0.8 opacity
        'rgba(59, 130, 246, 0.8)'    // Blue-500 with 0.8 opacity
    
    // Create path generator
    const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => d.x)
        .y(d => d.y)
    
    // Render paths
    const pathElements = container.selectAll('path.bundled-link')
        .data(edgeBundling.links)
        .join('path')
        .attr('class', 'bundled-link')
        .attr('d', d => line([d[0], d[1]]))
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.6)
    
    // Add hover interactions
    pathElements
        .on('mouseover', function(event, d) {
            // Highlight this path
            d3.select(this)
                .attr('stroke', highlightColor)
                .attr('stroke-width', 2)
                .attr('stroke-opacity', 0.8)
                .raise()
            
            // Fade other paths
            container.selectAll('path.bundled-link')
                .filter(p => p !== d)
                .attr('stroke-opacity', 0.2)
        })
        .on('mouseout', function(event, d) {
            // Reset all paths
            container.selectAll('path.bundled-link')
                .attr('stroke', linkColor)
                .attr('stroke-width', 1)
                .attr('stroke-opacity', 0.6)
        })
}

/**
 * Update bundled paths during simulation
 */
export function updateBundledPaths(container) {
    const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => d.x)
        .y(d => d.y)
    
    container.selectAll('path.bundled-link')
        .attr('d', d => line([d[0], d[1]]))
}
