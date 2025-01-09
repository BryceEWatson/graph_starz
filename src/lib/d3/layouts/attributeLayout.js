// attributeLayout.js - Implements force-based attribute node positioning
import * as d3 from 'd3'
import { getImageDimensions, getMaxGroupDimensions, getMinimumDistance } from '../utils/dimensionUtils'
import { createSpiralForce } from './spiralLayout'

/**
 * Set up specialized forces for attribute nodes
 * Balances position between connected images while clustering similar attributes
 */
export function setupAttributeForces(simulation, links) {
    // Create forces with balanced strengths
    const userRepulsionForce = createUserRepulsionForce()
    const connectionForce = createConnectionForce(links)
    const stabilizationForce = createStabilizationForce()
    
    // Add forces to simulation in order of precedence
    simulation
        .force('spiral', createSpiralForce()) // Maintain image spiral structure
        .force('userRepulsion', userRepulsionForce) // Keep attributes away from subgraphs
        .force('attributeConnections', connectionForce) // Position near connected images
        .force('stabilization', stabilizationForce) // Reduce jitter and maintain structure
        .velocityDecay(0.6) // Stronger decay to help settle
}

/**
 * Create force to stabilize the layout and maintain outward distribution
 */
function createStabilizationForce() {
    let nodes = []
    let strength = 0.2 // Reduced from 0.3 for gentler force
    
    function force(alpha) {
        const userNode = nodes.find(n => n.type === 'user')
        if (!userNode) return
        
        // Use user node as center
        const centerX = userNode.x
        const centerY = userNode.y
        
        // Apply radial force to attributes
        nodes.forEach(node => {
            if (node.type !== 'attribute') return
            
            const dx = node.x - centerX
            const dy = node.y - centerY
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance > 0) {
                // Target distance increases with number of nodes to prevent crowding
                const targetDistance = 600 + (nodes.length * 2) // Reduced from 800
                
                // Outward force that gets stronger as nodes get closer to center
                const outwardForce = Math.max(0, (targetDistance - distance) / targetDistance)
                node.vx += (dx / distance) * outwardForce * strength * alpha
                node.vy += (dy / distance) * outwardForce * strength * alpha
            }
        })
        
        // Keep user node centered
        if (userNode) {
            userNode.fx = centerX
            userNode.fy = centerY
        }
    }
    
    force.initialize = function(_nodes) {
        nodes = _nodes
        
        // Find user node and fix its position at center
        const userNode = nodes.find(n => n.type === 'user')
        if (userNode) {
            userNode.fx = userNode.x
            userNode.fy = userNode.y
        }
    }
    
    return force
}

function createUserRepulsionForce() {
    let nodes = []
    let strength = 3.0 // Reduced from 4.0
    
    function force(alpha) {
        const userNodes = nodes.filter(n => n.type === 'user')
        const attrNodes = nodes.filter(n => n.type === 'attribute')
        const imageNodes = nodes.filter(n => n.type === 'image')
        
        // Pre-calculate subgraph boundaries that fully encompass all images
        const userBoundaries = userNodes.map(user => {
            const userImages = imageNodes.filter(n => 
                n.spiralParams?.userNodeId === user.id
            )
            
            // Get maximum dimensions for this user's images
            const maxDims = getMaxGroupDimensions(userImages)
            
            // Find the maximum extent from center considering actual image sizes
            const maxExtent = Math.max(
                ...userImages.map(img => {
                    const dx = img.x - user.x
                    const dy = img.y - user.y
                    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy)
                    const { diagonal } = getImageDimensions(img)
                    return distanceFromCenter + diagonal/2
                })
            )
            
            // Use the larger of spiral radius or actual extent
            const effectiveRadius = Math.max(
                maxExtent,
                (user.spiralParams?.maxRadius || 0) + maxDims.diagonal/2
            )
            
            return {
                x: user.x,
                y: user.y,
                radius: effectiveRadius + 100 // Reduced safety margin from 150
            }
        })
        
        attrNodes.forEach(attr => {
            let totalForceX = 0
            let totalForceY = 0
            let closestDistance = Infinity
            
            // Check against each user's expanded subgraph boundary
            userBoundaries.forEach(boundary => {
                const dx = attr.x - boundary.x
                const dy = attr.y - boundary.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                
                // Update closest distance
                closestDistance = Math.min(closestDistance, distance - boundary.radius)
                
                // Apply repulsion force with extended range
                const repulsionRange = boundary.radius + 200 // Reduced from 250
                if (distance < repulsionRange) {
                    // Exponential repulsion that gets very strong near the boundary
                    const repulsionStrength = Math.exp((repulsionRange - distance) / 150) * strength
                    
                    // Extra strong repulsion if inside boundary
                    const multiplier = distance < boundary.radius ? 2 : 1 // Reduced from 3
                    
                    totalForceX += (dx / distance) * repulsionStrength * multiplier
                    totalForceY += (dy / distance) * repulsionStrength * multiplier
                }
            })
            
            // Scale force based on how close we are to boundaries
            const forceScale = closestDistance < 0 ? 
                2 : // Inside boundary (reduced from 3)
                Math.max(0.1, Math.min(1, 1 - (closestDistance / 400))) // Smooth falloff
            
            // Apply combined forces
            attr.vx += totalForceX * alpha * forceScale
            attr.vy += totalForceY * alpha * forceScale
        })
    }
    
    force.initialize = function(_nodes) {
        nodes = _nodes
    }
    
    return force
}

function createConnectionForce(links) {
    let nodes = []
    let strength = 0.02 // Increased slightly from 0.015 for better balance
    
    function force(alpha) {
        const attributeLinks = links.filter(link => 
            link.type === 'HAS_ATTRIBUTE')
        
        // Group attributes by their connections
        const attributeConnections = new Map()
        attributeLinks.forEach(link => {
            const [imageNode, attrNode] = link.source.type === 'image' ? 
                [link.source, link.target] : [link.target, link.source]
            
            if (!attributeConnections.has(attrNode.id)) {
                attributeConnections.set(attrNode.id, [])
            }
            attributeConnections.get(attrNode.id).push({
                image: imageNode,
                prominence: link.properties?.prominence || 0.5
            })
        })
        
        // Process each attribute
        attributeConnections.forEach((connections, attrId) => {
            const attrNode = nodes.find(n => n.id === attrId)
            if (!attrNode || attrNode.type !== 'attribute') return
            
            // Calculate average position of connected images
            let avgX = 0, avgY = 0, totalProminence = 0
            connections.forEach(conn => {
                avgX += conn.image.x * conn.prominence
                avgY += conn.image.y * conn.prominence
                totalProminence += conn.prominence
            })
            avgX /= totalProminence
            avgY /= totalProminence
            
            const targetDistance = Math.max(
                500, // Reduced from 700
                400 + (300 * (1 - (totalProminence / connections.length))) // Reduced from 600 + 400
            )
            
            const dx = avgX - attrNode.x
            const dy = avgY - attrNode.y
            const currentDistance = Math.sqrt(dx * dx + dy * dy)
            
            if (currentDistance > 0 && currentDistance < targetDistance * 1.5) {
                const moveX = (dx / currentDistance) * (currentDistance - targetDistance) * strength * alpha
                const moveY = (dy / currentDistance) * (currentDistance - targetDistance) * strength * alpha
                
                const connectionScale = 1 / Math.sqrt(connections.length)
                attrNode.vx += moveX * connectionScale
                attrNode.vy += moveY * connectionScale
            }
        })
    }
    
    force.initialize = function(_nodes) {
        nodes = _nodes
    }
    
    return force
}

/**
 * Helper function to get attribute prominence
 */
export function getAttributeProminence(links, attributeId) {
    const attributeLinks = links.filter(link => 
        link.type === 'HAS_ATTRIBUTE' &&
        (link.source.id === attributeId || link.target.id === attributeId))
    
    if (attributeLinks.length === 0) return 0.5
    
    return d3.mean(attributeLinks, link => link.properties?.prominence || 0.5)
}
