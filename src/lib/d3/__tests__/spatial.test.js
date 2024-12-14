import { QuadTree } from '../spatial/quadtree';
import { GridSystem } from '../spatial/gridSystem';
import { SubgraphManager } from '../spatial/subgraphManager';
import { mockGraphData } from './mockData';

describe('Spatial Organization', () => {
    const width = 1000;
    const height = 800;
    
    describe('QuadTree', () => {
        let quadtree;
        
        beforeEach(() => {
            quadtree = new QuadTree(width, height);
        });
        
        test('inserts and retrieves nodes correctly', () => {
            const node = { id: '1', x: 100, y: 200, radius: 20 };
            quadtree.insert(node);
            
            const nearby = quadtree.queryRadius(100, 200, 30);
            expect(nearby).toContainEqual(node);
        });
        
        test('handles node collisions', () => {
            const node1 = { id: '1', x: 100, y: 100, radius: 20 };
            const node2 = { id: '2', x: 110, y: 110, radius: 20 };
            
            quadtree.insert(node1);
            quadtree.insert(node2);
            
            const collisions = quadtree.findCollisions(node1);
            expect(collisions).toContainEqual(node2);
        });
    });
    
    describe('GridSystem', () => {
        let grid;
        
        beforeEach(() => {
            grid = new GridSystem(width, height, 100); // 100px grid cells
        });
        
        test('assigns nodes to grid cells', () => {
            const node = { id: '1', x: 150, y: 250 };
            const cellCoords = grid.getCellCoordinates(node);
            
            expect(cellCoords).toEqual({ x: 1, y: 2 }); // Cell (1,2)
        });
        
        test('applies grid-based forces', () => {
            const node = { id: '1', x: 150, y: 250 };
            const force = grid.calculateGridForce(node);
            
            expect(force).toHaveProperty('x');
            expect(force).toHaveProperty('y');
        });
        
        test('maintains minimum distance between nodes', () => {
            const node1 = { id: '1', x: 100, y: 100 };
            const node2 = { id: '2', x: 110, y: 110 };
            
            grid.addNode(node1);
            grid.addNode(node2);
            
            const adjustedPositions = grid.adjustNodePositions();
            const dx = adjustedPositions[1].x - adjustedPositions[0].x;
            const dy = adjustedPositions[1].y - adjustedPositions[0].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            expect(distance).toBeGreaterThanOrEqual(grid.minNodeDistance);
        });
    });
    
    describe('SubgraphManager', () => {
        let subgraphManager;
        
        beforeEach(() => {
            subgraphManager = new SubgraphManager();
        });
        
        test('detects connected components', () => {
            const components = subgraphManager.findComponents(mockGraphData);
            expect(Array.isArray(components)).toBe(true);
            expect(components.length).toBeGreaterThan(0);
        });
        
        test('calculates component centers', () => {
            const components = subgraphManager.findComponents(mockGraphData);
            const centers = subgraphManager.calculateComponentCenters(components);
            
            expect(centers.length).toBe(components.length);
            centers.forEach(center => {
                expect(center).toHaveProperty('x');
                expect(center).toHaveProperty('y');
            });
        });
        
        test('applies separation forces between components', () => {
            const components = subgraphManager.findComponents(mockGraphData);
            const forces = subgraphManager.calculateSeparationForces(components);
            
            expect(forces.length).toBe(components.length);
            forces.forEach(force => {
                expect(force).toHaveProperty('x');
                expect(force).toHaveProperty('y');
            });
        });
    });
});
