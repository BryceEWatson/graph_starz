/**
 * Manages hover interactions and tooltips for graph nodes
 */

import * as d3 from 'd3';

// Define tooltip styles
const tooltipStyles = {
    background: 'rgba(0, 0, 0, 0.9)',
    text: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    attributeLabel: '#8899aa',
    highlightText: '#4A90E2'
};

// Node interaction states
const nodeStates = {
    normal: {
        opacity: 1,
        scale: 1
    },
    highlighted: {
        opacity: 1,
        scale: 1.2
    },
    related: {
        opacity: 0.7,
        scale: 1.1
    },
    faded: {
        opacity: 0.15,
        scale: 0.9
    }
};

/**
 * Format metadata for display
 */
const formatMetadata = (props) => {
    if (!props) return '';
    
    const metadata = [];
    if (props.description) metadata.push(['Description', props.description]);
    if (props.uploadedBy) metadata.push(['Uploaded by', props.uploadedBy]);
    if (props.createdAt) metadata.push(['Date', new Date(props.createdAt).toLocaleDateString()]);
    if (props.size) metadata.push(['Size', `${props.size}px`]);
    
    return metadata.map(([label, value]) => 
        `<div class="tooltip-row">
            <span style="color: ${tooltipStyles.attributeLabel}">${label}:</span>
            <span>${value}</span>
        </div>`
    ).join('');
};

/**
 * Creates a tooltip div if it doesn't exist
 */
const createTooltip = () => {
    let tooltip = d3.select('body').select('.graph-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'graph-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', tooltipStyles.background)
            .style('color', tooltipStyles.text)
            .style('border', tooltipStyles.border)
            .style('padding', '12px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('line-height', '1.4')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
            .style('max-width', '300px')
            .style('word-wrap', 'break-word')
            .style('z-index', '1000')
            .style('backdrop-filter', 'blur(4px)');
    }
    return tooltip;
};

/**
 * Format node data for tooltip display
 */
const formatTooltipContent = (d) => {
    const props = d.properties;
    switch (d.type) {
        case 'image':
            return `
                <div style="text-align: center; margin-bottom: 8px;">
                    <strong style="font-size: 16px; color: ${tooltipStyles.highlightText}">
                        ${props.title || 'Untitled Image'}
                    </strong>
                </div>
                ${formatMetadata(props)}
            `;
        case 'user':
            return `
                <div style="text-align: center; margin-bottom: 8px;">
                    <strong style="font-size: 14px; color: ${tooltipStyles.highlightText}">
                        ${props.email || 'Unknown User'}
                    </strong>
                </div>
                ${formatMetadata(props)}
            `;
        default:
            return `
                <div style="text-align: center;">
                    <strong style="color: ${tooltipStyles.highlightText}">
                        ${d.type}: ${props.value || ''}
                    </strong>
                    ${props.confidence ? 
                        `<div style="margin-top: 4px; font-size: 12px; color: ${tooltipStyles.attributeLabel}">
                            Confidence: ${(props.confidence * 100).toFixed(1)}%
                        </div>` 
                        : ''
                    }
                </div>
            `;
    }
};

/**
 * Apply visual state to nodes
 */
const applyNodeState = (node, state) => {
    const { opacity, scale } = nodeStates[state];
    
    // Apply opacity to node
    node.style('opacity', opacity);
    
    // Apply scale transform
    const currentTransform = node.attr('transform') || '';
    const baseTransform = currentTransform.replace(/scale\([^)]*\)/, '').trim();
    node.attr('transform', `${baseTransform} scale(${scale})`);
    
    // If it's an image node, adjust the image size
    if (node.select('image').size()) {
        const baseSize = node.datum().properties.size || 35;
        node.select('image')
            .attr('width', baseSize * scale)
            .attr('height', baseSize * scale)
            .attr('x', -(baseSize * scale) / 2)
            .attr('y', -(baseSize * scale) / 2);
    }
};

/**
 * Setup hover interactions for nodes
 */
export const setupHoverInteractions = (nodes, links, labels) => {
    const tooltip = createTooltip();

    // Highlight connected nodes and links on hover
    const highlightConnected = (d) => {
        const connectedNodeIds = new Set();
        links.each(link => {
            if (link.source.id === d.id) connectedNodeIds.add(link.target.id);
            if (link.target.id === d.id) connectedNodeIds.add(link.source.id);
        });

        // Apply states to nodes
        nodes.each(function(node) {
            const nodeSelection = d3.select(this);
            if (node.id === d.id) {
                applyNodeState(nodeSelection, 'highlighted');
            } else if (connectedNodeIds.has(node.id)) {
                applyNodeState(nodeSelection, 'related');
            } else {
                applyNodeState(nodeSelection, 'faded');
            }
        });

        // Update link visibility
        links.style('opacity', link =>
            link.source.id === d.id || link.target.id === d.id ? 0.8 : 0.1
        );

        // Show labels for hovered and connected nodes
        labels.style('opacity', node =>
            node.id === d.id || connectedNodeIds.has(node.id) ? 1 : 0
        );
    };

    // Reset highlights
    const resetHighlight = () => {
        nodes.each(function() {
            applyNodeState(d3.select(this), 'normal');
        });
        links.style('opacity', 0.6);
        labels.style('opacity', 0);
    };

    // Node hover handlers
    nodes
        .on('mouseover', (event, d) => {
            highlightConnected(d);
            
            tooltip
                .html(formatTooltipContent(d))
                .style('opacity', 1)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mousemove', (event) => {
            tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        })
        .on('mouseout', () => {
            resetHighlight();
            tooltip.style('opacity', 0);
        });
};
