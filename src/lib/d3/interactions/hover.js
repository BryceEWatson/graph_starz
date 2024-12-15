/**
 * Manages hover interactions and tooltips for graph nodes
 */

import * as d3 from 'd3';

// Node interaction states
export const nodeStates = {
    normal: {
        opacity: 1,
        scale: 1
    },
    highlighted: {
        opacity: 1,
        scale: 1.2
    },
    related: {
        opacity: 0.9,
        scale: 1.1
    },
    faded: {
        opacity: 0.15,  // Very faint for non-connected nodes
        scale: 0.6     // Significantly smaller
    }
};

/**
 * Apply visual state to nodes
 */
export const applyNodeState = (selection, state) => {
    if (!selection || selection.empty()) return;
    
    const { opacity, scale } = nodeStates[state];
    const datum = selection.datum();
    const nodeType = datum.type || '';
    const isImage = nodeType === 'image';
    
    // Apply class-based styling
    selection
        .classed('highlighted', state === 'highlighted')
        .classed('related', state === 'related')
        .classed('faded', state === 'faded');
    
    // Apply opacity to the entire group
    selection.style('opacity', opacity);

    // Handle scale transform for the group
    const currentTransform = selection.attr('transform');
    let translate = '0,0';
    if (currentTransform && typeof currentTransform === 'string') {
        const translateMatch = currentTransform.match(/translate\(([^)]*)\)/);
        if (translateMatch) {
            translate = translateMatch[1];
        }
    }
    selection.attr('transform', `translate(${translate}) scale(${scale})`);

    // Show labels for highlighted and related nodes
    const textSelection = selection.select('text');
    if (!textSelection.empty()) {
        textSelection.style('opacity', (state === 'highlighted' || state === 'related') ? 1 : 0);
        textSelection.text(datum.properties?.name || datum.name || '');
    }

    // Handle image nodes
    const imageSelection = selection.select('image');
    if (!imageSelection.empty() && isImage) {
        const baseSize = (datum.properties?.size || 35) * 1.5;
        const scaledSize = baseSize * scale;
        imageSelection
            .attr('width', scaledSize)
            .attr('height', scaledSize)
            .attr('x', -scaledSize / 2)
            .attr('y', -scaledSize / 2);
    }
};

/**
 * Setup hover interactions for nodes
 */
export const setupHoverInteractions = (nodes, links) => {
    if (!nodes || !links) return;
    
    let lockedNode = null;  // Track currently locked node

    // Apply highlight effect
    const applyHighlight = (d) => {
        if (!d) return;
        
        const connectedNodeIds = new Set();
        links.each(link => {
            if (link.source.id === d.id) connectedNodeIds.add(link.target.id);
            if (link.target.id === d.id) connectedNodeIds.add(link.source.id);
        });

        // Update node states
        nodes.each(node => {
            const selection = d3.select(node.element);
            if (node.id === d.id) {
                applyNodeState(selection, 'highlighted');
            } else if (connectedNodeIds.has(node.id)) {
                applyNodeState(selection, 'related');
            } else {
                applyNodeState(selection, 'faded');
            }
        });

        // Update link visibility
        links
            .style('opacity', link => 
                (link.source.id === d.id || link.target.id === d.id) ? 0.8 : 0.05)  // Make unconnected links very faint
            .style('stroke-width', link => 
                (link.source.id === d.id || link.target.id === d.id) ? 2 : 1);
    };

    // Reset all states to normal
    const resetStates = () => {
        if (lockedNode) return;  // Don't reset if a node is locked
        
        // Reset all nodes to normal state
        nodes.each(node => {
            applyNodeState(d3.select(node.element), 'normal');
        });

        // Reset all links
        links
            .style('opacity', 0.6)
            .style('stroke-width', 1);
    };

    // Handle node click
    const handleClick = (event, d) => {
        event.stopPropagation();  // Prevent click from bubbling
        
        if (lockedNode === d) {
            // If clicking the locked node, unlock it
            lockedNode = null;
            resetStates();
        } else {
            // Lock the new node
            lockedNode = d;
            applyHighlight(d);
        }
    };

    // Handle background click
    d3.select('body').on('click', () => {
        if (lockedNode) {
            lockedNode = null;
            resetStates();
        }
    });

    // Add event listeners
    nodes.each(function(d) {
        const node = d3.select(this);
        node
            .on('mouseover', () => {
                if (!lockedNode) {  // Only apply hover effect if no node is locked
                    applyHighlight(d);
                }
            })
            .on('mouseout', resetStates)
            .on('click', handleClick);
    });

    // Cleanup function
    return () => {
        nodes.each(function() {
            d3.select(this)
                .on('mouseover', null)
                .on('mouseout', null)
                .on('click', null);
        });
        
        d3.select('body').on('click', null);  // Remove body click handler
    };
};
