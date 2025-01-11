import * as d3 from 'd3'
import { NodeInteractionManager } from '../interactions/NodeInteractionManager'
import { LinkInteractionManager } from '../interactions/LinkInteractionManager'
import { TransitionManager } from '../interactions/TransitionManager'
import { validateForceConfig } from '../forceConfig'

/**
 * Manages the setup and initialization of a D3 graph visualization
 * with error boundaries and graceful fallbacks.
 */
export class GraphSetup {
    /**
     * Creates a new GraphSetup instance
     * @param {Object} config - Configuration object
     * @param {Object} config.forceConfig - Force simulation configuration
     * @param {Object} config.theme - Theme configuration
     * @param {Object} config.nodeSizes - Node size configuration
     * @throws {Error} If configuration is invalid
     */
    constructor(config) {
        try {
            this.validateConfig(config)
            this.config = config
            this.transitions = new TransitionManager({
                duration: 300,
                ease: d3.easeCubicInOut
            })
            this.nodeManager = new NodeInteractionManager(config)
            this.linkManager = new LinkInteractionManager(config)
        } catch (error) {
            console.error('Failed to initialize GraphSetup:', error)
            throw new Error('Graph initialization failed: ' + error.message)
        }
    }

    /**
     * Validates the configuration object
     * @param {Object} config - Configuration to validate
     * @private
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Configuration is required')
        }
        validateForceConfig(config.forceConfig)
        this.validateTheme(config.theme)
        this.validateNodeSizes(config.nodeSizes)
    }

    /**
     * Validates theme configuration
     * @param {Object} theme - Theme configuration
     * @private
     */
    validateTheme(theme) {
        if (!theme?.colors) {
            throw new Error('Theme colors are required')
        }
        const requiredColors = [
            'nodeFill', 'nodeStroke', 'linkStroke', 'textFill',
            'userNode', 'attributeNode', 'defaultNode', 'nodeBorder'
        ]
        requiredColors.forEach(color => {
            if (!theme.colors[color]) {
                throw new Error(`Missing required theme color: ${color}`)
            }
        })
    }

    /**
     * Validates node size configuration
     * @param {Object} sizes - Node size configuration
     * @private
     */
    validateNodeSizes(sizes) {
        if (!sizes) {
            throw new Error('Node sizes configuration is required')
        }
        if (!sizes.user || !sizes.image || !sizes.attribute) {
            throw new Error('Missing required node size configuration')
        }
    }

    /**
     * Sets up the SVG container with error handling
     * @param {d3.Selection} svgElement - D3 selection of SVG element
     * @param {number} width - Container width
     * @param {number} height - Container height
     * @returns {Object} Container elements
     * @throws {Error} If setup fails
     */
    setupContainer(svgElement, width, height) {
        try {
            // Validate input
            if (!svgElement || !width || !height) {
                throw new Error('Invalid container parameters')
            }

            // Create container group
            const container = svgElement.append('g')
                .attr('class', 'graph-container')

            // Add background for click handling
            const background = svgElement.append('rect')
                .attr('class', 'background')
                .attr('width', width)
                .attr('height', height)
                .attr('fill', 'none')
                .attr('pointer-events', 'all')

            // Add drop shadow filter
            this.setupDropShadow(svgElement)

            return { container, background }
        } catch (error) {
            console.error('Failed to setup container:', error)
            throw new Error('Container setup failed: ' + error.message)
        }
    }

    /**
     * Sets up drop shadow filter
     * @param {d3.Selection} svgElement - SVG element
     * @private
     */
    setupDropShadow(svgElement) {
        const defs = svgElement.append('defs')
        const filter = defs.append('filter')
            .attr('id', 'drop-shadow')
            .attr('height', '130%')

        filter.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 2)
            .attr('result', 'blur')

        filter.append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 1)
            .attr('dy', 1)
            .attr('result', 'offsetBlur')

        const feMerge = filter.append('feMerge')
        feMerge.append('feMergeNode')
            .attr('in', 'offsetBlur')
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic')
    }

    /**
     * Creates graph elements with error handling
     * @param {Object} container - Container elements
     * @param {Object} data - Graph data
     * @returns {Object} Graph elements
     * @throws {Error} If creation fails
     */
    createGraphElements(container, data) {
        try {
            // Validate data
            if (!data?.nodes || !data?.links) {
                throw new Error('Invalid graph data')
            }

            const links = this.createLinks(container, data.links)
            const nodes = this.createNodes(container, data.nodes)

            // Attach interaction handlers
            this.nodeManager.attachEventHandlers(nodes, links)
            this.linkManager.attachEventHandlers(links, nodes)

            return { nodes, links }
        } catch (error) {
            console.error('Failed to create graph elements:', error)
            
            // Create fallback node on error
            const fallbackNode = container.append('g')
                .attr('class', 'nodes')
                .selectAll('circle')
                .data([{ id: 'error' }])
                .join('circle')
                .attr('class', 'node fallback')
                .attr('r', this.config.nodeSizes.user)
                .attr('fill', this.config.theme.colors.nodeFill)
                .each(node => this.createFallbackNode(node))

            return { nodes: fallbackNode, links: null }
        }
    }

    /**
     * Creates link elements
     * @param {Object} container - Container elements
     * @param {Array} linkData - Link data
     * @returns {d3.Selection} Link elements
     * @private
     */
    createLinks(container, linkData) {
        return container.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(linkData)
            .join('line')
            .attr('class', 'link')
            .attr('stroke', this.config.theme.colors.linkStroke)
            .attr('stroke-width', d => d.type === 'HAS_ATTRIBUTE' ? 2 : 1)
            .attr('stroke-opacity', d => {
                if (d.type === 'HAS_ATTRIBUTE') {
                    return d.properties?.prominence || 0.6
                }
                return 0.6
            })
    }

    /**
     * Creates node elements
     * @param {Object} container - Container elements
     * @param {Array} nodeData - Node data
     * @returns {d3.Selection} Node elements
     * @private
     */
    createNodes(container, nodeData) {
        const nodes = container.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodeData)
            .join('g')
            .attr('class', d => `node ${d.type}`)

        nodes.each((d, i, elements) => {
            const node = d3.select(elements[i])
            d.element = elements[i]  // Store element reference

            try {
                if (d.type === 'image') {
                    this.createImageNode(node, d)
                } else {
                    this.createShapeNode(node, d)
                }
                this.createNodeLabel(node, d)
            } catch (error) {
                console.error(`Failed to create node ${d.id}:`, error)
                // Create fallback node
                this.createFallbackNode(node)
            }
        })

        return nodes
    }

    /**
     * Creates an image-type node
     * @param {d3.Selection} node - Node element
     * @param {Object} data - Node data
     * @private
     */
    createImageNode(node, data) {
        const imageUrl = data.properties?.graphUrl || 
                        data.properties?.thumbnailUrl || 
                        data.properties?.previewUrl

        const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIi8+PGNpcmNsZSBjeD0iOC41IiBjeT0iOC41IiByPSIxLjUiLz48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIi8+PC9zdmc+'

        const size = data.properties?.size || 150

        node.append('image')
            .attr('xlink:href', imageUrl || fallbackImage)
            .attr('width', size)
            .attr('height', size)
            .attr('x', -size / 2)
            .attr('y', -size / 2)
            .style('filter', 'url(#drop-shadow)')
    }

    /**
     * Creates a shape-type node (user, attribute)
     * @param {d3.Selection} node - Node element
     * @param {Object} data - Node data
     * @private
     */
    createShapeNode(node, data) {
        const size = this.config.nodeSizes[data.type]
        const colors = this.config.theme.colors

        const typeColors = {
            user: colors.userNode,
            image: colors.defaultNode,
            attribute: {
                color: '#FCA5A5',
                object: '#F5D0B3',
                style: '#C7D2FE',
                technique: '#A5F3FC',
                mood: '#FDE68A',
                composition: '#FDBA74'
            }
        }

        node.append('circle')
            .attr('r', size / 2)
            .attr('fill', d => {
                if (d.type === 'attribute') {
                    return typeColors.attribute[d.properties?.category] || colors.attributeNode
                }
                return typeColors[d.type] || colors.defaultNode
            })
            .attr('stroke', colors.nodeStroke)
            .attr('stroke-width', 2)
            .style('filter', 'url(#drop-shadow)')
    }

    /**
     * Creates a label for a node
     * @param {d3.Selection} node - Node element
     * @param {Object} data - Node data
     * @private
     */
    createNodeLabel(node, data) {
        if (data.type === 'image') {
            const labelContainer = node.append('g')
                .attr('class', 'image-label')
                .style('opacity', 0)

            labelContainer.append('rect')
                .attr('fill', 'rgba(0, 0, 0, 0.6)')
                .attr('rx', 4)
                .style('filter', 'url(#drop-shadow)')

            labelContainer.append('text')
                .text(data.properties?.value || data.name || '')
                .attr('fill', '#ffffff')
                .style('font-size', '14px')
                .style('font-weight', '500')
                .style('pointer-events', 'none')
        } else {
            node.append('text')
                .text(data.properties?.value || data.name || '')
                .attr('dy', data.type === 'attribute' ? 25 : 35)
                .attr('text-anchor', 'middle')
                .attr('fill', this.config.theme.colors.textFill)
                .style('font-size', '12px')
                .style('pointer-events', 'none')
        }
    }

    /**
     * Creates a fallback node when normal creation fails
     * @param {d3.Selection} node - Node element
     * @private
     */
    createFallbackNode(node) {
        node.append('circle')
            .attr('r', 15)
            .attr('fill', this.config.theme.colors.defaultNode)
            .attr('stroke', this.config.theme.colors.nodeStroke)
            .attr('stroke-width', 2)

        node.append('text')
            .text('!')
            .attr('dy', 5)
            .attr('text-anchor', 'middle')
            .attr('fill', this.config.theme.colors.textFill)
            .style('font-size', '14px')
            .style('font-weight', 'bold')
    }

    /**
     * Cleans up resources
     */
    cleanup() {
        try {
            this.nodeManager?.cleanup()
            this.linkManager?.cleanup()
        } catch (error) {
            console.error('Failed to cleanup resources:', error)
        }
    }
}
