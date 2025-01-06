/**
 * HTML-based details view for graph nodes
 */

import * as d3 from 'd3'
import { applyNodeState } from './hover'

let isDetailsViewActive = false
let activeDetailsNode = null
let currentSvg = null // Store reference to current SVG

/**
 * Exit details view mode
 */
export function exitDetailsView() {
    if (!isDetailsViewActive || !currentSvg) return
    
    // Remove details view
    currentSvg.select('#details-parent').remove()
    
    // Reset active node state
    if (activeDetailsNode) {
        const nodeSelection = d3.select(activeDetailsNode.element)
        applyNodeState(nodeSelection, 'normal')
    }
    
    // Restore all nodes and links
    currentSvg.selectAll('.node').style('opacity', 1)
    currentSvg.selectAll('.link').style('opacity', 0.6)
    
    // Reset state
    isDetailsViewActive = false
    activeDetailsNode = null
    currentSvg = null
    
    // Remove escape key handler
    document.removeEventListener('keydown', handleEscapeKey)
}

/**
 * Handle escape key press
 */
function handleEscapeKey(event) {
    if (event.key === 'Escape') {
        exitDetailsView()
    }
}

/**
 * Calculate optimal image size based on natural dimensions and viewport constraints
 */
function calculateOptimalImageSize(naturalWidth, naturalHeight) {
    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Constants for space allocation
    const NAVBAR_HEIGHT = 64
    const MIN_PADDING = 40
    const TITLE_HEIGHT = 32
    const DESC_PADDING = 5
    const MIN_DESC_WIDTH = 300 // Minimum for small screens
    const MAX_DESC_WIDTH = 650 // Maximum for readability
    const MIN_DESC_HEIGHT = 150 // Minimum for 3-4 lines of text
    const OPTIMAL_DESC_HEIGHT = 180 // Optimal for typical Claude descriptions
    const MIN_CONTAINER_WIDTH = Math.max(MIN_DESC_WIDTH + (MIN_PADDING * 2), 400)
    const VERTICAL_GAP = 10
    
    // Calculate maximum available space for the details view
    const maxDetailsWidth = viewportWidth - (MIN_PADDING * 2)
    const maxDetailsHeight = viewportHeight - NAVBAR_HEIGHT - (MIN_PADDING * 2)
    
    // Calculate space needed for non-image content
    const verticalSpacing = TITLE_HEIGHT + OPTIMAL_DESC_HEIGHT + (VERTICAL_GAP * 2) + (MIN_PADDING * 2)
    
    // For small screens, prioritize description width over image size
    const isSmallScreen = maxDetailsWidth < 800
    const maxImageWidth = isSmallScreen 
        ? Math.min(maxDetailsWidth - (MIN_PADDING * 2), MAX_DESC_WIDTH) 
        : maxDetailsWidth * 0.9
    
    // Calculate maximum possible space for image
    const maxImageHeight = maxDetailsHeight - verticalSpacing
    
    // Calculate scale based on available space while preserving aspect ratio
    const scale = Math.min(
        maxImageWidth / naturalWidth,
        maxImageHeight / naturalHeight,
        1
    )
    
    // Calculate image dimensions (aspect ratio is preserved)
    const imageWidth = Math.round(naturalWidth * scale)
    const imageHeight = Math.round(naturalHeight * scale)
    
    // Calculate minimal padding based on image size
    const sidePadding = Math.max(MIN_PADDING, Math.min(80, imageWidth * 0.05))
    const verticalPadding = Math.max(16, Math.min(20, imageHeight * 0.05))
    
    // Calculate container width to ensure minimum width requirements
    const minContainerWidth = Math.max(
        MIN_CONTAINER_WIDTH,
        imageWidth + (sidePadding * 2),
        MIN_DESC_WIDTH + (sidePadding * 2)
    )
    
    // Expand container width up to 95% of available width if needed
    const containerWidth = Math.min(
        Math.max(minContainerWidth, maxDetailsWidth * 0.8),
        maxDetailsWidth * 0.95
    )
    
    // Calculate description width based on container width and screen size
    const descriptionWidth = Math.min(
        Math.max(
            MIN_DESC_WIDTH,
            isSmallScreen ? containerWidth - (sidePadding * 2) : MAX_DESC_WIDTH
        ),
        MAX_DESC_WIDTH
    )
    
    // Calculate content-driven height with increased description space
    const contentHeight = TITLE_HEIGHT + VERTICAL_GAP + imageHeight + VERTICAL_GAP + OPTIMAL_DESC_HEIGHT
    const containerHeight = Math.min(
        maxDetailsHeight,
        contentHeight + (verticalPadding * 2)
    )
    
    // Calculate actual description height based on remaining space
    const descriptionHeight = Math.max(
        MIN_DESC_HEIGHT,
        Math.min(
            OPTIMAL_DESC_HEIGHT,
            containerHeight - (TITLE_HEIGHT + VERTICAL_GAP + imageHeight + VERTICAL_GAP + verticalPadding * 2)
        )
    )
    
    return {
        image: { width: imageWidth, height: imageHeight },
        padding: { 
            side: sidePadding, 
            vertical: verticalPadding,
            gap: VERTICAL_GAP
        },
        description: { 
            height: descriptionHeight,
            padding: DESC_PADDING,
            width: descriptionWidth
        },
        container: {
            width: containerWidth,
            height: containerHeight
        },
        title: { height: TITLE_HEIGHT }
    }
}

/**
 * Create the details view container within the SVG
 */
function createDetailsContainer(svg, node) {
    // Remove any existing details view
    svg.select('#details-parent').remove()
    
    // Get the optimal dimensions
    const dimensions = node.properties?.detailsSize
    if (!dimensions) return null
    
    // Create parent group for details view
    const detailsParent = svg.select('.nodes')
        .append('g')
        .attr('id', 'details-parent')
        .attr('class', 'details-view')
        .datum({
            x: node.x,
            y: node.y,
            type: 'details',
            sourceNode: node,
            tick: function() {
                const x = this.sourceNode.x
                const y = this.sourceNode.y
                d3.select(this.element)
                    .attr('transform', `translate(${x},${y})`)
            }
        })
    
    // Store element reference and set initial position
    const datum = detailsParent.datum()
    datum.element = detailsParent.node()
    datum.tick()
    
    // Create container with background
    const container = detailsParent.append('g')
        .attr('transform', `translate(${-dimensions.container.width/2},${-dimensions.container.height/2})`)
    
    // Add background
    container.append('rect')
        .attr('width', dimensions.container.width)
        .attr('height', dimensions.container.height)
        .attr('rx', 8)
        .attr('fill', '#1f2937')
        .attr('stroke', '#374151')
        .attr('stroke-width', 2)
    
    // Add content container
    const content = container.append('foreignObject')
        .attr('width', dimensions.container.width)
        .attr('height', dimensions.container.height)
        .append('xhtml:div')
        .attr('xmlns', 'http://www.w3.org/1999/xhtml')
        .attr('id', 'details-view')
        .attr('class', 'w-full h-full flex flex-col items-center text-gray-100')
        .style('width', `${dimensions.container.width}px`)  
        .style('padding', '0')  
        .style('overflow', 'hidden')
    
    // Add title with reduced height
    content.append('h2')
        .attr('id', 'details-title')
        .attr('class', 'text-xl font-bold text-white mt-2 mb-2 text-center w-full')
        .style('height', `${dimensions.title.height}px`)
        .style('line-height', `${dimensions.title.height}px`)
    
    // Add image container with minimal margins
    const imageContainer = content.append('div')
        .attr('class', 'flex-shrink-0 flex items-center justify-center')
        .style('width', `${dimensions.image.width}px`)
        .style('height', `${dimensions.image.height}px`)
        .style('margin', `${dimensions.padding.gap}px auto`)
    
    // Add image with proper sizing
    imageContainer.append('img')
        .attr('id', 'details-image')
        .attr('class', 'object-contain rounded-lg')
        .style('max-width', '100%')
        .style('max-height', '100%')
    
    // Add description container with proper spacing
    content.append('div')
        .attr('id', 'details-description')
        .attr('class', 'text-gray-300 text-sm text-center w-full')
        .style('width', `${dimensions.description.width}px`)
        .style('margin', `${dimensions.padding.gap}px auto 0`)
        .style('padding', `${dimensions.description.padding}px`)
        .style('height', `${dimensions.description.height}px`)
    
    // Add close button
    const closeButton = container.append('g')
        .attr('transform', `translate(${dimensions.container.width - 32}, 24)`)
        .attr('id', 'details-close')
        .attr('class', 'cursor-pointer')
        .style('cursor', 'pointer')
    
    closeButton.append('circle')
        .attr('class', 'visible-circle')
        .attr('r', 12)
        .attr('fill', '#374151')
    
    closeButton.append('path')
        .attr('d', 'M-4 -4L4 4M-4 4L4 -4')
        .attr('stroke', '#D1D5DB')
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
    
    closeButton.append('circle')
        .attr('class', 'click-area')
        .attr('r', 16)
        .attr('fill', 'rgba(0,0,0,0)')
        .on('click', (event) => {
            event.stopPropagation()
            exitDetailsView()
        })
        .on('mouseover', () => {
            closeButton.select('.visible-circle').attr('fill', '#4B5563')
        })
        .on('mouseout', () => {
            closeButton.select('.visible-circle').attr('fill', '#374151')
        })
    
    return detailsParent
}

/**
 * Enter details view mode
 */
export function enterDetailsView(node, nodes, links) {
    if (isDetailsViewActive) return
    
    isDetailsViewActive = true
    activeDetailsNode = node
    currentSvg = d3.select(nodes.node().closest('svg'))
    
    // Load image first to get natural dimensions
    const tempImg = new Image()
    tempImg.onload = () => {
        // Calculate optimal dimensions based on natural image size and viewport
        const dimensions = calculateOptimalImageSize(tempImg.naturalWidth, tempImg.naturalHeight)
        
        // Store the calculated dimensions
        node.properties.detailsSize = dimensions
        
        // Create details view and get the parent container
        const detailsParent = createDetailsContainer(currentSvg, node)
        if (!detailsParent) return
        
        // Fade other nodes and links
        nodes.style('opacity', d => d === node ? 1 : 0.1)
        links.style('opacity', 0.1)
        
        // Set content
        const detailsView = currentSvg.select('#details-view')
        
        // Set title
        detailsView.select('#details-title')
            .text(node.properties?.title || 'Untitled Image')
        
        // Set image source
        detailsView.select('#details-image')
            .attr('src', node.properties?.fullUrl)
        
        // Set description
        detailsView.select('#details-description')
            .text(node.properties?.description || '')
    }
    
    tempImg.onerror = () => {
        console.error('Failed to load image:', node.properties?.fullUrl)
        // Use default dimensions for error case
        const dimensions = calculateOptimalImageSize(800, 600)
        node.properties.detailsSize = dimensions
        createDetailsContainer(currentSvg, node)
    }
    
    tempImg.src = node.properties?.fullUrl || ''
    
    // Add escape key handler
    document.addEventListener('keydown', handleEscapeKey)
}

/**
 * Setup details view interactions
 */
export function setupDetailsViewInteractions(nodes, links) {
    const handleDoubleClick = (event, d) => {
        event.stopPropagation()
        
        if (d.type !== 'image') return // Only images can be viewed in detail
        
        if (activeDetailsNode === d) {
            exitDetailsView()
        } else {
            enterDetailsView(d, nodes, links)
        }
    }
    
    // Add double-click handlers to nodes
    nodes.on('dblclick.details', handleDoubleClick)
    
    // Handle background double-click to exit details view
    const svg = d3.select(nodes.node().closest('svg'))
    svg.on('dblclick.details', (event) => {
        if (event.target === svg.node() && isDetailsViewActive) {
            exitDetailsView()
        }
    })
    
    return () => {
        nodes.on('dblclick.details', null)
        svg.on('dblclick.details', null)
        if (isDetailsViewActive) {
            exitDetailsView()
        }
    }
}
