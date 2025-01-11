import * as d3 from 'd3';
import forceConfig from '../forceConfig';

/**
 * @typedef {Object} InitializerConfig
 * @property {number} width - Width of the graph area
 * @property {number} height - Height of the graph area
 * @property {string} [theme='light'] - Visual theme
 */

/**
 * @typedef {Object} GraphContainer
 * @property {d3.Selection} container - Main graph container
 * @property {d3.Selection} defs - Definitions container
 * @property {d3.Selection} nodes - Nodes container
 * @property {d3.Selection} links - Links container
 */

/**
 * Handles initialization of D3 graph visualization
 */
export class GraphInitializer {
    /**
     * Creates a new GraphInitializer instance
     * @param {InitializerConfig} config - Initialization configuration
     * @throws {Error} If configuration is invalid
     */
    constructor(config) {
        this.config = this.validateConfig(config);
    }

    /**
     * Validates initialization configuration
     * @param {InitializerConfig} config - Configuration to validate
     * @returns {InitializerConfig} Validated configuration
     * @throws {Error} If configuration is invalid
     * @private
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Configuration is required');
        }

        const { width, height } = config;
        if (typeof width !== 'number' || width <= 0) {
            throw new Error('Invalid width: must be a positive number');
        }
        if (typeof height !== 'number' || height <= 0) {
            throw new Error('Invalid height: must be a positive number');
        }

        return {
            width,
            height,
            theme: config.theme || 'light'
        };
    }

    /**
     * Validates SVG element
     * @param {d3.Selection} element - Element to validate
     * @throws {Error} If element is invalid
     * @private
     */
    validateElement(element) {
        if (!element || !element.node || typeof element.node !== 'function') {
            throw new Error('Invalid SVG element: element must be a valid D3 selection');
        }

        const node = element.node();
        if (!node || node.tagName !== 'svg') {
            throw new Error('Invalid SVG element: element must be an SVG node');
        }
    }

    /**
     * Creates the main container structure
     * @param {d3.Selection} svg - SVG element to initialize
     * @returns {GraphContainer} Initialized container structure
     * @private
     */
    createContainer(svg) {
        // Create main container with zoom support
        const container = svg.append('g')
            .attr('class', 'graph-container')
            .attr('data-theme', this.config.theme);

        // Create definitions for markers and filters
        const defs = container.append('defs');

        // Create groups for graph elements
        const links = container.append('g')
            .attr('class', 'links');

        const nodes = container.append('g')
            .attr('class', 'nodes');

        return { container, defs, nodes, links };
    }

    /**
     * Creates force simulation
     * @returns {d3.Simulation} Configured force simulation
     * @private
     */
    createSimulation() {
        return d3.forceSimulation()
            .force('center', d3.forceCenter(this.config.width / 2, this.config.height / 2))
            .alpha(forceConfig.simulation.alpha)
            .alphaDecay(forceConfig.simulation.alphaDecay)
            .alphaTarget(forceConfig.simulation.alphaTarget);
    }

    /**
     * Initializes graph visualization
     * @param {d3.Selection} svgElement - SVG element to initialize
     * @returns {Object} Initialized graph components
     * @throws {Error} If initialization fails
     */
    initialize(svgElement) {
        try {
            this.validateElement(svgElement);

            // Set up SVG viewport
            svgElement
                .attr('width', this.config.width)
                .attr('height', this.config.height)
                .attr('viewBox', [0, 0, this.config.width, this.config.height]);

            // Create container structure
            const container = this.createContainer(svgElement);

            // Initialize force simulation
            const simulation = this.createSimulation();

            return {
                container: container.container,
                defs: container.defs,
                nodes: container.nodes,
                links: container.links,
                simulation,
                config: this.config
            };
        } catch (error) {
            throw new Error(`Graph initialization failed: ${error.message}`);
        }
    }
}
