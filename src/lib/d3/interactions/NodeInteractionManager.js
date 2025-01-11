import * as d3 from 'd3';
import { TransitionManager } from './TransitionManager';

/**
 * @typedef {Object} NodeInteractionConfig
 * @property {number} hoverDuration - Duration for hover transitions
 * @property {number} selectionDuration - Duration for selection transitions
 * @property {Object} opacity - Opacity configuration
 * @property {number} opacity.default - Default node opacity
 * @property {number} opacity.hover - Node opacity on hover
 * @property {number} opacity.selected - Node opacity when selected
 * @property {number} opacity.faded - Node opacity when faded
 */

/**
 * Manages node interactions in the graph
 */
export class NodeInteractionManager {
    /**
     * Creates a new NodeInteractionManager
     * @param {NodeInteractionConfig} config - Interaction configuration
     */
    constructor(config) {
        this.config = this.validateConfig(config);
        this.transitions = new TransitionManager({
            duration: config.hoverDuration,
            ease: d3.easeCubicInOut
        });
        this.selectedNodes = new Set();
        this.cleanup = null;
        this.nodes = null;
        this.links = null;
    }

    /**
     * Validates interaction configuration
     * @param {NodeInteractionConfig} config - Configuration to validate
     * @returns {NodeInteractionConfig} Validated configuration
     * @throws {Error} If configuration is invalid
     * @private
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Interaction configuration is required');
        }

        const { hoverDuration, selectionDuration, opacity } = config;
        
        if (typeof hoverDuration !== 'number' || hoverDuration <= 0) {
            throw new Error('Invalid hover duration: must be a positive number');
        }
        if (typeof selectionDuration !== 'number' || selectionDuration <= 0) {
            throw new Error('Invalid selection duration: must be a positive number');
        }

        if (!opacity || typeof opacity !== 'object') {
            throw new Error('Invalid opacity configuration');
        }

        ['default', 'hover', 'selected', 'faded'].forEach(key => {
            if (typeof opacity[key] !== 'number' || opacity[key] < 0 || opacity[key] > 1) {
                throw new Error(`Invalid ${key} opacity: must be between 0 and 1`);
            }
        });

        return { hoverDuration, selectionDuration, opacity };
    }

    /**
     * Validates node selection
     * @param {d3.Selection} nodes - Nodes to validate
     * @throws {Error} If nodes are invalid
     * @private
     */
    validateNodes(nodes) {
        if (!nodes || typeof nodes.on !== 'function') {
            throw new Error('Invalid nodes: must be a valid D3 selection');
        }
    }

    /**
     * Handles node hover events
     * @param {d3.Selection} nodes - Node selection to handle
     * @param {d3.Selection} links - Link selection for highlighting
     * @private
     */
    handleHover(nodes, links) {
        nodes.on('mouseover', (event, d) => {
            if (this.selectedNodes.size > 0) return;

            const hoveredNode = d3.select(event.currentTarget);
            
            // Highlight hovered node
            this.transitions.updateOpacity(hoveredNode, this.config.opacity.hover);
            this.transitions.updateStrokeWidth(hoveredNode.select('circle'), 3);

            // Show label
            this.transitions.updateOpacity(
                hoveredNode.select('text'),
                this.config.opacity.hover
            );

            // Highlight connected nodes and links
            links.each((linkData) => {
                if (linkData.source.id === d.id || linkData.target.id === d.id) {
                    const connectedNode = linkData.source.id === d.id 
                        ? linkData.target 
                        : linkData.source;

                    // Highlight connected node
                    const connectedSelection = nodes.filter(n => n.id === connectedNode.id);
                    this.transitions.updateOpacity(
                        connectedSelection,
                        this.config.opacity.hover
                    );
                    this.transitions.updateStrokeWidth(
                        connectedSelection.select('circle'),
                        3
                    );

                    // Highlight connecting link
                    const link = d3.select(this);
                    this.transitions.updateStrokeWidth(link, 2);
                    this.transitions.updateOpacity(link, this.config.opacity.hover);
                }
            });
        });

        nodes.on('mouseout', (event, d) => {
            if (this.selectedNodes.size > 0) return;

            const hoveredNode = d3.select(event.currentTarget);
            
            // Reset node appearance
            this.transitions.updateOpacity(hoveredNode, this.config.opacity.default);
            this.transitions.updateStrokeWidth(hoveredNode.select('circle'), 2);

            // Reset label
            this.transitions.updateOpacity(
                hoveredNode.select('text'),
                this.config.opacity.default
            );

            // Reset connected elements
            links.each((linkData) => {
                if (linkData.source.id === d.id || linkData.target.id === d.id) {
                    const connectedNode = linkData.source.id === d.id 
                        ? linkData.target 
                        : linkData.source;

                    // Reset connected node
                    const connectedSelection = nodes.filter(n => n.id === connectedNode.id);
                    this.transitions.updateOpacity(
                        connectedSelection,
                        this.config.opacity.default
                    );
                    this.transitions.updateStrokeWidth(
                        connectedSelection.select('circle'),
                        2
                    );

                    // Reset connecting link
                    const link = d3.select(this);
                    this.transitions.updateStrokeWidth(link, 1);
                    this.transitions.updateOpacity(link, this.config.opacity.default);
                }
            });
        });
    }

    /**
     * Handles node selection events
     * @param {d3.Selection} nodes - Node selection to handle
     * @param {d3.Selection} links - Link selection for highlighting
     * @private
     */
    handleSelection(nodes, links) {
        nodes.on('click', (event, d) => {
            const node = d3.select(event.currentTarget);
            const wasSelected = this.selectedNodes.has(d.id);

            if (!event.shiftKey) {
                // Clear other selections
                this.selectedNodes.clear();
                nodes.classed('selected', false);
                this.transitions.updateOpacity(nodes, this.config.opacity.default);
            }

            if (!wasSelected) {
                // Add new selection
                this.selectedNodes.add(d.id);
                node.classed('selected', true);
                this.transitions.updateScale(node, 1.1);
                this.transitions.updateOpacity(node, this.config.opacity.selected);

                // Fade other nodes
                nodes.filter(n => !this.selectedNodes.has(n.id))
                    .call(selection => {
                        this.transitions.updateOpacity(selection, this.config.opacity.faded);
                    });

                // Highlight connected links
                links.call(selection => {
                    this.transitions.updateOpacity(
                        selection,
                        linkData => (
                            linkData.source.id === d.id || linkData.target.id === d.id
                                ? this.config.opacity.selected
                                : this.config.opacity.faded
                        )
                    );
                });
            } else {
                // Remove selection
                this.selectedNodes.delete(d.id);
                node.classed('selected', false);
                this.transitions.updateScale(node, 1);
                this.transitions.updateOpacity(node, this.config.opacity.default);

                if (this.selectedNodes.size === 0) {
                    // Reset all elements if no selections remain
                    this.resetAll(nodes, links);
                }
            }
        });
    }

    /**
     * Resets all elements to default state
     * @param {d3.Selection} nodes - Nodes to reset
     * @param {d3.Selection} links - Links to reset
     * @private
     */
    resetAll(nodes, links) {
        this.selectedNodes.clear();
        nodes.classed('selected', false);

        nodes.call(selection => {
            this.transitions.updateOpacity(selection, this.config.opacity.default);
            this.transitions.updateScale(selection, 1);
        });

        links.call(selection => {
            this.transitions.updateOpacity(selection, this.config.opacity.default);
            this.transitions.updateStrokeWidth(selection, 1);
        });
    }

    /**
     * Cleans up all resources and event handlers
     * @private
     */
    cleanupResources() {
        if (!this.nodes || !this.links) return;

        // Remove all event listeners
        this.nodes
            .on('mouseover', null)
            .on('mouseout', null)
            .on('click', null)
            .on('touchstart', null)
            .on('touchend', null);

        // Clear selection state
        this.selectedNodes.clear();
        this.nodes.classed('selected', false);

        // Reset visual state
        this.transitions.updateOpacity(this.nodes, this.config.opacity.default);
        this.transitions.updateScale(this.nodes, 1);
        this.transitions.updateOpacity(this.links, this.config.opacity.default);
        this.transitions.updateStrokeWidth(this.links, 1);

        // Clear references
        this.nodes = null;
        this.links = null;
        this.cleanup = null;
    }

    /**
     * Attaches event handlers to nodes
     * @param {d3.Selection} nodes - Nodes to handle
     * @param {d3.Selection} links - Links for highlighting
     * @throws {Error} If nodes or links are invalid
     */
    attachEventHandlers(nodes, links) {
        this.validateNodes(nodes);
        this.validateNodes(links);

        // Store references for cleanup
        this.nodes = nodes;
        this.links = links;

        this.handleHover(nodes, links);
        this.handleSelection(nodes, links);
        this.handleTouchEvents(nodes, links);

        // Store cleanup function
        this.cleanup = () => this.cleanupResources();
    }

    /**
     * Handles touch events for mobile interaction
     * @param {d3.Selection} nodes - Node selection to handle
     * @param {d3.Selection} links - Link selection for highlighting
     * @private
     */
    handleTouchEvents(nodes, links) {
        let touchTimeout;
        const touchDelay = 500; // ms to wait for second touch

        nodes.on('touchstart', (event) => {
            event.preventDefault();
            const touch = event.touches[0];
            const node = d3.select(event.currentTarget);

            if (!touchTimeout) {
                touchTimeout = setTimeout(() => {
                    // Single tap
                    this.handleNodeClick(event, node.datum());
                    touchTimeout = null;
                }, touchDelay);
            } else {
                // Double tap
                clearTimeout(touchTimeout);
                touchTimeout = null;
                this.handleNodeDoubleClick(event, node.datum());
            }
        });

        nodes.on('touchend', (event) => {
            event.preventDefault();
        });
    }

    /**
     * Handles node click events
     * @param {Event} event - Click event
     * @param {Object} d - Node data
     * @private
     */
    handleNodeClick(event, d) {
        const node = d3.select(event.currentTarget);
        const wasSelected = this.selectedNodes.has(d.id);

        if (!event.shiftKey) {
            // Clear other selections
            this.selectedNodes.clear();
            this.nodes.classed('selected', false);
            this.transitions.updateOpacity(this.nodes, this.config.opacity.default);
        }

        if (!wasSelected) {
            // Add new selection
            this.selectedNodes.add(d.id);
            node.classed('selected', true);
            this.transitions.updateScale(node, 1.1);
            this.transitions.updateOpacity(node, this.config.opacity.selected);

            // Fade other nodes
            this.nodes.filter(n => !this.selectedNodes.has(n.id))
                .call(selection => {
                    this.transitions.updateOpacity(selection, this.config.opacity.faded);
                });

            // Highlight connected links
            this.links.call(selection => {
                this.transitions.updateOpacity(
                    selection,
                    linkData => (
                        linkData.source.id === d.id || linkData.target.id === d.id
                            ? this.config.opacity.selected
                            : this.config.opacity.faded
                    )
                );
            });
        } else {
            // Remove selection
            this.selectedNodes.delete(d.id);
            node.classed('selected', false);
            this.transitions.updateScale(node, 1);
            this.transitions.updateOpacity(node, this.config.opacity.default);

            if (this.selectedNodes.size === 0) {
                // Reset all elements if no selections remain
                this.resetAll(this.nodes, this.links);
            }
        }
    }

    /**
     * Handles node double-click events
     * @param {Event} event - Double click event
     * @param {Object} d - Node data
     * @private
     */
    handleNodeDoubleClick(event, d) {
        // Reset all selections
        this.selectedNodes.clear();
        this.resetAll(this.nodes, this.links);
    }

    /**
     * Removes all event handlers
     */
    removeEventHandlers() {
        if (this.cleanup) {
            this.cleanup();
            this.cleanup = null;
        }
    }
}
