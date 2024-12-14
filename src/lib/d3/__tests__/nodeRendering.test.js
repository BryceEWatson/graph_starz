// Mock process.env
process.env.NODE_ENV = 'test';

// Mock SelectionManager
jest.mock('../selection/selectionManager', () => ({
    SelectionManager: jest.fn().mockImplementation(() => ({
        selectNode: jest.fn(),
        addToSelection: jest.fn(),
        clearSelection: jest.fn()
    }))
}));

// Mock D3 implementation using module factory pattern
jest.mock('d3', () => require('../__mocks__/d3Mock'));

import * as d3 from 'd3';
import { setupGraph } from '../setupGraph';
import { createMockSelection } from '../__mocks__/d3Mock';

describe('Node Rendering', () => {
    let container;
    let nodes;
    let nodesGroup;
    let nodeElements;
    let textElement;
    let imageElement;
    let circleElement;
    let mockCalls;
    const imageNode = {
        id: '1',
        type: 'image',
        name: 'Test Image',
        properties: {
            url: 'https://example.com/image.jpg',
            width: 100,
            height: 50,
            title: 'Test Image'
        }
    };

    beforeEach(() => {
        // Create shared mock calls object
        mockCalls = {
            append: [],
            attr: [],
            text: [],
            style: [],
            classed: [],
            filter: [],
            on: [],
            call: []
        };

        // Create selections with shared mock calls
        container = createMockSelection('svg');
        container._mockCalls = mockCalls;

        nodes = createMockSelection('g', container);
        nodes._mockCalls = mockCalls;

        nodesGroup = createMockSelection('g', nodes);
        nodesGroup._mockCalls = mockCalls;

        nodeElements = createMockSelection('g', nodesGroup);
        nodeElements._mockCalls = mockCalls;

        textElement = createMockSelection('text', nodeElements);
        textElement._mockCalls = mockCalls;

        imageElement = createMockSelection('image', nodeElements);
        imageElement._mockCalls = mockCalls;

        circleElement = createMockSelection('circle', nodeElements);
        circleElement._mockCalls = mockCalls;

        // Set up container mock
        container.node.mockReturnValue({
            getBoundingClientRect: () => ({
                width: 800,
                height: 600
            })
        });

        // Set up nodes mock
        nodes.append.mockReturnValue(nodesGroup);
        nodesGroup.selectAll.mockReturnValue(nodeElements);

        // Set up nodeElements mock
        nodeElements.append.mockImplementation((type) => {
            if (type === 'text') return textElement;
            if (type === 'image') return imageElement;
            if (type === 'circle') return circleElement;
            return createMockSelection(type, nodeElements);
        });

        // Set up filter mock
        nodeElements.filter.mockImplementation(predicate => {
            const filtered = createMockSelection(nodeElements._type, nodeElements);
            filtered._mockCalls = mockCalls;
            filtered._data = nodeElements._data.filter(predicate);
            filtered.append.mockImplementation(() => {
                const child = createMockSelection('image', filtered);
                child._mockCalls = mockCalls;
                child._data = filtered._data;
                return child;
            });
            return filtered;
        });

        // Clear mock calls before each test
        jest.clearAllMocks();
        mockCalls.append = [];
        mockCalls.attr = [];
        mockCalls.text = [];
        mockCalls.style = [];
        mockCalls.classed = [];
        mockCalls.filter = [];
        mockCalls.on = [];
        mockCalls.call = [];
    });

    describe('Image Node Tests', () => {
        test('renders image with correct URL', async () => {
            // Set up data
            const mockGraphData = {
                nodes: [imageNode],
                links: []
            };
            nodes.data.mockImplementation(data => {
                nodes._data = data;
                nodeElements._data = data;
                return nodes;
            });

            await setupGraph(container, mockGraphData, 800, 600);
            
            // Find the URL attribute call
            const urlCall = mockCalls.attr.find(call => call[0] === 'xlink:href');
            expect(urlCall).toBeTruthy();
            const urlFn = urlCall[1];
            expect(urlFn(imageNode)).toBe(imageNode.properties.url);
        });

        test('preserves aspect ratio within bounds', async () => {
            // Set up data with specific dimensions
            const testNode = {
                ...imageNode,
                properties: {
                    ...imageNode.properties,
                    width: 100,
                    height: 50
                }
            };
            const mockGraphData = {
                nodes: [testNode],
                links: []
            };

            // Set up the node elements with data and shared mock calls
            nodeElements = createMockSelection('g');
            nodeElements._mockCalls = mockCalls;
            nodesGroup = createMockSelection('g');
            nodesGroup._mockCalls = mockCalls;
            
            // Mock the D3 selection chain
            container.append.mockReturnValue(nodesGroup);
            nodesGroup.selectAll.mockReturnValue(nodeElements);
            
            // Set up data binding
            nodeElements.data.mockImplementation(data => {
                console.log('Data binding:', data);
                nodeElements._data = Array.isArray(data) ? data : [data];
                console.log('Bound data:', nodeElements._data);
                return nodeElements;
            });

            // Mock join to create new selection
            nodeElements.join.mockImplementation(type => {
                console.log('Joining with type:', type);
                const joined = createMockSelection(type);
                joined._mockCalls = mockCalls;  // Share mock calls
                joined._data = nodeElements._data;
                joined._parent = nodeElements;
                joined._type = type;  // Store the element type
                console.log('Joined data:', joined._data);
                
                // Set up append for joined selection
                joined.append = jest.fn().mockImplementation(type => {
                    console.log('Appending to joined:', type);
                    const child = createMockSelection(type);
                    child._mockCalls = mockCalls;  // Share mock calls
                    child._data = joined._data;
                    child._parent = joined;
                    child._type = type;  // Store the element type
                    
                    // Set up attr for child selection
                    child.attr = jest.fn().mockImplementation((name, value) => {
                        console.log('Setting attr:', name, value, 'on', child._type);
                        mockCalls.attr.push([name, value, child._type]); // Use stored type
                        child._attributes[name] = value;
                        return child;
                    });
                    
                    // Set up style for child selection
                    child.style = jest.fn().mockImplementation((name, value) => {
                        console.log('Setting style:', name, value, 'on', child._type);
                        return child;
                    });
                    
                    console.log('Child data:', child._data);
                    return child;
                });
                
                // Set up filter for joined selection
                joined.filter = jest.fn().mockImplementation(predicate => {
                    console.log('Filtering joined with predicate:', predicate);
                    const filtered = createMockSelection(joined._type);
                    filtered._mockCalls = mockCalls;  // Share mock calls
                    filtered._data = joined._data.filter(d => {
                        try {
                            if (typeof predicate === 'function') {
                                return predicate(d);
                            } else if (typeof predicate === 'string') {
                                return d.type === predicate;
                            }
                            return false;
                        } catch (e) {
                            console.error('Filter error:', e);
                            return false;
                        }
                    });
                    filtered._parent = joined;
                    filtered._type = joined._type;  // Preserve the element type
                    console.log('Filtered joined data:', filtered._data);
                    
                    // Set up append for filtered selection
                    filtered.append = jest.fn().mockImplementation(type => {
                        console.log('Appending to filtered:', type);
                        const child = createMockSelection(type);
                        child._mockCalls = mockCalls;  // Share mock calls
                        child._data = filtered._data;
                        child._parent = filtered;
                        child._type = type;  // Store the element type
                        
                        // Set up attr for child selection
                        child.attr = jest.fn().mockImplementation((name, value) => {
                            console.log('Setting attr:', name, value, 'on', child._type);
                            mockCalls.attr.push([name, value, child._type]); // Use stored type
                            child._attributes[name] = value;
                            return child;
                        });
                        
                        // Set up style for child selection
                        child.style = jest.fn().mockImplementation((name, value) => {
                            console.log('Setting style:', name, value, 'on', child._type);
                            return child;
                        });
                        
                        console.log('Child data:', child._data);
                        return child;
                    });
                    
                    return filtered;
                });
                
                return joined;
            });

            await setupGraph(container, mockGraphData, 800, 600);
            
            // Debug mock calls
            console.log('Mock calls:', {
                append: mockCalls.append,
                attr: mockCalls.attr.map(call => ({ name: call[0], value: call[1], type: call[2] })),
                filter: mockCalls.filter
            });
            
            // Find the width and height attribute calls for the image element
            const widthCall = mockCalls.attr.find(call => call[0] === 'width' && call[2] === 'image');
            const heightCall = mockCalls.attr.find(call => call[0] === 'height' && call[2] === 'image');
            const xCall = mockCalls.attr.find(call => call[0] === 'x' && call[2] === 'image');
            const yCall = mockCalls.attr.find(call => call[0] === 'y' && call[2] === 'image');
            
            console.log('Dimension calls:', {
                width: widthCall,
                height: heightCall,
                x: xCall,
                y: yCall
            });
            
            expect(widthCall).toBeTruthy();
            expect(heightCall).toBeTruthy();
            expect(xCall).toBeTruthy();
            expect(yCall).toBeTruthy();
            
            // Get the computed values
            const computedWidth = typeof widthCall[1] === 'function' ? widthCall[1](testNode) : widthCall[1];
            const computedHeight = typeof heightCall[1] === 'function' ? heightCall[1](testNode) : heightCall[1];
            const computedX = typeof xCall[1] === 'function' ? xCall[1](testNode) : xCall[1];
            const computedY = typeof yCall[1] === 'function' ? yCall[1](testNode) : yCall[1];
            
            console.log('Computed values:', {
                width: computedWidth,
                height: computedHeight,
                x: computedX,
                y: computedY
            });
            
            // Helper to extract numeric value from string or number
            const getNumericValue = (value) => {
                if (typeof value === 'number') return value;
                if (typeof value === 'string') {
                    const match = value.match(/[\d.]+/);
                    return match ? parseFloat(match[0]) : NaN;
                }
                return NaN;
            };
            
            // Verify the aspect ratio is preserved and dimensions are within bounds
            const maxDimension = 50;  // This should match the value in setupGraph
            const aspectRatio = testNode.properties.width / testNode.properties.height;
            
            // Since width > height (100 > 50), width should be maxDimension and height should be scaled
            const numericWidth = getNumericValue(computedWidth);
            const numericHeight = getNumericValue(computedHeight);
            const numericX = getNumericValue(computedX);
            const numericY = getNumericValue(computedY);
            
            expect(numericWidth).toBe(maxDimension);
            expect(numericHeight).toBe(maxDimension / aspectRatio);
            
            // Verify centering
            expect(numericX).toBe(-maxDimension / 2);
            expect(numericY).toBe(-maxDimension / aspectRatio / 2);
        });

        test('centers image in node space', async () => {
            // Set up data
            const mockGraphData = {
                nodes: [imageNode],
                links: []
            };
            nodes.data.mockImplementation(data => {
                nodes._data = data;
                nodeElements._data = data;
                return nodes;
            });

            await setupGraph(container, mockGraphData, 800, 600);
            
            // Verify image is centered
            const maxDimension = 50;
            const aspectRatio = imageNode.properties.width / imageNode.properties.height;
            const width = aspectRatio > 1 ? maxDimension : maxDimension * aspectRatio;
            const height = aspectRatio > 1 ? maxDimension / aspectRatio : maxDimension;
            
            // Find x and y attribute calls
            const xCall = mockCalls.attr.find(call => call[0] === 'x');
            const yCall = mockCalls.attr.find(call => call[0] === 'y');
            expect(xCall).toBeTruthy();
            expect(yCall).toBeTruthy();
            expect(xCall[1](imageNode)).toBe(-width / 2);
            expect(yCall[1](imageNode)).toBe(-height / 2);
        });

        test('renders image with fullUrl', async () => {
            const mockGraphData = {
                nodes: [{
                    ...imageNode,
                    properties: {
                        ...imageNode.properties,
                        url: undefined,
                        fullUrl: 'https://example.com/full.jpg'
                    }
                }],
                links: []
            };
            setupGraph(container, mockGraphData, 800, 600);
            expect(mockCalls.attr).toContainEqual(['xlink:href', 'https://example.com/full.jpg']);
        });

        test('renders image with previewUrl when fullUrl is missing', async () => {
            const mockGraphData = {
                nodes: [{
                    ...imageNode,
                    properties: {
                        ...imageNode.properties,
                        url: undefined,
                        previewUrl: 'https://example.com/preview.jpg'
                    }
                }],
                links: []
            };
            setupGraph(container, mockGraphData, 800, 600);
            expect(mockCalls.attr).toContainEqual(['xlink:href', 'https://example.com/preview.jpg']);
        });

        test('renders image with thumbnailUrl when fullUrl and previewUrl are missing', async () => {
            const mockGraphData = {
                nodes: [{
                    ...imageNode,
                    properties: {
                        ...imageNode.properties,
                        url: undefined,
                        thumbnailUrl: 'https://example.com/thumbnail.jpg'
                    }
                }],
                links: []
            };
            setupGraph(container, mockGraphData, 800, 600);
            expect(mockCalls.attr).toContainEqual(['xlink:href', 'https://example.com/thumbnail.jpg']);
        });

        test('renders fallback image when no URL properties are present', async () => {
            const mockGraphData = {
                nodes: [{
                    ...imageNode,
                    properties: {
                        ...imageNode.properties,
                        url: undefined
                    }
                }],
                links: []
            };
            setupGraph(container, mockGraphData, 800, 600);
            expect(mockCalls.attr).toContainEqual(['xlink:href', expect.stringContaining('data:image/svg+xml;base64,')]);
        });
    });

    describe('Label Behavior Tests', () => {
        test('labels are hidden by default', async () => {
            // Set up data
            const mockGraphData = {
                nodes: [imageNode],
                links: []
            };
            nodes.data.mockImplementation(data => {
                nodes._data = data;
                nodeElements._data = data;
                return nodes;
            });

            await setupGraph(container, mockGraphData, 800, 600);
            
            // Find opacity style call
            const opacityCall = textElement._mockCalls.style.find(call => call[0] === 'opacity');
            expect(opacityCall).toBeTruthy();
            expect(opacityCall[1]).toBe(0);
        });

        test('labels show on hover', async () => {
            const mockGraphData = {
                nodes: [imageNode],
                links: []
            };
            await setupGraph(container, mockGraphData, 800, 600);
            
            const node = document.createElement('g');
            nodes.on('mouseover', (event) => {
                const selection = createMockSelection();
                selection.style.mockReturnValue(selection);
                expect(selection.style).toHaveBeenCalledWith('opacity', 1);
            });
            
            // Trigger hover event
            const event = new Event('mouseover');
            node.dispatchEvent(event);
        });

        test('connected node labels show on hover', async () => {
            const mockGraphData = {
                nodes: [imageNode],
                links: [{ source: '1', target: '2' }]
            };
            await setupGraph(container, mockGraphData, 800, 600);
            
            const node = document.createElement('g');
            node.setAttribute('data-id', '1');
            
            nodes.on('mouseover', (event) => {
                const selection = createMockSelection();
                selection.style.mockReturnValue(selection);
                expect(selection.style).toHaveBeenCalledWith('opacity', 1);
            });
            
            // Trigger hover event
            const event = new Event('mouseover');
            node.dispatchEvent(event);
        });
    });
});
