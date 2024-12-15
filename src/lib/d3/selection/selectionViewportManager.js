import * as d3 from 'd3';
import { ViewportManager } from '../viewportManager';

/**
 * Integrates selection management with viewport control
 */
export class SelectionViewportManager {
    /**
     * @param {d3.Selection} container - The container element
     * @param {number} width - Viewport width
     * @param {number} height - Viewport height
     */
    constructor(container, width, height) {
        if (!container || container.empty()) {
            throw new Error('Invalid container element provided to SelectionViewportManager');
        }

        this.container = container;
        this.selectedNodes = new Set();
        this.selectedNodesList = [];  // Ordered list for navigation
        this.currentFocusIndex = -1;
        
        // Initialize viewport manager
        this.viewportManager = new ViewportManager(container, width, height);
        
        // Bind keyboard events
        this.container.on('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * Select a node and center viewport on it
     * @param {Object} node - The node to select and focus
     */
    selectAndFocus(node) {
        if (!node || !node.id) {
            console.warn('Invalid node provided to selectAndFocus');
            return;
        }

        this.selectedNodes.clear();
        this.selectedNodes.add(node.id);
        this.selectedNodesList = [node];
        this.currentFocusIndex = 0;
        
        this.updateVisuals();
        this.viewportManager.centerOnNode(node);
    }

    /**
     * Add a node to selection and adjust viewport
     * @param {Object} node - The node to add to selection
     */
    addToSelectionAndAdjustView(node) {
        if (!node || !node.id) {
            console.warn('Invalid node provided to addToSelectionAndAdjustView');
            return;
        }

        if (!this.selectedNodes.has(node.id)) {
            this.selectedNodes.add(node.id);
            this.selectedNodesList.push(node);
            this.currentFocusIndex = this.selectedNodesList.length - 1;
            
            this.updateVisuals();
            this.adjustViewportToSelection();
        }
    }

    /**
     * Navigate through selected nodes
     * @param {'next' | 'prev'} direction - Navigation direction
     */
    navigateSelection(direction) {
        if (this.selectedNodesList.length <= 1) return;

        if (direction !== 'next' && direction !== 'prev') {
            console.warn('Invalid direction provided to navigateSelection');
            return;
        }

        if (direction === 'next') {
            this.currentFocusIndex = (this.currentFocusIndex + 1) % this.selectedNodesList.length;
        } else {
            this.currentFocusIndex = this.currentFocusIndex <= 0 
                ? this.selectedNodesList.length - 1 
                : this.currentFocusIndex - 1;
        }

        const focusedNode = this.selectedNodesList[this.currentFocusIndex];
        if (focusedNode) {
            this.viewportManager.centerOnNode(focusedNode);
            this.updateVisuals();
        }
    }

    /**
     * Handle keyboard navigation events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (!event) {
            console.warn('Invalid event provided to handleKeyDown');
            return;
        }

        switch (event.key) {
            case 'Tab':
                event.preventDefault();
                this.navigateSelection(event.shiftKey ? 'prev' : 'next');
                break;
            case 'Escape':
                this.clearSelection();
                break;
            default:
                // Ignore other keys
                break;
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedNodes.clear();
        this.selectedNodesList = [];
        this.currentFocusIndex = -1;
        this.updateVisuals();
    }

    /**
     * Update visual state of nodes and edges
     */
    updateVisuals() {
        try {
            // Update node styles
            this.container.selectAll('.node')
                .classed('selected', d => d && d.id && this.selectedNodes.has(d.id))
                .classed('focused', d => d && d.id && this.currentFocusIndex >= 0 && 
                    d.id === this.selectedNodesList[this.currentFocusIndex].id);

            // Update edge styles based on connected nodes
            this.container.selectAll('.link')
                .classed('connected', d => d && d.source && d.target && (
                    this.selectedNodes.has(d.source.id) || 
                    this.selectedNodes.has(d.target.id)
                ));
        } catch (error) {
            console.error('Error updating visuals:', error);
        }
    }

    /**
     * Adjust viewport to show all selected nodes
     */
    adjustViewportToSelection() {
        if (this.selectedNodesList.length <= 1) return;

        try {
            // Calculate bounding box of selected nodes
            const bounds = this.selectedNodesList.reduce((box, node) => {
                if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') {
                    throw new Error('Invalid node coordinates');
                }

                box.minX = Math.min(box.minX, node.x);
                box.maxX = Math.max(box.maxX, node.x);
                box.minY = Math.min(box.minY, node.y);
                box.maxY = Math.max(box.maxY, node.y);
                return box;
            }, { 
                minX: Infinity, 
                maxX: -Infinity, 
                minY: Infinity, 
                maxY: -Infinity 
            });

            // Validate bounds
            if (!isFinite(bounds.minX) || !isFinite(bounds.maxX) || 
                !isFinite(bounds.minY) || !isFinite(bounds.maxY)) {
                throw new Error('Invalid bounding box calculated');
            }

            // Add padding
            const padding = 50;
            bounds.minX -= padding;
            bounds.maxX += padding;
            bounds.minY -= padding;
            bounds.maxY += padding;

            // Calculate required scale
            const width = this.viewportManager.width;
            const height = this.viewportManager.height;
            const scaleX = width / (bounds.maxX - bounds.minX);
            const scaleY = height / (bounds.maxY - bounds.minY);
            const scale = Math.min(Math.min(scaleX, scaleY), 2);  // Cap at 2x zoom

            // Ensure valid scale
            if (!isFinite(scale) || scale <= 0) {
                throw new Error('Invalid scale calculated');
            }

            // Calculate center point
            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;

            // Create transform
            const transform = d3.zoomIdentity
                .translate(
                    Math.max(Math.min(width / 2 - centerX * scale, width * 2), -width * 2),
                    Math.max(Math.min(height / 2 - centerY * scale, height * 2), -height * 2)
                )
                .scale(scale);

            // Apply transform through viewport manager
            this.container.transition()
                .duration(750)
                .call(this.viewportManager.zoom.transform, transform);

        } catch (error) {
            console.error('Error adjusting viewport:', error);
        }
    }

    /**
     * Get current selection state
     * @returns {Set} Set of selected node IDs
     */
    getSelectedNodes() {
        return this.selectedNodes;
    }

    /**
     * Get current viewport state
     * @returns {Object} Current viewport state
     */
    getViewportState() {
        return this.viewportManager.getState();
    }

    /**
     * Get current focus index
     * @returns {number} Index of currently focused node
     */
    getCurrentFocusIndex() {
        return this.currentFocusIndex;
    }
}
