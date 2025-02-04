/**
 * Manages hover interactions and tooltips for graph nodes
 */

import * as d3 from 'd3';

// Node states and their visual properties
export const nodeStates = {
    normal: {
        opacity: 1,
        transform: 'scale(1)',
        strokeWidth: '1px'
    },
    highlighted: {
        opacity: 1,
        transform: 'scale(1.1)',
        strokeWidth: '2px'
    },
    related: {
        opacity: 0.8,
        transform: 'scale(1)',
        strokeWidth: '1px'
    },
    faded: {
        opacity: 0.3,
        transform: 'scale(0.9)',
        strokeWidth: '1px'
    },
    detailed: {
        opacity: 1,
        transform: 'scale(1.2)',
        strokeWidth: '3px'
    },
    selected: {
        opacity: 1,
        transform: 'scale(1.1)',
        strokeWidth: '2px'
    }
}

/**
 * Apply visual state to a node
 * @param {D3Selection} selection - D3 selection of the node
 * @param {string} state - State name from nodeStates
 * @throws {Error} If state is invalid
 */
export function applyNodeState(selection, state) {
    // Validate selection
    if (!selection || selection.empty()) {
        console.warn('Invalid or empty selection passed to applyNodeState')
        return selection
    }

    // Validate state and use normal as fallback
    if (typeof state !== 'string' || !(state in nodeStates)) {
        console.warn(`Invalid state type (${typeof state}) or state (${state}) passed to applyNodeState, using "normal"`)
        state = 'normal'
    }

    const { opacity, transform, strokeWidth } = nodeStates[state]

    // Apply transitions for visual properties
    selection
        .transition()
        .style('opacity', opacity)
        .style('stroke-width', strokeWidth)

    // Apply transform while preserving existing transforms
    const imageSel = selection.select('image')
    let target = selection
    if (!imageSel.empty()) {
        target = imageSel
        // Ensure image class is set
        imageSel.attr('class', 'node-image')
    }

    // Get existing transform
    const node = selection.node()
    let existingTransform = ''
    if (node) {
        existingTransform = node.getAttribute('transform') || ''
    }

    // Combine transforms, ensuring no duplicates
    const transforms = existingTransform.split(' ').filter(t => t.trim())
    if (!transforms.includes(transform)) {
        transforms.push(transform)
    }
    const newTransform = transforms.join(' ').trim()
    
    // Apply transform with transition, with fallback for missing transition
    if (target.transition) {
        target.transition().attr('transform', newTransform)
    } else {
        target.attr('transform', newTransform)
    }

    // Update text opacity and ensure text element exists with content
    let textSelection = selection.select('text')
    if (textSelection.empty()) {
        textSelection = selection.append('text')
            .attr('class', 'node-label')
            .text('')
    }
    
    // Apply text opacity with transition if available
    if (textSelection.transition) {
        textSelection.transition().style('opacity', opacity)
    } else {
        textSelection.style('opacity', opacity)
    }

    // Handle image nodes
    const nodeData = selection.datum ? selection.datum() : null
    if (nodeData?.type === 'image') {
        let labelSel = selection.select('.image-label')
        if (labelSel.empty()) {
            labelSel = selection.append('text')
                .attr('class', 'image-label')
                .text('')
        }

        // Always ensure image has proper class
        const imgSel = selection.select('image')
        if (!imgSel.empty()) {
            imgSel.attr('class', 'node-image')
        }
    }

    // Handle node state classes
    if (nodeData) {
        if (nodeData.isConnected) {
            selection.classed('connected', true)
        }
        if (nodeData.isSelected || state === 'selected') {
            selection.classed('selected', true)
        }
    }

    return selection
}

/**
 * Apply hover effect to a node and its connected nodes
 * @param {D3Selection} node - D3 selection of the node being hovered
 * @param {D3Selection} links - D3 selection of all links
 * @param {D3Selection} nodes - D3 selection of all nodes
 */
export function applyHoverEffect(node, links, nodes) {
    const nodeIsEmpty = (node.empty && typeof node.empty === 'function') ? node.empty() : false
    if (!node || nodeIsEmpty || !links || !nodes) {
        console.warn('Invalid parameters passed to applyHoverEffect')
        return
    }

    const nodeData = node.datum()
    if (!nodeData) {
        console.warn('No data found for hovered node')
        return
    }

    // Find connected nodes
    const connectedNodeIds = new Set()
    links.each(link => {
        if (link.source.id === nodeData.id) {
            connectedNodeIds.add(link.target.id)
        } else if (link.target.id === nodeData.id) {
            connectedNodeIds.add(link.source.id)
        }
    })

    // Update visual states
    nodes.each(function(d) {
        const selection = d3.select(this)
        if (d.id === nodeData.id) {
            applyNodeState(selection, 'highlighted')
        } else if (connectedNodeIds.has(d.id)) {
            applyNodeState(selection, 'related')
        } else {
            applyNodeState(selection, 'faded')
        }
    })

    // Highlight connected links
    links.each(function(d) {
        const link = d3.select(this)
        if (d.source.id === nodeData.id || d.target.id === nodeData.id) {
            link.transition()
                .style('opacity', 0.8)
                .style('stroke-width', '2px')
        } else {
            link.transition()
                .style('opacity', 0.2)
                .style('stroke-width', '1px')
        }
    })
}

/**
 * Remove hover effects from nodes and links
 * @param {D3Selection} nodes - D3 selection of all nodes
 * @param {D3Selection} links - D3 selection of all links
 */
export function removeHoverEffect(nodes, links) {
    if (!nodes || !links) {
        console.warn('Invalid parameters passed to removeHoverEffect')
        return
    }

    // Reset all nodes to normal state while preserving selection state
    nodes.each(function() {
        const selection = d3.select(this)
        const nodeData = selection.datum()
        if (nodeData && nodeData.isSelected) {
            applyNodeState(selection, 'selected')
        } else {
            applyNodeState(selection, 'normal')
        }
    })

    // Reset all links with transitions
    links.each(function() {
        d3.select(this)
            .transition()
            .style('opacity', 1)
            .style('stroke-width', '1px')
    })
}

/**
 * Setup hover interactions for nodes
 * @param {D3Selection} nodes - D3 selection of all nodes
 * @param {function} onNodeHover - Callback when node is hovered
 * @param {function} onNodeUnhover - Callback when node hover ends
 * @param {D3Selection} links - D3 selection of all links
 */
export function setupHoverInteractions(nodes, onNodeHover, onNodeUnhover, links) {
    let selectedNode = null;

    // Setup node interactions
    nodes.on('mouseover', function(event, d) {
        // Skip hover effects if any node is selected
        if (selectedNode) return;

        const node = d3.select(this);
        applyHoverEffect(node, links, nodes);
        if (onNodeHover && typeof onNodeHover === 'function') {
            onNodeHover(d);
        }
    })
    .on('mouseout', function(event, d) {
        // Skip mouseout effects if any node is selected
        if (selectedNode) return;

        removeHoverEffect(nodes, links);
        if (onNodeUnhover && typeof onNodeUnhover === 'function') {
            onNodeUnhover(d);
        }
    })
    .on('click', function(event, d) {
        // Check if click was on the details button
        const target = event.target;
        const isDetailsButton = d3.select(target).classed('details-button') || 
                              d3.select(target.parentNode).classed('details-button');
        
        // Don't handle node selection if clicking the details button
        if (isDetailsButton) {
            return;
        }

        event.stopPropagation(); // Prevent background click

        // Compare nodes directly using their data instead of DOM elements
        const currentNode = d3.select(this);
        const isCurrentSelected = selectedNode && d3.select(selectedNode).datum() === d;

        // If clicking the same node, do nothing
        if (isCurrentSelected) return;

        // If there's no selected node and we're clicking a new one
        if (!selectedNode) {
            selectedNode = currentNode.node();
            applyHoverEffect(currentNode, links, nodes);
            return;
        }

        // If there is a selected node, ignore clicks on other nodes
        // User must click background first to deselect
    });

    // Add background click handler to clear selection
    const bodySelection = d3.select('body');
    bodySelection.on('click.clearSelection', () => {
        if (selectedNode) {
            selectedNode = null;
            removeHoverEffect(nodes, links);
        }
    });

    // Return cleanup function
    return () => {
        // Remove all event listeners
        nodes.each(function() {
            d3.select(this)
                .on('mouseover', null)
                .on('mouseout', null)
                .on('click', null);
        });

        // Remove body click handler
        bodySelection.on('click.clearSelection', null);

        // Reset any remaining states
        selectedNode = null;
        removeHoverEffect(nodes, links);
    };
}
