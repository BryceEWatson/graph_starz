import * as d3 from 'd3';

// Configuration for force variations
const forceConfig = {
    strength: {
        sameType: 0.7,
        userImage: 0.3,
        default: 0.2,
        variation: {
            min: 0.8,
            max: 1.2
        }
    },
    distance: {
        image: 250,
        user: 150,
        attribute: 200,
        variation: {
            min: 0.9,
            max: 1.1
        }
    }
};

// Utility function to generate consistent random variations
function getVariation(seed, config) {
    // Create a simple hash of the seed string
    const hash = seed.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
    }, 0);
    
    // Generate a seeded random number between 0 and 1
    const random = (Math.sin(hash) + 1) / 2;
    
    // Scale to our desired range
    return config.min + (random * (config.max - config.min));
}

export function setupGraph(svgElement, data, width, height, theme) {
    // Initialize performance monitor only in development
    const monitor = process.env.NODE_ENV === 'development' 
        ? null
        : null;
    
    if (monitor) {
        // monitor.startFrameMonitoring();
        // monitor.updateNodeCount(data.nodes.length);
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

    // Create a container for the graph
    const container = svgElement.append('g');

    // Create the links
    const links = container.append('g')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('stroke', colors.linkStroke)
        .attr('stroke-width', d => d.type === 'HAS_ATTRIBUTE' ? 2 : 1)
        .attr('stroke-opacity', d => {
            if (d.type === 'HAS_ATTRIBUTE') {
                return d.properties?.prominence || 0.6;
            }
            return 0.6;
        });

    // Create the nodes
    const nodes = container.append('g')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', 'node');

    // Create node circles/images
    nodes.each(function(d) {
        const node = d3.select(this);
        d.element = this;  // Store element reference

        if (d.type === 'image') {
            // For image nodes - use previewUrl for graph visualization
            // as it's the medium-sized image, which is best for the graph
            const imageUrl = d.properties?.previewUrl || d.properties?.fullUrl || d.properties?.thumbnailUrl;
            node.append('image')
                .attr('xlink:href', imageUrl || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+')
                .attr('width', d.properties?.size || 150)
                .attr('height', d.properties?.size || 150)
                .attr('x', d => -(d.properties?.size || 150) / 2)
                .attr('y', d => -(d.properties?.size || 150) / 2)
                .style('filter', 'url(#drop-shadow)');
        } else {
            // For other nodes (user, attribute)
            const size = nodeSizes[d.type] || nodeSizes.attribute;
            const typeColors = {
                user: '#4A90E2',      // Blue for users
                image: '#50C878',     // Green for images
                attribute: {
                    color: '#FFC5C5',     // Pink for colors
                    object: '#F5DEB3',    // Brown for objects
                    style: '#C7B8EA',     // Purple for styles
                    technique: '#87CEEB', // Turquoise for techniques
                    mood: '#F2C464',      // Gold for moods
                    composition: '#FFA07A' // Coral for composition
                }
            };
            
            node.append('circle')
                .attr('r', size / 2)
                .attr('fill', d => {
                    if (d.type === 'attribute') {
                        const category = d.properties?.category
                        const color = typeColors.attribute[category] || colors.defaultNode
                        console.log('Attribute node:', {
                            name: d.properties?.value || d.name,
                            category,
                            color,
                            properties: d.properties
                        })
                        return color
                    }
                    return typeColors[d.type] || colors.defaultNode
                })
                .attr('stroke', colors.nodeBorder)
                .attr('stroke-width', 2)
                .style('filter', 'url(#drop-shadow)');
        }

        // Add labels with tooltips
        node.append('text')
            .text(d.properties?.value || d.name || '')
            .attr('dy', d.type === 'image' ? '4em' : '-1.5em')
            .attr('text-anchor', 'middle')
            .attr('fill', colors.textFill)
            .style('font-size', d.type === 'image' ? '14px' : '12px')
            .style('font-weight', '500')
            .style('opacity', 0)  // Initially hidden
            .style('pointer-events', 'none')
            .style('paint-order', 'stroke')
            .style('stroke', '#000')
            .style('stroke-width', '0.5px');

        // Add title for tooltip
        if (d.type === 'attribute' && d.properties?.context) {
            node.append('title')
                .text(`${d.properties.value}\n${d.properties.context}`);
        }
    });

    // Initialize force simulation with attribute relationship handling
    const simulation = d3.forceSimulation(data.nodes)
        .force('link', d3.forceLink(data.links)
            .id(d => d.id)
            .distance(link => {
                const sourceType = link.source.type;
                const targetType = link.target.type;
                
                // Adjust distances for attribute relationships
                if (link.type === 'HAS_ATTRIBUTE') {
                    const prominence = link.properties?.prominence || 0.5;
                    return forceConfig.distance.attribute * (2 - prominence); // Closer for high prominence
                }
                
                // Default distances based on node types
                if (sourceType === 'image' || targetType === 'image') {
                    return forceConfig.distance.image * getVariation(`${sourceType}${targetType}`, forceConfig.distance.variation);
                } else if (sourceType === 'user' || targetType === 'user') {
                    return forceConfig.distance.user * getVariation(`${sourceType}${targetType}`, forceConfig.distance.variation);
                } else {
                    return forceConfig.distance.attribute * getVariation(`${sourceType}${targetType}`, forceConfig.distance.variation);
                }
            })
            .strength(link => {
                // Stronger connections for high-prominence attributes
                if (link.type === 'HAS_ATTRIBUTE') {
                    return (link.properties?.prominence || 0.5) * forceConfig.strength.default;
                }
                
                const sourceType = link.source.type;
                const targetType = link.target.type;
                
                if (sourceType === targetType) {
                    return forceConfig.strength.sameType * getVariation(`${sourceType}${targetType}`, forceConfig.strength.variation);
                } else if ((sourceType === 'user' && targetType === 'image') ||
                         (sourceType === 'image' && targetType === 'user')) {
                    return forceConfig.strength.userImage * getVariation(`${sourceType}${targetType}`, forceConfig.strength.variation);
                } else {
                    return forceConfig.strength.default * getVariation(`${sourceType}${targetType}`, forceConfig.strength.variation);
                }
            }))
        .force('charge', d3.forceManyBody()
            .strength(node => {
                // Set repulsion force based on node type
                switch (node.type) {
                    case 'image':
                        return -800; // Increased from -500 for stronger repulsion
                    case 'user':
                        return -400; // Increased from -300
                    default:
                        return -200; // Increased from -100
                }
            })
            .distanceMax(800)    // Increased from 500
            .distanceMin(100))   // Increased from 50
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide()
            .radius(d => {
                // Set collision radius based on node type
                if (d.type === 'image') {
                    return 120;  // Increased from 90
                } else if (d.type === 'user') {
                    return 50;   // Increased from 40
                } else {
                    return 30;   // Increased from 20
                }
            })
            .strength(0.8)      // Increased from 0.7
            .iterations(3))     // Increased from 2
        .alpha(0.3)
        .alphaDecay(0.01)      // Reduced from 0.02 for slower cooling
        .alphaTarget(0.05)
        .velocityDecay(0.4);   // Increased from 0.3 for more stability

    // Update function for force simulation
    simulation.on('tick', () => {
        // Update visual elements
        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        nodes.attr('transform', d => `translate(${d.x},${d.y}) scale(1)`);
    });

    // Unified hover effects
    nodes.on('mouseover', function(event, d) {
        const hoveredNode = d3.select(this);
        
        // Highlight the hovered node
        hoveredNode.select('circle')
            .transition()
            .duration(200)
            .attr('stroke-width', 3);
        
        // Show label for hovered node
        hoveredNode.select('text')
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
                    .select('text')
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
            hoveredNode.select('text')
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
                        .select('text')
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
                .select('text')
                .style('opacity', 0);
        }
        
        // Toggle selection
        node.classed('selected', !wasSelected);
        
        if (!wasSelected) {
            // Show label for newly selected node
            node.select('text')
                .style('opacity', 1);
            
            // Show labels for connected nodes
            links.each(function(linkData) {
                if (linkData.source.id === d.id || linkData.target.id === d.id) {
                    const connectedNode = linkData.source.id === d.id ? linkData.target : linkData.source;
                    nodes.filter(n => n.id === connectedNode.id)
                        .select('text')
                        .style('opacity', 0.8);
                }
            });
        }
    });

    // Click on background to clear selection
    svgElement.on('click', (event) => {
        if (event.target === svgElement.node()) {
            // No selection manager
        }
    });

    return { simulation, nodes, links };
}
