import * as d3 from 'd3';
import { PerformanceMonitor } from './metrics/performanceMonitor';
import { SelectionManager } from './selection/selectionManager';
import { setupHoverInteractions } from './interactions/hover';
import { QuadTree, QuadTreeNode } from './spatial/quadtree';
import { GridSystem } from './spatial/gridSystem';
import { SubgraphManager } from './spatial/subgraphManager';
import './selection/styles.css';

export function setupGraph(svgElement, data, width, height, theme) {
    // Initialize performance monitor only in development
    const monitor = process.env.NODE_ENV === 'development' 
        ? new PerformanceMonitor()
        : null;
    
    if (monitor) {
        monitor.startFrameMonitoring();
        monitor.updateNodeCount(data.nodes.length);
    }

    // Get theme colors
    const colors = theme === 'dark' ? {
        nodeFill: '#4b5563',
        nodeStroke: '#1f2937',
        linkStroke: '#6b7280',
        textFill: '#d1d5db',
        userNode: '#3b82f6',
        attributeNode: '#6b7280',
        defaultNode: '#4b5563',
        nodeBorder: '#1f2937'
    } : {
        nodeFill: '#4b5563',
        nodeStroke: '#1f2937',
        linkStroke: '#6b7280',
        textFill: '#4b5563',
        userNode: '#3b82f6',
        attributeNode: '#6b7280',
        defaultNode: '#4b5563',
        nodeBorder: '#1f2937'
    };

    // Add drop shadow filter
    const defs = svgElement.append('defs');
    const filter = defs.append('filter')
        .attr('id', 'drop-shadow')
        .attr('height', '130%');

    filter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr('stdDeviation', 2)
        .attr('result', 'blur');

    filter.append('feOffset')
        .attr('in', 'blur')
        .attr('dx', 1)
        .attr('dy', 1)
        .attr('result', 'offsetBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
        .attr('in', 'offsetBlur');
    feMerge.append('feMergeNode')
        .attr('in', 'SourceGraphic');

    // Node size configurations
    const nodeSizes = {
      user: 60,  // 60px diameter for users
      image: { width: 160, height: 120 },  // Max dimensions for images
      attribute: 30  // 30px diameter for attributes
    };

    // Initialize spatial systems
    const quadtree = new QuadTree(width, height);
    const gridSystem = new GridSystem(width, height, 100); // 100px grid cells
    const subgraphManager = new SubgraphManager();

    // Set up the force simulation with improved layout
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links)
            .id(d => d.id)
            .distance(d => {
                // More natural spacing
                if (d.source.type === 'image' || d.target.type === 'image') {
                    return 180;
                }
                if (d.source.type === 'user' || d.target.type === 'user') {
                    return 120;
                }
                return 80;
            }))
        .force('charge', d3.forceManyBody()
            .strength(d => {
                // Adjusted repulsion forces
                switch (d.type) {
                    case 'image':
                        return -300;
                    case 'user':
                        return -200;
                    case 'attribute':
                        return -50;  // Much weaker repulsion
                    default:
                        return -200;
                }
            }))
        .force('collide', d3.forceCollide()
            .radius(d => {
                // Adjusted collision radii
                switch (d.type) {
                    case 'image':
                        return 80;
                    case 'user':
                        return nodeSizes.user / 2 + 5;
                    case 'attribute':
                        return nodeSizes.attribute / 2 + 2;  // Smaller collision area
                    default:
                        return 20;
                }
            }))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('x', d3.forceX(width / 2).strength(0.02))
        .force('y', d3.forceY(height / 2).strength(0.02))
        .on('tick', () => {
            // Update quadtree
            quadtree.root = new QuadTreeNode({ x: 0, y: 0, width, height });
            data.nodes.forEach(node => quadtree.insert(node));

            // Update grid system
            gridSystem.clear();
            data.nodes.forEach(node => gridSystem.addNode(node));
            const adjustedPositions = gridSystem.adjustNodePositions();
            adjustedPositions.forEach(pos => {
                const node = data.nodes.find(n => n.id === pos.id);
                if (node) {
                    node.x += (pos.x - node.x) * 0.1;
                    node.y += (pos.y - node.y) * 0.1;
                }
            });

            // Update subgraph positions
            subgraphManager.updateComponentPositions(data);

            // Update visual elements
            links
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            nodes.attr('transform', d => `translate(${d.x},${d.y})`);
        });

    // Create a container for the graph
    const container = svgElement.append('g');

    // Initialize selection manager with container node
    const selectionManager = new SelectionManager(container.node());

    // Create the links
    const links = container.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('class', 'graph-link')
        .attr('data-source', d => d.source.id)
        .attr('data-target', d => d.target.id)
        .attr('stroke', colors.linkStroke)
        .attr('stroke-opacity', d => d.properties?.weight || 0.6)
        .attr('stroke-width', d => d.properties?.weight ? d.properties.weight * 2 : 2);

    // Create the nodes
    const nodes = container.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'graph-node')
        .attr('data-id', d => d.id)
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Add labels with meaningful text
    const labels = nodes.append('text')
        .attr('class', 'label')
        .attr('dy', d => d.type === 'image' ? '6em' : '2em')
        .style('text-anchor', 'middle')
        .style('font-size', d => {
            switch (d.type) {
                case 'image': return '14px';
                case 'user': return '13px';
                default: return '11px';  // For all attribute types
            }
        })
        .style('font-weight', d => d.type === 'image' || d.type === 'user' ? '500' : '400')
        .style('fill', colors.textFill)
        .style('pointer-events', 'none')
        .style('opacity', 0)  // Hide all labels by default
        .text(d => d.properties.name);

    setupHoverInteractions(nodes, links, labels);

    // Add images for image nodes
    nodes.filter(d => d.type === 'image')
        .append('image')
        .attr('xlink:href', d => {
            // Try each URL property in order of preference
            const url = d.properties?.fullUrl || d.properties?.previewUrl || d.properties?.thumbnailUrl;
            if (!url) {
                console.warn(`Image node ${d.id} missing URL property`);
                return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+';
            }
            return url;
        })
        .attr('width', nodeSizes.image.width)
        .attr('height', nodeSizes.image.height)
        .attr('x', -nodeSizes.image.width / 2)
        .attr('y', -nodeSizes.image.height / 2)
        .style('filter', 'url(#drop-shadow)');

    // Remove circles from image nodes since we're showing the actual images
    nodes.filter(d => d.type === 'image')
        .select('circle')
        .remove();

    // Node styling with proper colors
    nodes.filter(d => d.type !== 'image')
        .append('circle')
        .attr('r', d => {
            switch (d.type) {
                case 'user': return nodeSizes.user / 2;
                case 'attribute': 
                case 'color':
                case 'style':
                case 'mood':
                case 'technique':
                case 'object':
                case 'composition':
                    return nodeSizes.attribute / 2;
                default: return 15;
            }
        })
        .attr('fill', d => {
            // Use the color mapping from the API
            const typeColors = {
                user: '#4A90E2',      // Blue for users
                image: '#50C878',     // Green for images
                color: '#FFB6C1',     // Pink for colors
                object: '#DEB887',    // Brown for objects
                style: '#9370DB',     // Purple for styles
                technique: '#20B2AA', // Turquoise for techniques
                mood: '#FFD700',      // Gold for moods
                composition: '#FF7F50' // Coral for composition
            };
            return typeColors[d.type] || colors.defaultNode;
        })
        .attr('stroke', colors.nodeBorder)
        .attr('stroke-width', 2)
        .style('filter', 'url(#drop-shadow)');

    // Unified hover effects
    nodes.on('mouseover', function(event, d) {
        const hoveredNode = d3.select(this);
        
        // Highlight the hovered node
        hoveredNode.select('circle')
            .transition()
            .duration(200)
            .attr('stroke-width', 3);
        
        // Show label for hovered node
        hoveredNode.select('.label')
            .transition()
            .duration(150)
            .style('opacity', 1);
        
        // Find and highlight connected nodes and their labels
        links.each(function(linkData) {
            if (linkData.source.id === d.id || linkData.target.id === d.id) {
                const connectedNode = linkData.source.id === d.id ? linkData.target : linkData.source;
                
                // Highlight connected node
                nodes.filter(n => n.id === connectedNode.id)
                    .select('circle')
                    .transition()
                    .duration(200)
                    .attr('stroke-width', 3);
                
                // Show connected node's label
                nodes.filter(n => n.id === connectedNode.id)
                    .select('.label')
                    .transition()
                    .duration(150)
                    .style('opacity', 0.8);
                
                // Highlight the connecting link
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('stroke-width', 2)
                    .style('stroke-opacity', 0.8);
            }
        });
    })
    .on('mouseout', function(event, d) {
        // Only reset if not selected
        if (!d3.select(this).classed('selected')) {
            const hoveredNode = d3.select(this);
            
            // Reset node appearance
            hoveredNode.select('circle')
                .transition()
                .duration(200)
                .attr('stroke-width', 2);
            
            // Hide label
            hoveredNode.select('.label')
                .transition()
                .duration(150)
                .style('opacity', 0);
            
            // Reset connected elements
            links.each(function(linkData) {
                if (linkData.source.id === d.id || linkData.target.id === d.id) {
                    const connectedNode = linkData.source.id === d.id ? linkData.target : linkData.source;
                    
                    // Reset connected node
                    nodes.filter(n => n.id === connectedNode.id)
                        .select('circle')
                        .transition()
                        .duration(200)
                        .attr('stroke-width', 2);
                    
                    // Hide connected node's label
                    nodes.filter(n => !n.selected && n.id === connectedNode.id)
                        .select('.label')
                        .transition()
                        .duration(150)
                        .style('opacity', 0);
                    
                    // Reset link appearance
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('stroke-width', 1)
                        .style('stroke-opacity', 0.6);
                }
            });
        }
    });

    // Selection behavior
    nodes.on('click', function(event, d) {
        const node = d3.select(this);
        const wasSelected = node.classed('selected');
        
        if (!event.shiftKey) {
            // Clear other selections
            nodes.classed('selected', false)
                .select('.label')
                .style('opacity', 0);
        }
        
        // Toggle selection
        node.classed('selected', !wasSelected);
        
        if (!wasSelected) {
            // Show label for newly selected node
            node.select('.label')
                .style('opacity', 1);
            
            // Show labels for connected nodes
            links.each(function(linkData) {
                if (linkData.source.id === d.id || linkData.target.id === d.id) {
                    const connectedNode = linkData.source.id === d.id ? linkData.target : linkData.source;
                    nodes.filter(n => n.id === connectedNode.id)
                        .select('.label')
                        .style('opacity', 0.8);
                }
            });
        }
    });

    // Click on background to clear selection
    svgElement.on('click', (event) => {
        if (event.target === svgElement.node()) {
            selectionManager.clearSelection();
        }
    });

    // Set up drag behavior
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    // Performance monitoring
    if (monitor) {
        simulation.on('tick', () => {
            const status = monitor.checkPerformance();
            if (status.status !== 'normal') {
                console.warn('Performance issues detected:', status);
                
                // Implement adaptive measures based on performance
                if (status.status === 'critical') {
                    simulation.alphaDecay(0.05); // Faster cooling
                    simulation.velocityDecay(0.4); // More damping
                }
            }
        });
    }

    return { simulation, nodes, links, selectionManager };
}
