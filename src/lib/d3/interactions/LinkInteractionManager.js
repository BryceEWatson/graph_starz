import * as d3 from 'd3';
import { TransitionManager } from './TransitionManager';

/**
 * @typedef {Object} LinkInteractionConfig
 * @property {number} hoverDuration - Duration for hover transitions
 * @property {Object} opacity - Opacity configuration
 * @property {number} opacity.default - Default link opacity
 * @property {number} opacity.hover - Link opacity on hover
 * @property {number} opacity.selected - Link opacity when connected to selected node
 * @property {number} opacity.faded - Link opacity when faded
 */

/**
 * Manages link interactions in the graph
 */
export class LinkInteractionManager {
    /**
     * Creates a new LinkInteractionManager
     * @param {LinkInteractionConfig} config - Interaction configuration
     */
    constructor(config) {
        this.config = this.validateConfig(config);
        this.transitions = new TransitionManager({
            duration: config.hoverDuration,
            ease: d3.easeCubicInOut
        });
        this.cleanup = null;
    }

    /**
     * Validates interaction configuration
     * @param {LinkInteractionConfig} config - Configuration to validate
     * @returns {LinkInteractionConfig} Validated configuration
     * @throws {Error} If configuration is invalid
     * @private
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Interaction configuration is required');
        }

        const { hoverDuration, opacity } = config;
        
        if (typeof hoverDuration !== 'number' || hoverDuration <= 0) {
            throw new Error('Invalid hover duration: must be a positive number');
        }

        if (!opacity || typeof opacity !== 'object') {
            throw new Error('Invalid opacity configuration');
        }

        ['default', 'hover', 'selected', 'faded'].forEach(key => {
            if (typeof opacity[key] !== 'number' || opacity[key] < 0 || opacity[key] > 1) {
                throw new Error(`Invalid ${key} opacity: must be between 0 and 1`);
            }
        });

        return { hoverDuration, opacity };
    }

    /**
     * Validates link selection
     * @param {d3.Selection} links - Links to validate
     * @throws {Error} If links are invalid
     * @private
     */
    validateLinks(links) {
        if (!links || typeof links.on !== 'function') {
            throw new Error('Invalid links: must be a valid D3 selection');
        }
    }

    /**
     * Handles link hover events
     * @param {d3.Selection} links - Link selection to handle
     * @param {d3.Selection} nodes - Node selection for highlighting
     * @private
     */
    handleHover(links, nodes) {
        links.on('mouseover', (event, d) => {
            const hoveredLink = d3.select(event.currentTarget);
            
            // Highlight hovered link
            this.transitions.updateOpacity(hoveredLink, this.config.opacity.hover);
            this.transitions.updateStrokeWidth(hoveredLink, 2);

            // Highlight connected nodes
            nodes.filter(n => n.id === d.source.id || n.id === d.target.id)
                .call(selection => {
                    this.transitions.updateOpacity(selection, this.config.opacity.hover);
                    this.transitions.updateStrokeWidth(
                        selection.select('circle'),
                        3
                    );
                });
        });

        links.on('mouseout', (event, d) => {
            const hoveredLink = d3.select(event.currentTarget);
            
            // Reset link appearance
            this.transitions.updateOpacity(hoveredLink, this.config.opacity.default);
            this.transitions.updateStrokeWidth(hoveredLink, 1);

            // Reset connected nodes
            nodes.filter(n => n.id === d.source.id || n.id === d.target.id)
                .call(selection => {
                    this.transitions.updateOpacity(selection, this.config.opacity.default);
                    this.transitions.updateStrokeWidth(
                        selection.select('circle'),
                        2
                    );
                });
        });
    }

    /**
     * Updates link appearance based on node selection
     * @param {d3.Selection} links - Links to update
     * @param {Set<string>} selectedNodeIds - Set of selected node IDs
     */
    updateLinkSelection(links, selectedNodeIds) {
        links.call(selection => {
            this.transitions.updateOpacity(
                selection,
                d => {
                    if (selectedNodeIds.size === 0) {
                        return this.config.opacity.default;
                    }
                    return selectedNodeIds.has(d.source.id) || selectedNodeIds.has(d.target.id)
                        ? this.config.opacity.selected
                        : this.config.opacity.faded;
                }
            );

            this.transitions.updateStrokeWidth(
                selection,
                d => {
                    if (selectedNodeIds.size === 0) {
                        return 1;
                    }
                    return selectedNodeIds.has(d.source.id) || selectedNodeIds.has(d.target.id)
                        ? 2
                        : 1;
                }
            );
        });
    }

    /**
     * Attaches event handlers to links
     * @param {d3.Selection} links - Links to handle
     * @param {d3.Selection} nodes - Nodes for highlighting
     * @throws {Error} If links or nodes are invalid
     */
    attachEventHandlers(links, nodes) {
        this.validateLinks(links);
        this.validateLinks(nodes);

        this.handleHover(links, nodes);

        // Store cleanup function
        this.cleanup = () => {
            links.on('mouseover', null)
                .on('mouseout', null);
        };
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
