import * as d3 from 'd3';

/**
 * Manages selection state and visual updates for graph nodes and edges
 */
export class SelectionManager {
    constructor(container) {
        this.container = container;
        this.selectedNodes = new Set();
    }

    /**
     * Select a single node
     * @param {string} nodeId - ID of the node to select
     */
    selectNode(nodeId) {
        this.selectedNodes.clear();
        this.selectedNodes.add(nodeId);
        this.updateVisuals();
    }

    /**
     * Add a node to the current selection (for multi-select)
     * @param {string} nodeId - ID of the node to add to selection
     */
    addToSelection(nodeId) {
        this.selectedNodes.add(nodeId);
        this.updateVisuals();
    }

    /**
     * Deselect a specific node
     * @param {string} nodeId - ID of the node to deselect
     */
    deselect(nodeId) {
        this.selectedNodes.delete(nodeId);
        this.updateVisuals();
    }

    /**
     * Toggle selection state of a node
     * @param {string} nodeId - ID of the node to toggle
     */
    toggleNode(nodeId) {
        if (this.selectedNodes.has(nodeId)) {
            this.selectedNodes.delete(nodeId);
        } else {
            this.selectedNodes.add(nodeId);
        }
        this.updateVisuals();
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedNodes.clear();
        this.updateVisuals();
    }

    /**
     * Check if a node is selected
     * @param {string} nodeId - ID of the node to check
     * @returns {boolean} True if the node is selected
     */
    isSelected(nodeId) {
        return this.selectedNodes.has(nodeId);
    }

    /**
     * Update visual states of all nodes and connected edges
     */
    updateVisuals() {
        // Update node styles
        d3.select(this.container)
            .selectAll('.graph-node')
            .classed('selected', d => this.selectedNodes.has(d.id))
            .classed('connected', d => this.isConnectedToSelection(d.id));

        // Update edge styles
        d3.select(this.container)
            .selectAll('.graph-link')
            .classed('highlighted', d => 
                this.selectedNodes.has(d.source.id) || 
                this.selectedNodes.has(d.target.id)
            );
    }

    /**
     * Check if a node is connected to any selected node
     * @private
     */
    isConnectedToSelection(nodeId) {
        // Skip if the node itself is selected
        if (this.selectedNodes.has(nodeId)) return false;

        // Check if any link connects this node to a selected node
        return d3.select(this.container)
            .selectAll('.graph-link')
            .data()
            .some(link => {
                const sourceId = link.source.id;
                const targetId = link.target.id;
                return (sourceId === nodeId && this.selectedNodes.has(targetId)) ||
                       (targetId === nodeId && this.selectedNodes.has(sourceId));
            });
    }
}
