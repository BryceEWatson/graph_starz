import * as d3 from 'd3';

/**
 * Manages viewport interactions including zoom, pan, and focus behaviors
 */
export class ViewportManager {
    /**
     * @param {d3.Selection} svgElement - The SVG element containing the graph
     * @param {number} width - Viewport width
     * @param {number} height - Viewport height
     */
    constructor(svgElement, width, height) {
        if (!svgElement || svgElement.empty()) {
            throw new Error('Invalid SVG element provided to ViewportManager');
        }

        this.svg = svgElement;
        this.width = width;
        this.height = height;
        this.currentZoom = 1;
        this.currentTransform = d3.zoomIdentity;

        // Initialize zoom behavior with constraints
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])  // Allow zoom from 10% to 400%
            .translateExtent([
                [-width * 2, -height * 2],  // Allow panning to 2x viewport size
                [width * 2, height * 2]
            ])
            .on('zoom', this.handleZoom.bind(this));

        // Create graph container for transforms
        this.container = this.svg.select('.graph-container');
        if (this.container.empty()) {
            this.container = this.svg.append('g')
                .attr('class', 'graph-container')
                .attr('transform', 'translate(0,0)');  // Initialize with identity transform
        }

        // Apply zoom behavior to SVG and set initial transform
        this.svg.call(this.zoom);
        this.svg.call(this.zoom.transform, d3.zoomIdentity);
    }

    /**
     * Handles zoom events, updating transform and notifying listeners
     * @param {d3.ZoomEvent} event - The zoom event
     */
    handleZoom(event) {
        if (!event || !event.transform) {
            console.warn('Invalid zoom event received');
            return;
        }

        this.currentZoom = event.transform.k;
        this.currentTransform = event.transform;

        // Apply transform to graph container, ensuring we don't exceed bounds
        const tx = Math.max(Math.min(event.transform.x, this.width * 2), -this.width * 2);
        const ty = Math.max(Math.min(event.transform.y, this.height * 2), -this.height * 2);
        const transform = d3.zoomIdentity
            .translate(tx, ty)
            .scale(event.transform.k);

        this.container.attr('transform', transform);
    }

    /**
     * Centers the viewport on a specific node with smooth transition
     * @param {Object} node - The node to center on
     * @param {number} duration - Transition duration in milliseconds
     */
    centerOnNode(node, duration = 750) {
        if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') {
            console.warn('Invalid node provided to centerOnNode');
            return;
        }

        const scale = this.currentZoom;
        const x = -node.x * scale + this.width / 2;
        const y = -node.y * scale + this.height / 2;

        // Create new transform, ensuring we don't exceed bounds
        const tx = Math.max(Math.min(x, this.width * 2), -this.width * 2);
        const ty = Math.max(Math.min(y, this.height * 2), -this.height * 2);
        const transform = d3.zoomIdentity
            .translate(tx, ty)
            .scale(scale);

        // Smoothly transition to new transform
        this.svg.transition()
            .duration(duration)
            .call(this.zoom.transform, transform);
    }

    /**
     * Resets the viewport to its initial state
     * @param {number} duration - Transition duration in milliseconds
     */
    reset(duration = 750) {
        this.svg.transition()
            .duration(duration)
            .call(this.zoom.transform, d3.zoomIdentity);
    }

    /**
     * Updates viewport dimensions
     * @param {number} width - New viewport width
     * @param {number} height - New viewport height
     */
    updateDimensions(width, height) {
        if (width <= 0 || height <= 0) {
            console.warn('Invalid dimensions provided to updateDimensions');
            return;
        }

        const oldWidth = this.width;
        const oldHeight = this.height;
        this.width = width;
        this.height = height;

        // Update zoom constraints
        this.zoom.translateExtent([
            [-width * 2, -height * 2],
            [width * 2, height * 2]
        ]);

        // Update container position if needed
        if (this.currentTransform) {
            // Calculate the scale factor for the dimension change
            const scaleX = width / oldWidth;
            const scaleY = height / oldHeight;

            // Create new transform that maintains relative position
            const newX = this.currentTransform.x * scaleX;
            const newY = this.currentTransform.y * scaleY;
            const transform = d3.zoomIdentity
                .translate(
                    Math.max(Math.min(newX, width * 2), -width * 2),
                    Math.max(Math.min(newY, height * 2), -height * 2)
                )
                .scale(this.currentTransform.k);

            // Apply new transform immediately
            this.svg.call(this.zoom.transform, transform);
        }
    }

    /**
     * Gets current viewport state
     * @returns {Object} Current viewport state including zoom level and transform
     */
    getState() {
        return {
            zoom: this.currentZoom,
            transform: this.currentTransform,
            width: this.width,
            height: this.height
        };
    }
}
