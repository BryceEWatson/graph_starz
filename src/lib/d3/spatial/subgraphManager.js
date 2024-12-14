/**
 * Manages detection and organization of subgraphs within the main graph
 */

export class SubgraphManager {
    constructor() {
        this.minComponentDistance = 200; // Minimum distance between components
    }

    /**
     * Find connected components in the graph using DFS
     */
    findComponents(graphData) {
        const visited = new Set();
        const components = [];
        
        // Create adjacency list
        const adjacencyList = new Map();
        graphData.nodes.forEach(node => {
            adjacencyList.set(node.id, []);
        });
        
        graphData.links.forEach(link => {
            adjacencyList.get(link.source.id).push(link.target.id);
            adjacencyList.get(link.target.id).push(link.source.id);
        });

        // DFS function to explore a component
        const exploreComponent = (nodeId, component) => {
            visited.add(nodeId);
            component.push(nodeId);
            
            adjacencyList.get(nodeId).forEach(neighborId => {
                if (!visited.has(neighborId)) {
                    exploreComponent(neighborId, component);
                }
            });
        };

        // Find all components
        graphData.nodes.forEach(node => {
            if (!visited.has(node.id)) {
                const component = [];
                exploreComponent(node.id, component);
                components.push(component);
            }
        });

        // Convert component node IDs to actual node objects
        return components.map(component => 
            component.map(nodeId => 
                graphData.nodes.find(node => node.id === nodeId)
            )
        );
    }

    /**
     * Calculate the center of each component
     */
    calculateComponentCenters(components) {
        return components.map(component => {
            const sum = component.reduce((acc, node) => ({
                x: acc.x + node.x,
                y: acc.y + node.y
            }), { x: 0, y: 0 });
            
            return {
                x: sum.x / component.length,
                y: sum.y / component.length
            };
        });
    }

    /**
     * Calculate separation forces between components
     */
    calculateSeparationForces(components) {
        const centers = this.calculateComponentCenters(components);
        const forces = Array(components.length).fill().map(() => ({ x: 0, y: 0 }));

        // Calculate forces between each pair of components
        for (let i = 0; i < centers.length; i++) {
            for (let j = i + 1; j < centers.length; j++) {
                const dx = centers[j].x - centers[i].x;
                const dy = centers[j].y - centers[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.minComponentDistance && distance > 0) {
                    const force = (this.minComponentDistance - distance) / distance;
                    const fx = dx * force;
                    const fy = dy * force;

                    // Apply opposite forces to each component
                    forces[i].x -= fx;
                    forces[i].y -= fy;
                    forces[j].x += fx;
                    forces[j].y += fy;
                }
            }
        }

        return forces;
    }

    /**
     * Apply component separation forces to nodes
     */
    applyComponentForces(components, forces) {
        components.forEach((component, i) => {
            const force = forces[i];
            component.forEach(node => {
                node.x += force.x * 0.1; // Scale force for smoother movement
                node.y += force.y * 0.1;
            });
        });
    }

    /**
     * Update component positions to maintain separation
     */
    updateComponentPositions(graphData) {
        const components = this.findComponents(graphData);
        const forces = this.calculateSeparationForces(components);
        this.applyComponentForces(components, forces);
    }
}
