// spiralLayout.js - Implements Archimedean spiral layout for user-image subgraphs
import * as d3 from 'd3'
import { getImageDimensions, getMaxGroupDimensions } from '../utils/dimensionUtils'

/**
 * Calculate positions for images in an Archimedean spiral around their user node
 * r = a + bθ where:
 * a = base radius (minimum distance from center)
 * b = growth rate (adjusted for image sizes)
 * θ = angular step (2π / max(minImages, numImages))
 */
export function calculateSpiralPositions(userNode, imageNodes) {
    const padding = 40 // Minimum padding between images
    
    // Find maximum dimensions in this group of images
    const maxDims = getMaxGroupDimensions(imageNodes)
    
    // Base radius should account for largest possible image
    const baseRadius = Math.max(
        180, // Start closer to user
        maxDims.diagonal/2 + padding // Ensure first image has room
    )
    
    // Use more angular steps for smoother spiral
    const minImages = 24 // Increased significantly for smoother curve
    const imageCount = imageNodes.length
    
    // Calculate total angle needed based on number of images
    // Each image takes up ~π/4 radians (45°) of arc
    const anglePerImage = Math.PI / 4
    const totalAngle = Math.max(minImages, imageCount) * anglePerImage
    
    // Growth rate increases with angle to make spiral more apparent
    const baseGrowthRate = maxDims.width / (2 * Math.PI)
    function getGrowthRate(theta) {
        // Growth rate increases quadratically with angle
        return baseGrowthRate * (1 + (theta / (2 * Math.PI)) * 0.5)
    }
    
    // Position each image node along the spiral
    imageNodes.forEach((node, index) => {
        // Calculate angle based on index and total images
        const progress = index / (imageNodes.length - 1 || 1)
        const theta = progress * totalAngle
        
        // Calculate radius with dynamic growth rate
        let radius = baseRadius
        for (let t = 0; t < theta; t += 0.1) {
            radius += getGrowthRate(t) * 0.1
        }
        
        // Convert polar to cartesian coordinates
        node.x = userNode.x + (radius * Math.cos(theta))
        node.y = userNode.y + (radius * Math.sin(theta))
        
        // Store spiral parameters for later use
        node.spiralParams = {
            theta,
            radius,
            userNodeId: userNode.id,
            // Store dimensions for force calculations
            ...getImageDimensions(node)
        }
    })
    
    // Calculate and return the maximum radius reached
    const maxRadius = imageNodes.reduce((max, node) => 
        Math.max(max, node.spiralParams.radius), baseRadius)
    
    return {
        maxRadius,
        imagePositions: imageNodes.map(node => ({
            id: node.id,
            x: node.x,
            y: node.y,
            theta: node.spiralParams.theta,
            radius: node.spiralParams.radius
        }))
    }
}

/**
 * Create force to maintain spiral structure
 */
export function createSpiralForce() {
    let nodes = []
    let strength = 1.0
    
    function force(alpha) {
        // Find all spiral groups (images grouped by user)
        const userNodes = nodes.filter(n => n.type === 'user')
        
        userNodes.forEach(user => {
            const spiralImages = nodes.filter(n => 
                n.type === 'image' && 
                n.spiralParams?.userNodeId === user.id
            )
            
            // Apply force to maintain spiral structure
            spiralImages.forEach(node => {
                const params = node.spiralParams
                if (!params) return
                
                // Calculate ideal spiral position
                const idealX = user.x + (params.radius * Math.cos(params.theta))
                const idealY = user.y + (params.radius * Math.sin(params.theta))
                
                // Move towards ideal position with strong force
                const dx = idealX - node.x
                const dy = idealY - node.y
                node.vx += dx * alpha * strength
                node.vy += dy * alpha * strength
            })
        })
    }
    
    force.initialize = function(_nodes) {
        nodes = _nodes
    }
    
    return force
}
