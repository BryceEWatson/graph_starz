/**
 * Grid-based spatial organization system for graph nodes
 */

export class GridSystem {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.minNodeDistance = cellSize * 0.3; // Minimum distance between nodes
        
        // Calculate grid dimensions
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        
        // Initialize grid
        this.grid = Array(this.rows).fill().map(() => 
            Array(this.cols).fill().map(() => [])
        );
        
        // Track node positions
        this.nodePositions = new Map();
    }

    /**
     * Get grid cell coordinates for a node
     */
    getCellCoordinates(node) {
        return {
            x: Math.floor(node.x / this.cellSize),
            y: Math.floor(node.y / this.cellSize)
        };
    }

    /**
     * Add a node to the grid
     */
    addNode(node) {
        const coords = this.getCellCoordinates(node);
        if (this.isValidCell(coords)) {
            this.grid[coords.y][coords.x].push(node);
            this.nodePositions.set(node.id, { x: node.x, y: node.y });
        }
    }

    /**
     * Check if cell coordinates are valid
     */
    isValidCell(coords) {
        return coords.x >= 0 && coords.x < this.cols &&
               coords.y >= 0 && coords.y < this.rows;
    }

    /**
     * Calculate grid-based force for a node
     */
    calculateGridForce(node) {
        const coords = this.getCellCoordinates(node);
        const force = { x: 0, y: 0 };
        
        // Get target position (center of grid cell)
        const targetX = (coords.x + 0.5) * this.cellSize;
        const targetY = (coords.y + 0.5) * this.cellSize;
        
        // Calculate force towards cell center
        force.x = (targetX - node.x) * 0.1;
        force.y = (targetY - node.y) * 0.1;
        
        return force;
    }

    /**
     * Get neighboring cells for a given cell
     */
    getNeighboringCells(coords) {
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const neighborCoords = {
                    x: coords.x + dx,
                    y: coords.y + dy
                };
                if (this.isValidCell(neighborCoords)) {
                    neighbors.push(this.grid[neighborCoords.y][neighborCoords.x]);
                }
            }
        }
        return neighbors;
    }

    /**
     * Calculate separation force between two nodes
     */
    calculateSeparationForce(node1, node2) {
        const dx = node2.x - node1.x;
        const dy = node2.y - node1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.minNodeDistance && distance > 0) {
            const force = (this.minNodeDistance - distance) / distance;
            return {
                x: dx * force,
                y: dy * force
            };
        }
        return { x: 0, y: 0 };
    }

    /**
     * Adjust node positions to maintain minimum distances
     */
    adjustNodePositions() {
        const adjustedPositions = [];
        
        // Iterate through all cells
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const cell = this.grid[y][x];
                
                // Process each node in the cell
                cell.forEach(node => {
                    const force = { x: 0, y: 0 };
                    
                    // Get forces from neighboring nodes
                    this.getNeighboringCells({ x, y }).forEach(neighborCell => {
                        neighborCell.forEach(otherNode => {
                            if (otherNode !== node) {
                                const separationForce = 
                                    this.calculateSeparationForce(node, otherNode);
                                force.x -= separationForce.x;
                                force.y -= separationForce.y;
                            }
                        });
                    });
                    
                    // Add grid-based force
                    const gridForce = this.calculateGridForce(node);
                    force.x += gridForce.x;
                    force.y += gridForce.y;
                    
                    // Apply forces
                    adjustedPositions.push({
                        id: node.id,
                        x: node.x + force.x,
                        y: node.y + force.y
                    });
                });
            }
        }
        
        return adjustedPositions;
    }

    /**
     * Clear the grid
     */
    clear() {
        this.grid = Array(this.rows).fill().map(() => 
            Array(this.cols).fill().map(() => [])
        );
        this.nodePositions.clear();
    }
}
