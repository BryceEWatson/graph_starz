// Utility functions for calculating node dimensions and spaces

/**
 * Calculate image dimensions based on fixed width and aspect ratio
 * @param {Object} node Image node with optional aspectRatio property
 * @returns {Object} Calculated dimensions including width, height, and diagonal
 */
export function getImageDimensions(node) {
    const width = 160 // Fixed width for consistency
    const aspectRatio = node.properties?.aspectRatio || 1
    const height = width / aspectRatio
    const diagonal = Math.sqrt(width * width + height * height)
    return { width, height, diagonal }
}

/**
 * Calculate the maximum image dimensions in a group of nodes
 * @param {Array} nodes Array of image nodes
 * @returns {Object} Maximum dimensions found in the group
 */
export function getMaxGroupDimensions(nodes) {
    return nodes.reduce((max, node) => {
        const dims = getImageDimensions(node)
        return {
            width: Math.max(max.width, dims.width),
            height: Math.max(max.height, dims.height),
            diagonal: Math.max(max.diagonal, dims.diagonal)
        }
    }, { width: 0, height: 0, diagonal: 0 })
}

/**
 * Calculate bounding box for an image node at its current position
 * @param {Object} node Image node with x, y position
 * @returns {Object} Bounding box with x1,y1,x2,y2 coordinates
 */
export function getNodeBoundingBox(node) {
    const { width, height } = getImageDimensions(node)
    return {
        x1: node.x - width/2,
        y1: node.y - height/2,
        x2: node.x + width/2,
        y2: node.y + height/2
    }
}

/**
 * Check if two nodes overlap based on their actual dimensions
 * @param {Object} node1 First node
 * @param {Object} node2 Second node
 * @param {number} padding Additional padding to consider
 * @returns {boolean} True if nodes overlap
 */
export function nodesOverlap(node1, node2, padding = 0) {
    const box1 = getNodeBoundingBox(node1)
    const box2 = getNodeBoundingBox(node2)
    
    return !(
        box1.x2 + padding < box2.x1 ||
        box1.x1 > box2.x2 + padding ||
        box1.y2 + padding < box2.y1 ||
        box1.y1 > box2.y2 + padding
    )
}

/**
 * Calculate the minimum distance needed between two nodes
 * @param {Object} node1 First node
 * @param {Object} node2 Second node
 * @param {number} padding Additional padding to add
 * @returns {number} Minimum safe distance between node centers
 */
export function getMinimumDistance(node1, node2, padding = 40) {
    const dims1 = getImageDimensions(node1)
    const dims2 = getImageDimensions(node2)
    return Math.max(
        dims1.diagonal/2 + dims2.diagonal/2 + padding,
        Math.max(dims1.width, dims1.height)/2 + 
        Math.max(dims2.width, dims2.height)/2 + padding
    )
}
