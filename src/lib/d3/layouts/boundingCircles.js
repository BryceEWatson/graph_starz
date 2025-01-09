// boundingCircles.js - Implements dynamic bounding circles for user-image subgraphs
import * as d3 from 'd3'

/**
 * Calculate and update bounding circles for user-image subgraphs
 * Circles dynamically size based on spiral extent and prevent overlap
 */
export function calculateBoundingCircles(nodes, imagePositions) {
    // Group images by user
    const userSubgraphs = new Map()
    
    nodes.forEach(node => {
        if (node.type === 'user') {
            // Initialize user subgraphs with user nodes
            userSubgraphs.set(node.id, {
                user: node,
                images: [],
                maxRadius: 0
            })
        }
    })
    
    // Add images to their user's subgraph
    imagePositions.forEach(pos => {
        const imageNode = nodes.find(n => n.id === pos.id)
        if (!imageNode || !imageNode.spiralParams) return
        
        const subgraph = userSubgraphs.get(imageNode.spiralParams.userNodeId)
        if (subgraph) {
            subgraph.images.push(pos)
            subgraph.maxRadius = Math.max(subgraph.maxRadius, pos.radius)
        }
    })
    
    // Calculate bounding circles with padding
    const boundingCircles = []
    const padding = 40 // Extra padding beyond max spiral radius
    
    userSubgraphs.forEach(subgraph => {
        if (subgraph.images.length === 0) return
        
        boundingCircles.push({
            id: subgraph.user.id,
            x: subgraph.user.x,
            y: subgraph.user.y,
            radius: subgraph.maxRadius + padding
        })
    })
    
    return boundingCircles
}

/**
 * Create a force to prevent bounding circle overlap
 */
export function createBoundingCircleForce() {
    let circles = []
    let strength = 0.2
    let nodes = []
    
    function force(alpha) {
        // Apply repulsion between bounding circles
        circles.forEach((circle1, i) => {
            circles.slice(i + 1).forEach(circle2 => {
                const dx = circle2.x - circle1.x
                const dy = circle2.y - circle1.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                const minDistance = circle1.radius + circle2.radius
                
                if (distance < minDistance) {
                    const moveX = (dx / distance) * (minDistance - distance) * strength * alpha
                    const moveY = (dy / distance) * (minDistance - distance) * strength * alpha
                    
                    // Move user nodes and their subgraphs
                    const user1 = nodes.find(n => n.id === circle1.id)
                    const user2 = nodes.find(n => n.id === circle2.id)
                    
                    if (user1 && user2) {
                        user1.x -= moveX
                        user1.y -= moveY
                        user2.x += moveX
                        user2.y += moveY
                        
                        // Move associated image nodes
                        nodes.forEach(node => {
                            if (node.type === 'image') {
                                if (node.spiralParams?.userNodeId === user1.id) {
                                    node.x -= moveX
                                    node.y -= moveY
                                } else if (node.spiralParams?.userNodeId === user2.id) {
                                    node.x += moveX
                                    node.y += moveY
                                }
                            }
                        })
                    }
                }
            })
        })
    }
    
    force.initialize = function(_nodes) {
        nodes = _nodes
    }
    
    force.circles = function(_) {
        return arguments.length ? (circles = _, force) : circles
    }
    
    force.strength = function(_) {
        return arguments.length ? (strength = _, force) : strength
    }
    
    return force
}

/**
 * Render bounding circles with theme-based styling
 */
export function renderBoundingCircles(container, circles, theme) {
    const circleGroup = container.selectAll('g.bounding-circles').data([null])
        .join('g')
        .attr('class', 'bounding-circles')
    
    // Use theme colors with reduced opacity
    const strokeColor = theme === 'dark' ? 
        'rgba(75, 85, 99, 0.3)' :  // Gray-600 with 0.3 opacity
        'rgba(209, 213, 219, 0.3)' // Gray-300 with 0.3 opacity
    
    const fillColor = theme === 'dark' ?
        'rgba(31, 41, 55, 0.1)' :  // Gray-800 with 0.1 opacity
        'rgba(243, 244, 246, 0.1)' // Gray-100 with 0.1 opacity
    
    // Update circles
    circleGroup.selectAll('circle')
        .data(circles)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.radius)
        .attr('fill', fillColor)
        .attr('stroke', strokeColor)
        .attr('stroke-width', 1)
        .attr('pointer-events', 'none') // Don't interfere with interactions
}
