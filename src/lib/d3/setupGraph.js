import * as d3 from 'd3';
import { setupHoverInteractions, resetAll } from './interactions/hover';
import { setupDetailsViewInteractions, enterDetailsView } from './interactions/detailsView';
import { calculateSpiralPositions, createSpiralForce } from './layouts/spiralLayout'
import { calculateBoundingCircles, createBoundingCircleForce, renderBoundingCircles } from './layouts/boundingCircles'
import { setupAttributeForces } from './layouts/attributeLayout'
import { setupEdgeBundling, updateBundledPaths } from './interactions/edgeBundling'

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

// Pre-compute variations for common type pairs
const nodeTypes = ['user', 'image', 'attribute'];
const typeVariations = {};
nodeTypes.forEach(source => {
    nodeTypes.forEach(target => {
        const key = `${source}${target}`;
        typeVariations[key] = {
            distance: getVariation(key, forceConfig.distance.variation),
            strength: getVariation(key, forceConfig.strength.variation)
        };
    });
});

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

// Add transition configuration
const transitionConfig = {
    duration: 300,
    ease: d3.easeCubicInOut
}

export function setupGraph(svgElement, data, width, height, theme) {
    // Get theme colors with proper dark/light variations
    const colors = theme === 'dark' ? {
        nodeFill: '#374151',      // Slightly lighter than background
        nodeStroke: '#4B5563',    // Visible border
        linkStroke: '#6B7280',    // Visible links
        textFill: '#F9FAFB',      // Very light text
        userNode: '#60A5FA',      // Bright blue
        attributeNode: '#9CA3AF', // Light gray
        defaultNode: '#374151',   // Match nodeFill
        nodeBorder: '#4B5563'     // Match nodeStroke
    } : {
        nodeFill: '#F3F4F6',      // Very light gray
        nodeStroke: '#D1D5DB',    // Medium gray border
        linkStroke: '#9CA3AF',    // Darker gray links
        textFill: '#111827',      // Very dark text
        userNode: '#2563EB',      // Darker blue for contrast
        attributeNode: '#4B5563', // Dark gray
        defaultNode: '#F3F4F6',   // Match nodeFill
        nodeBorder: '#D1D5DB'     // Match nodeStroke
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
        image: { width: 160 },  // Width only, height will maintain aspect ratio
        attribute: 30  // 30px diameter for attributes
    };

    // Create a container for the graph
    const container = svgElement.append('g');

    // Add background rect to handle clicks
    const background = svgElement.append('rect')
        .attr('class', 'background')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on('click', () => resetAll(nodes, links));

    // Ensure background is behind everything
    background.lower();

    // Create the links
    const links = container.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(data.links)
        .join('line')
        .attr('class', 'link')
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
        .attr('class', 'nodes')
        .selectAll('g')
        .data(data.nodes)
        .join('g')
        .attr('class', d => `node ${d.type}`);

    // Create node circles/images
    nodes.each(function(d) {
        const node = d3.select(this);
        d.element = this;  // Store element reference

        if (d.type === 'image') {
            // For image nodes - use graphUrl (160px) for graph visualization
            const imageUrl = d.properties?.graphUrl || d.properties?.thumbnailUrl || d.properties?.previewUrl;
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
                user: colors.userNode,      // Use theme colors
                image: colors.defaultNode,   // Use theme colors
                attribute: {
                    color: '#FCA5A5',     // Soft red
                    object: '#F5D0B3',    // Soft brown
                    style: '#C7D2FE',     // Soft purple
                    technique: '#A5F3FC', // Soft cyan
                    mood: '#FDE68A',      // Soft gold
                    composition: '#FDBA74' // Soft orange
                }
            };
            
            node.append('circle')
                .attr('r', size / 2)
                .attr('fill', d => {
                    if (d.type === 'attribute') {
                        const category = d.properties?.category
                        const color = typeColors.attribute[category] || colors.attributeNode
                        return color
                    }
                    return typeColors[d.type] || colors.defaultNode
                })
                .attr('stroke', colors.nodeStroke)
                .attr('stroke-width', 2)
                .style('filter', 'url(#drop-shadow)');
        }

        // Add labels with tooltips
        if (d.type === 'image') {
            // Create a label container for images
            const labelContainer = node.append('g')
                .attr('class', 'image-label')
                .style('opacity', 0);  // Hidden by default

            // Add label background
            const labelBg = labelContainer.append('rect')
                .attr('fill', 'rgba(0, 0, 0, 0.6)')
                .attr('rx', 4)  // Rounded corners
                .style('filter', 'url(#drop-shadow)');

            // Add label text
            const labelText = labelContainer.append('text')
                .text(d.properties?.value || d.name || '')
                .attr('fill', '#ffffff')
                .style('font-size', '14px')
                .style('font-weight', '500')
                .style('pointer-events', 'none');

            // Position the label at the top of the image
            const imageSize = d.properties?.size || 150;
            const padding = { x: 8, y: 6 };  // Padding for the label background

            // Use getBBox after text is added to calculate background size
            const textBBox = labelText.node().getBBox();
            const bgWidth = textBBox.width + (padding.x * 2);
            const bgHeight = textBBox.height + (padding.y * 2);

            // Position label at the top of the image
            labelContainer.attr('transform', `translate(0,${-imageSize/2 - bgHeight/2})`);
            
            // Update background size and position
            labelBg
                .attr('width', bgWidth)
                .attr('height', bgHeight)
                .attr('x', -bgWidth/2)
                .attr('y', -bgHeight/2);

            // Center the text vertically
            labelText
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle');
        } else {
            // For non-image nodes, keep the original label style
            node.append('text')
                .text(d.properties?.value || d.name || '')
                .attr('dy', '-1.5em')
                .attr('text-anchor', 'middle')
                .attr('fill', colors.textFill)
                .style('font-size', '12px')
                .style('font-weight', '500')
                .style('opacity', 1)
                .style('pointer-events', 'none')
                .style('paint-order', 'stroke')
                .style('stroke', theme === 'dark' ? '#000000' : '#FFFFFF')
                .style('stroke-width', '2px');
        }

        // Add details view button for image nodes
        if (d.type === 'image') {
            const imageSize = d.properties?.size || 150;
            const buttonHeight = 28;  // Height of the button
            const buttonPadding = { x: 16, y: 6 };  // Padding inside button
            
            // Create button container
            const buttonContainer = node.append('g')
                .attr('class', 'details-button')
                .style('opacity', 0)  // Hidden by default
                .style('cursor', 'pointer')
                .on('click', (event) => {
                    event.stopPropagation();
                    // Pass the node data, not the DOM element
                    enterDetailsView(d, nodes, links);
                });

            // Add button background
            const buttonBg = buttonContainer.append('rect')
                .attr('fill', '#4A90E2')  // Use a noticeable blue color
                .attr('rx', buttonHeight/2)  // Pill shape
                .attr('height', buttonHeight)
                .style('filter', 'url(#drop-shadow)');

            // Add button text
            const buttonText = buttonContainer.append('text')
                .text('Details View')
                .attr('fill', '#ffffff')
                .attr('dy', buttonHeight/2)  // Center text vertically
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')  // Better vertical centering
                .style('font-size', '13px')
                .style('font-weight', '500')
                .style('pointer-events', 'none')
                .style('font-family', 'system-ui, -apple-system, sans-serif');  // System font for better rendering

            // Calculate button width based on text
            const textBBox = buttonText.node().getBBox();
            const buttonWidth = textBBox.width + (buttonPadding.x * 2);

            // Update button background width and center it
            buttonBg
                .attr('width', buttonWidth)
                .attr('x', -buttonWidth/2);

            // Position the entire button container under the title
            const labelBgHeight = node.select('.image-label rect').node().getBBox().height;
            buttonContainer.attr('transform', `translate(0,${-imageSize/2 - labelBgHeight/2 + buttonHeight + 8})`);  // 8px gap between title and button
        }

        // Add title for tooltip
        if (d.type === 'attribute' && d.properties?.context) {
            node.append('title')
                .text(`${d.properties.value}\n${d.properties.context}`);
        }
    });

    // Initialize force simulation with minimal forces first
    const simulation = d3.forceSimulation(data.nodes)
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('charge', d3.forceManyBody().strength(node => {
            switch (node.type) {
                case 'image': return -1000
                case 'user': return -600
                case 'attribute': return -400
                default: return -200
            }
        }))
        .force('collide', d3.forceCollide()
            .radius(d => {
                if (d.type === 'image') {
                    return 140
                } else if (d.type === 'user') {
                    return 70
                } else {
                    return 40
                }
            })
            .strength(1.0)
            .iterations(4))
        .velocityDecay(0.4)

    // Run a few ticks to establish initial user positions
    for (let i = 0; i < 20; i++) {
        simulation.tick()
    }

    // Now position user images in spirals
    const userNodes = data.nodes.filter(n => n.type === 'user')
    userNodes.forEach(user => {
        const userImages = data.nodes.filter(n => 
            n.type === 'image' && 
            data.links.some(l => 
                (l.source.id === user.id && l.target.id === n.id) ||
                (l.target.id === user.id && l.source.id === n.id)
            )
        )
        
        // Calculate spiral positions for this user's images
        const { maxRadius, imagePositions } = calculateSpiralPositions(user, userImages)
        
        // Apply initial positions
        imagePositions.forEach(pos => {
            const node = data.nodes.find(n => n.id === pos.id)
            if (node) {
                node.x = pos.x
                node.y = pos.y
                node.spiralParams = {
                    theta: pos.theta,
                    radius: pos.radius,
                    userNodeId: user.id
                }
            }
        })
    })

    // Calculate the maximum extent of all user subgraphs
    const subgraphExtents = userNodes.map(user => {
        const userImages = data.nodes.filter(n => 
            n.type === 'image' && 
            n.spiralParams?.userNodeId === user.id
        )
        const imageWidth = 160
        const maxRadius = Math.max(
            300,
            ...userImages.map(img => img.spiralParams?.radius || 0)
        )
        return maxRadius + (imageWidth / 2) + 50 // Include image width and padding
    })
    const maxSubgraphExtent = Math.max(...subgraphExtents)

    // Position attributes well outside all subgraphs
    const attrNodes = data.nodes.filter(n => n.type === 'attribute')
    const attributeRadius = maxSubgraphExtent + 200 // Extra 200px buffer
    attrNodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / attrNodes.length
        node.x = width/2 + attributeRadius * Math.cos(angle)
        node.y = height/2 + attributeRadius * Math.sin(angle)
    })

    // Now set up the full simulation with all forces
    simulation
        .nodes(data.nodes)
        .force('link', d3.forceLink(data.links)
            .id(d => d.id)
            .distance(link => {
                const sourceType = link.source.type
                const targetType = link.target.type
                const key = `${sourceType}${targetType}`
                const variation = typeVariations[key].distance
                
                if (sourceType === 'image' || targetType === 'image') {
                    return forceConfig.distance.image * variation
                } else if (sourceType === 'user' || targetType === 'user') {
                    return forceConfig.distance.user * variation
                } else {
                    return forceConfig.distance.attribute * variation
                }
            }))
        .force('charge', d3.forceManyBody()
            .strength(node => {
                switch (node.type) {
                    case 'image': return -800
                    case 'user': return -400
                    default: return -200
                }
            })
            .distanceMax(800)
            .distanceMin(100))
        .force('collide', d3.forceCollide()
            .radius(d => {
                if (d.type === 'image') {
                    return 120
                } else if (d.type === 'user') {
                    return 50
                } else {
                    return 30
                }
            })
            .strength(0.8)
            .iterations(3))

    // Add spiral force to maintain layout
    simulation.force('spiral', createSpiralForce())

    // Setup attribute forces
    setupAttributeForces(simulation, data.nodes, data.links)

    // Create container for bounding circles
    const boundingCircleContainer = container.append('g')
        .attr('class', 'bounding-circles')
        .lower()

    // Reset simulation
    simulation
        .alpha(1)
        .alphaDecay(0.02) // Faster decay (was 0.01)
        .alphaTarget(0) // Allow simulation to settle (was 0.05)
        .restart()

    // Update function for force simulation
    simulation.on('tick', () => {
        // Calculate and update bounding circles
        const boundingCircles = calculateBoundingCircles(data.nodes, 
            data.nodes.filter(n => n.type === 'image' && n.spiralParams)
                .map(n => ({
                    id: n.id,
                    x: n.x,
                    y: n.y,
                    radius: n.spiralParams.radius
                }))
        )
        
        // Render bounding circles
        renderBoundingCircles(boundingCircleContainer, boundingCircles, theme)

        // Update visual elements
        links
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)

        nodes
            .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Update node appearance on selection
    function updateNodeSelection(node) {
        // Transition for selected node
        d3.select(node)
            .transition()
            .duration(transitionConfig.duration)
            .ease(transitionConfig.ease)
            .attr('transform', 'scale(1.1)')
            
        // Fade other nodes
        svg.selectAll('.node')
            .filter(d => d !== node.__data__)
            .transition()
            .duration(transitionConfig.duration)
            .style('opacity', 0.3)
            
        // Highlight connected edges
        svg.selectAll('.link')
            .transition()
            .duration(transitionConfig.duration)
            .style('opacity', d => 
                (d.source === node.__data__ || d.target === node.__data__) 
                    ? 1 : 0.1
            )
            .style('stroke-width', d => 
                (d.source === node.__data__ || d.target === node.__data__) 
                    ? 2 : 1
            )
    }

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
                .style('opacity', 1);
            
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
                        .style('opacity', 1);
                    
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
                .style('opacity', 1);
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
            
            updateNodeSelection(node.node());
        }
    });

    // Click on background to clear selection
    svgElement.on('click', (event) => {
        if (event.target === svgElement.node()) {
            // No selection manager
        }
    });

    // Initialize interactions
    const cleanupHover = setupHoverInteractions(nodes, links)
    const cleanupDetailedView = setupDetailsViewInteractions(nodes, links)

    // Return cleanup function and elements
    return {
        simulation,
        nodes,
        links,
        cleanup: () => {
            cleanupHover()
            cleanupDetailedView()
            simulation.stop()
        }
    }
}

export { setupGraph }
