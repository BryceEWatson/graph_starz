import * as d3 from 'd3';
import { GraphInitializer } from '../../core/GraphInitializer';
import forceConfig from '../../forceConfig';

// Mock D3 selection
const createMockSelection = () => {
    const selection = {
        append: jest.fn(),
        attr: jest.fn(),
        node: jest.fn(),
        select: jest.fn()
    };

    // Make methods chainable
    Object.keys(selection).forEach(key => {
        selection[key].mockReturnValue(selection);
    });

    return selection;
};

describe('GraphInitializer', () => {
    let validConfig;
    let mockSvg;

    beforeEach(() => {
        validConfig = {
            width: 800,
            height: 600,
            theme: 'light'
        };

        mockSvg = createMockSelection();
        mockSvg.node.mockReturnValue({ tagName: 'svg' });

        // Mock container elements
        const mockContainer = createMockSelection();
        const mockDefs = createMockSelection();
        const mockLinks = createMockSelection();
        const mockNodes = createMockSelection();

        mockSvg.append.mockReturnValue(mockContainer);
        mockContainer.append.mockImplementation((type) => {
            switch (type) {
                case 'defs': return mockDefs;
                case 'g': return type === 'links' ? mockLinks : mockNodes;
                default: return createMockSelection();
            }
        });
    });

    describe('Configuration Validation', () => {
        test('throws on missing configuration', () => {
            expect(() => new GraphInitializer()).toThrow('Configuration is required');
        });

        test('throws on invalid width', () => {
            expect(() => new GraphInitializer({ ...validConfig, width: -1 }))
                .toThrow('Invalid width: must be a positive number');
            expect(() => new GraphInitializer({ ...validConfig, width: '800' }))
                .toThrow('Invalid width: must be a positive number');
        });

        test('throws on invalid height', () => {
            expect(() => new GraphInitializer({ ...validConfig, height: -1 }))
                .toThrow('Invalid height: must be a positive number');
            expect(() => new GraphInitializer({ ...validConfig, height: '600' }))
                .toThrow('Invalid height: must be a positive number');
        });

        test('uses default theme if not provided', () => {
            const { theme } = validConfig;
            delete validConfig.theme;
            const initializer = new GraphInitializer(validConfig);
            expect(initializer.config.theme).toBe('light');
        });
    });

    describe('SVG Element Validation', () => {
        test('throws on null element', () => {
            const initializer = new GraphInitializer(validConfig);
            expect(() => initializer.initialize(null))
                .toThrow('Invalid SVG element: element must be a valid D3 selection');
        });

        test('throws on non-SVG element', () => {
            const initializer = new GraphInitializer(validConfig);
            mockSvg.node.mockReturnValue({ tagName: 'div' });
            expect(() => initializer.initialize(mockSvg))
                .toThrow('Invalid SVG element: element must be an SVG node');
        });

        test('throws on invalid D3 selection', () => {
            const initializer = new GraphInitializer(validConfig);
            const invalidSelection = { node: 'not a function' };
            expect(() => initializer.initialize(invalidSelection))
                .toThrow('Invalid SVG element: element must be a valid D3 selection');
        });
    });

    describe('Container Creation', () => {
        test('creates correct container structure', () => {
            const initializer = new GraphInitializer(validConfig);
            const result = initializer.initialize(mockSvg);

            // Verify SVG setup
            expect(mockSvg.attr).toHaveBeenCalledWith('width', validConfig.width);
            expect(mockSvg.attr).toHaveBeenCalledWith('height', validConfig.height);
            expect(mockSvg.attr).toHaveBeenCalledWith('viewBox', [0, 0, validConfig.width, validConfig.height]);

            // Verify container creation
            expect(result.container).toBeDefined();
            expect(result.defs).toBeDefined();
            expect(result.nodes).toBeDefined();
            expect(result.links).toBeDefined();
        });

        test('applies theme to container', () => {
            const initializer = new GraphInitializer(validConfig);
            initializer.initialize(mockSvg);

            // Find the container creation call
            const containerCalls = mockSvg.append.mock.results[0].value.attr.mock.calls;
            expect(containerCalls).toContainEqual(['data-theme', validConfig.theme]);
        });
    });

    describe('Simulation Creation', () => {
        test('creates simulation with correct configuration', () => {
            const initializer = new GraphInitializer(validConfig);
            const result = initializer.initialize(mockSvg);
            const simulation = result.simulation;

            expect(simulation).toBeDefined();
            expect(simulation.alpha()).toBe(forceConfig.simulation.alpha);
            expect(simulation.alphaDecay()).toBe(forceConfig.simulation.alphaDecay);
            expect(simulation.alphaTarget()).toBe(forceConfig.simulation.alphaTarget);

            // Verify center force
            const centerForce = simulation.force('center');
            expect(centerForce).toBeDefined();
            expect(centerForce.x()).toBe(validConfig.width / 2);
            expect(centerForce.y()).toBe(validConfig.height / 2);
        });
    });

    describe('Error Handling', () => {
        test('wraps initialization errors with context', () => {
            const initializer = new GraphInitializer(validConfig);
            mockSvg.attr.mockImplementation(() => {
                throw new Error('Attribute error');
            });

            expect(() => initializer.initialize(mockSvg))
                .toThrow('Graph initialization failed: Attribute error');
        });

        test('handles undefined values gracefully', () => {
            const initializer = new GraphInitializer(validConfig);
            mockSvg.append.mockReturnValue(undefined);

            expect(() => initializer.initialize(mockSvg))
                .toThrow('Graph initialization failed');
        });
    });
});
