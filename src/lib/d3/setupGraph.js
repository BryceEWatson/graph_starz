import * as d3 from 'd3'
import { GraphSetup } from './core/GraphSetup'
import { calculateSpiralPositions, createSpiralForce } from './layouts/spiralLayout'
import { calculateBoundingCircles, createBoundingCircleForce, renderBoundingCircles } from './layouts/boundingCircles'
import { setupAttributeForces } from './layouts/attributeLayout'
import { setupEdgeBundling, updateBundledPaths } from './interactions/edgeBundling'
import forceConfig from './forceConfig'

/**
 * Sets up a D3 graph visualization with error handling and graceful fallbacks
 * @param {d3.Selection} svgElement - D3 selection of SVG element
 * @param {Object} data - Graph data containing nodes and links
 * @param {number} width - Width of the container
 * @param {number} height - Height of the container
 * @param {string} theme - Theme name ('dark' or 'light')
 * @returns {Object} Graph elements and cleanup function
 * @throws {Error} If setup fails
 */
export function setupGraph(svgElement, data, width, height, theme) {
    let graphSetup = null
    let simulation = null

    try {
        // Get theme colors
        const colors = theme === 'dark' ? {
            nodeFill: '#374151',
            nodeStroke: '#4B5563',
            linkStroke: '#6B7280',
            textFill: '#F9FAFB',
            userNode: '#60A5FA',
            attributeNode: '#9CA3AF',
            defaultNode: '#374151',
            nodeBorder: '#4B5563'
        } : {
            nodeFill: '#F3F4F6',
            nodeStroke: '#D1D5DB',
            linkStroke: '#9CA3AF',
            textFill: '#111827',
            userNode: '#2563EB',
            attributeNode: '#4B5563',
            defaultNode: '#F3F4F6',
            nodeBorder: '#D1D5DB'
        }

        // Node size configurations
        const nodeSizes = {
            user: 60,
            image: { width: 160 },
            attribute: 30
        }

        // Initialize graph setup
        graphSetup = new GraphSetup({
            forceConfig,
            theme: { colors },
            nodeSizes
        })

        // Setup container and elements
        const { container, background } = graphSetup.setupContainer(svgElement, width, height)
        const { nodes, links } = graphSetup.createGraphElements(container, data)

        // Setup force simulation
        simulation = setupSimulation(nodes, links, width, height)

        // Setup specialized forces
        setupSpecializedForces(simulation, nodes, links)

        // Return cleanup function
        return {
            nodes,
            links,
            cleanup: () => {
                try {
                    if (simulation) simulation.stop()
                    if (graphSetup) graphSetup.cleanup()
                } catch (error) {
                    console.error('Error during cleanup:', error)
                }
            }
        }
    } catch (error) {
        // Clean up on error
        try {
            if (simulation) simulation.stop()
            if (graphSetup) graphSetup.cleanup()
        } catch (cleanupError) {
            console.error('Error during error cleanup:', cleanupError)
        }
        throw new Error('Failed to setup graph: ' + error.message)
    }
}

/**
 * Sets up the force simulation
 * @param {d3.Selection} nodes - Node elements
 * @param {d3.Selection} links - Link elements
 * @param {number} width - Container width
 * @param {number} height - Container height
 * @returns {d3.Simulation} Force simulation
 * @private
 */
function setupSimulation(nodes, links, width, height) {
    try {
        const simulation = d3.forceSimulation(nodes.data())
            .force('link', setupLinkForce(links.data()))
            .force('charge', setupChargeForce())
            .force('collide', setupCollideForce())
            .force('center', d3.forceCenter(width / 2, height / 2))
            .on('tick', () => {
                links
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y)

                nodes
                    .attr('transform', d => `translate(${d.x},${d.y})`)
            })

        return simulation
    } catch (error) {
        console.error('Failed to setup simulation:', error)
        throw new Error('Simulation setup failed: ' + error.message)
    }
}

/**
 * Sets up specialized forces for the graph
 * @param {d3.Simulation} simulation - Force simulation
 * @param {d3.Selection} nodes - Node elements
 * @param {d3.Selection} links - Link elements
 * @private
 */
function setupSpecializedForces(simulation, nodes, links) {
    try {
        // Setup spiral layout for image clusters
        const spiralForce = createSpiralForce(calculateSpiralPositions(nodes.data()))
        simulation.force('spiral', spiralForce)

        // Setup bounding circles for attribute groups
        const boundingCircles = calculateBoundingCircles(nodes.data())
        const boundingForce = createBoundingCircleForce(boundingCircles)
        simulation.force('bounding', boundingForce)

        // Setup attribute-based forces
        setupAttributeForces(simulation, nodes.data())

        // Setup edge bundling
        setupEdgeBundling(links.data())
    } catch (error) {
        console.error('Failed to setup specialized forces:', error)
        // Continue without specialized forces
        console.warn('Continuing with basic force layout')
    }
}

/**
 * Configures link force with distance calculations
 * @param {Array} links - Graph links
 * @returns {Object} Configured link force
 */
function setupLinkForce(links) {
    return d3.forceLink(links)
        .id(d => d.id)
        .distance(link => {
            const sourceType = link.source.type
            const targetType = link.target.type
            const key = `${sourceType}${targetType}`
            const variation = getVariation(key, forceConfig.link.distance.variations)
            
            if (sourceType === 'image' || targetType === 'image') {
                return forceConfig.link.distance.image * variation
            } else if (sourceType === 'user' || targetType === 'user') {
                return forceConfig.link.distance.user * variation
            } else {
                return forceConfig.link.distance.attribute * variation
            }
        })
}

/**
 * Configures charge force with type-based strengths
 * @returns {Object} Configured charge force
 */
function setupChargeForce() {
    return d3.forceManyBody()
        .strength(node => {
            return forceConfig.charge[node.type] || forceConfig.charge.attribute
        })
        .distanceMax(forceConfig.charge.distanceMax)
        .distanceMin(forceConfig.charge.distanceMin)
}

/**
 * Configures collision force with type-based radii
 * @returns {Object} Configured collision force
 */
function setupCollideForce() {
    return d3.forceCollide()
        .radius(d => {
            return forceConfig.collide.radius[d.type] || forceConfig.collide.radius.attribute
        })
        .strength(forceConfig.collide.strength)
        .iterations(forceConfig.collide.iterations)
}

/**
 * Utility function to generate consistent random variations
 * @param {string} seed - Seed string for hash calculation
 * @param {Object} config - Configuration for variation calculation
 * @returns {number} Random variation value
 */
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
