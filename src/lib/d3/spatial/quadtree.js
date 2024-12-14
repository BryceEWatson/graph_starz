/**
 * Efficient spatial indexing for graph nodes using a QuadTree
 */

export class QuadTreeNode {
    constructor(bounds) {
        this.bounds = bounds;  // {x, y, width, height}
        this.nodes = [];      // Nodes in this quad
        this.children = null; // Four child quads
        this.maxNodes = 4;    // Max nodes before splitting
    }

    /**
     * Splits this quad into four children
     */
    split() {
        const halfWidth = this.bounds.width / 2;
        const halfHeight = this.bounds.height / 2;
        
        this.children = [
            // Top-left
            new QuadTreeNode({
                x: this.bounds.x,
                y: this.bounds.y,
                width: halfWidth,
                height: halfHeight
            }),
            // Top-right
            new QuadTreeNode({
                x: this.bounds.x + halfWidth,
                y: this.bounds.y,
                width: halfWidth,
                height: halfHeight
            }),
            // Bottom-left
            new QuadTreeNode({
                x: this.bounds.x,
                y: this.bounds.y + halfHeight,
                width: halfWidth,
                height: halfHeight
            }),
            // Bottom-right
            new QuadTreeNode({
                x: this.bounds.x + halfWidth,
                y: this.bounds.y + halfHeight,
                width: halfWidth,
                height: halfHeight
            })
        ];
        
        // Redistribute existing nodes to children
        this.nodes.forEach(node => {
            this.insertToChildren(node);
        });
        this.nodes = [];
    }

    /**
     * Determines which child quad a point belongs to
     */
    getQuadrantIndex(x, y) {
        const midX = this.bounds.x + (this.bounds.width / 2);
        const midY = this.bounds.y + (this.bounds.height / 2);
        
        if (y < midY) {
            return x < midX ? 0 : 1; // Top quads
        } else {
            return x < midX ? 2 : 3; // Bottom quads
        }
    }

    /**
     * Inserts a node to the appropriate child quad
     */
    insertToChildren(node) {
        const index = this.getQuadrantIndex(node.x, node.y);
        this.children[index].insert(node);
    }

    /**
     * Checks if a node intersects with this quad
     */
    intersects(node) {
        return !(node.x - node.radius > this.bounds.x + this.bounds.width ||
                node.x + node.radius < this.bounds.x ||
                node.y - node.radius > this.bounds.y + this.bounds.height ||
                node.y + node.radius < this.bounds.y);
    }

    /**
     * Inserts a node into this quad
     */
    insert(node) {
        if (!this.intersects(node)) {
            return false;
        }

        if (this.children === null) {
            if (this.nodes.length < this.maxNodes) {
                this.nodes.push(node);
                return true;
            }
            this.split();
        }

        return this.insertToChildren(node);
    }

    /**
     * Queries nodes within a radius of a point
     */
    queryRadius(x, y, radius) {
        const result = [];
        
        // If this quad is too far from the search circle, return empty
        const dx = x - Math.max(this.bounds.x, Math.min(x, this.bounds.x + this.bounds.width));
        const dy = y - Math.max(this.bounds.y, Math.min(y, this.bounds.y + this.bounds.height));
        if (dx * dx + dy * dy > radius * radius) {
            return result;
        }

        // Check nodes at this level
        this.nodes.forEach(node => {
            const distance = Math.sqrt(
                Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2)
            );
            if (distance <= radius + node.radius) {
                result.push(node);
            }
        });

        // Check children if they exist
        if (this.children !== null) {
            this.children.forEach(child => {
                result.push(...child.queryRadius(x, y, radius));
            });
        }

        return result;
    }
}

export class QuadTree {
    constructor(width, height) {
        this.root = new QuadTreeNode({
            x: 0,
            y: 0,
            width,
            height
        });
    }

    insert(node) {
        return this.root.insert(node);
    }

    queryRadius(x, y, radius) {
        return this.root.queryRadius(x, y, radius);
    }

    /**
     * Finds all nodes that collide with the given node
     */
    findCollisions(node) {
        return this.queryRadius(node.x, node.y, node.radius * 2)
            .filter(other => other !== node);
    }
}
