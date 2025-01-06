/**
 * Manages hover interactions and tooltips for graph nodes
 */

import * as d3 from 'd3';

// Node interaction states
export const nodeStates = {
    normal: {
        opacity: 1,
        scale: 1,
        labelOpacity: d => d.type === 'image' ? 0 : 1,  // Hide image labels by default
        buttonOpacity: 0  // Hide details button
    },
    highlighted: {
        opacity: 1,
        scale: 1.1,  // Slightly reduced scale for better readability
        labelOpacity: 1,  // Show all labels when highlighted
        buttonOpacity: 1  // Show details button
    },
    related: {
        opacity: 0.9,
        scale: 1.05,
        labelOpacity: d => d.type === 'image' ? 0 : 0.9,  // Keep image labels hidden
        buttonOpacity: 0  // Keep details button hidden
    },
    faded: {
        opacity: 0.15,
        scale: 0.6,
        labelOpacity: d => d.type === 'image' ? 0 : 0.3,  // Keep image labels hidden
        buttonOpacity: 0  // Keep details button hidden
    },
    detailed: {
        opacity: 1,
        scale: 3,
        zIndex: 1000,
        labelOpacity: 1,  // Always show labels in detailed view
        buttonOpacity: 0  // Hide button in detailed view
    }
};

/**
 * Apply visual state to nodes
 */
export const applyNodeState = (selection, state) => {
    if (!selection || selection.empty()) return;
    
    const { opacity, scale, zIndex, labelOpacity, buttonOpacity } = nodeStates[state];
    const datum = selection.datum();
    const nodeType = datum.type || '';
    const isImage = nodeType === 'image';
    
    // Apply class-based styling
    selection
        .classed('highlighted', state === 'highlighted')
        .classed('related', state === 'related')
        .classed('faded', state === 'faded')
        .classed('detailed', state === 'detailed');
    
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

    // Update label opacity based on state
    if (isImage) {
        const labelContainer = selection.select('.image-label');
        if (!labelContainer.empty()) {
            const finalLabelOpacity = typeof labelOpacity === 'function' ? labelOpacity(datum) : labelOpacity;
            labelContainer.style('opacity', finalLabelOpacity);
        }
    } else {
        const textSelection = selection.select('text');
        if (!textSelection.empty()) {
            const finalLabelOpacity = typeof labelOpacity === 'function' ? labelOpacity(datum) : labelOpacity;
            textSelection.style('opacity', finalLabelOpacity);
        }
    }

    // Update details button opacity for image nodes
    const buttonSelection = selection.select('.details-button');
    if (!buttonSelection.empty() && isImage) {
        buttonSelection.style('opacity', buttonOpacity);
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

    // Set z-index for detailed view
    if (state === 'detailed') {
        selection.style('z-index', zIndex);
    }
};

/**
 * Reset all nodes and links to their normal state
 */
export const resetAll = (nodes, links) => {
    nodes.each(function() {
        applyNodeState(d3.select(this), 'normal');
    });
    links.style('opacity', 0.6);
};

/**
 * Setup hover interactions for nodes
 */
export function setupHoverInteractions(nodes, links) {
    let selectedNode = null;

    // Helper function to highlight connected nodes and links
    const highlightConnections = (d, opacity = 0.8) => {
        const connectedNodes = new Set();
        links.each(function(l) {
            if (l.source === d || l.target === d) {
                const otherNode = l.source === d ? l.target : l.source;
                connectedNodes.add(otherNode);
                d3.select(this).style('opacity', opacity);
            } else {
                d3.select(this).style('opacity', opacity === 0.8 ? 0.2 : 0.6);
            }
        });

        nodes.each(function(n) {
            const thisNode = d3.select(this);
            if (this === d3.select(d.element).node()) {
                applyNodeState(thisNode, 'highlighted');
            } else if (connectedNodes.has(n)) {
                applyNodeState(thisNode, 'related');
            } else {
                applyNodeState(thisNode, 'faded');
            }
        });
    };

    // Setup node interactions
    nodes.on('mouseover', function(event, d) {
        // Skip hover effects if any node is selected
        if (selectedNode) return;

        highlightConnections(d);
    })
    .on('mouseout', function(_event, _d) {
        // Skip mouseout effects if any node is selected
        if (selectedNode) return;

        resetAll(nodes, links);
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
            highlightConnections(d, 0.8);
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
            resetAll(nodes, links);
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
        resetAll(nodes, links);
    };
}
