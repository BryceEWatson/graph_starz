// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock performance.now()
global.performance = {
    now: jest.fn(() => Date.now())
};

// Mock D3
jest.mock('d3', () => {
    const mockData = {
        nodes: [],
        links: []
    };

    const createMockSelection = (parentElement = null, elements = []) => {
        const selection = {
            append: jest.fn((type) => {
                const el = document.createElement(type === 'line' ? 'line' : type);
                // Only inherit data from parent, not classes or other attributes
                if (selection._currentElement && selection._currentElement.__data__) {
                    el.__data__ = selection._currentElement.__data__;
                }
                if (parentElement) {
                    parentElement.appendChild(el);
                }
                const newSelection = createMockSelection(el);
                newSelection._parentSelection = selection;
                return newSelection;
            }),
            attr: jest.fn((name, value) => {
                if (elements.length > 0) {
                    elements.forEach(el => {
                        const val = typeof value === 'function' && el.__data__ ? 
                            value(el.__data__) : value;
                        el.setAttribute(name, val);
                    });
                } else if (selection._currentElement) {
                    const val = typeof value === 'function' && selection._currentElement.__data__ ? 
                        value(selection._currentElement.__data__) : value;
                    selection._currentElement.setAttribute(name, val);
                }
                return selection;
            }),
            style: jest.fn(() => selection),
            call: jest.fn((fn) => {
                if (typeof fn === 'function') {
                    fn(selection);
                } else if (fn && typeof fn.on === 'function') {
                    elements.forEach(() => {
                        fn.on('start', () => {})
                          .on('drag', () => {})
                          .on('end', () => {});
                    });
                }
                return selection;
            }),
            on: jest.fn(() => selection),
            select: jest.fn(() => selection),
            selectAll: jest.fn(() => {
                // Return empty selection that will be populated by join
                return createMockSelection(selection._currentElement, []);
            }),
            text: jest.fn((value) => {
                if (elements.length > 0) {
                    elements.forEach(el => {
                        const text = typeof value === 'function' && el.__data__ ? 
                            value(el.__data__) : value;
                        el.textContent = text;
                    });
                } else if (selection._currentElement) {
                    const text = typeof value === 'function' && selection._currentElement.__data__ ? 
                        value(selection._currentElement.__data__) : value;
                    selection._currentElement.textContent = text;
                }
                return selection;
            }),
            data: jest.fn((d) => {
                return {
                    join: jest.fn((elementType) => {
                        const createdElements = [];
                        if (d && Array.isArray(d) && selection._currentElement) {
                            // First, remove existing elements that match both tag and class
                            const className = elementType === 'line' ? 'graph-link' : 'graph-node';
                            const selector = `${elementType}.${className}`;
                            const existingElements = selection._currentElement.querySelectorAll(selector);
                            existingElements.forEach(el => el.parentNode.removeChild(el));

                            // Create new elements with data bound to them
                            d.forEach(item => {
                                const el = document.createElement(elementType);
                                el.setAttribute('class', className);
                                el.__data__ = item;
                                selection._currentElement.appendChild(el);
                                createdElements.push(el);
                            });
                        }
                        // Return a new selection containing all created elements
                        return createMockSelection(selection._currentElement, createdElements);
                    })
                };
            }),
            datum: jest.fn(() => {
                if (selection._currentElement && selection._currentElement.__data__) {
                    return selection._currentElement.__data__;
                }
                return null;
            }),
            _currentElement: parentElement,
            _elements: elements,
            _parentSelection: null
        };
        return selection;
    };

    // Main D3 mock object
    const d3Mock = {
        select: jest.fn((element) => {
            const mockSelection = createMockSelection(element);
            return mockSelection;
        }),
        selectAll: jest.fn(() => createMockSelection()),
        forceSimulation: jest.fn(nodes => {
            mockData.nodes = nodes;
            const forces = {};
            const simulation = {
                force: jest.fn((name, f) => {
                    if (f) {
                        forces[name] = f;
                        return simulation;
                    }
                    return forces[name];
                }),
                nodes: jest.fn(() => mockData.nodes),
                on: jest.fn(() => simulation),
                alpha: jest.fn(() => simulation),
                alphaTarget: jest.fn(() => simulation),
                restart: jest.fn(() => simulation)
            };
            return simulation;
        }),
        forceManyBody: jest.fn(() => ({
            strength: jest.fn(() => ({
                force: jest.fn()
            }))
        })),
        forceCenter: jest.fn(() => ({
            force: jest.fn()
        })),
        forceLink: jest.fn(links => {
            mockData.links = links;
            return {
                id: jest.fn(() => ({
                    force: jest.fn()
                }))
            };
        }),
        drag: jest.fn(() => ({
            on: jest.fn(() => createMockDrag())
        })),
        zoom: jest.fn(() => ({
            on: jest.fn(),
            scaleExtent: jest.fn().mockReturnThis(),
            translateExtent: jest.fn().mockReturnThis()
        }))
    };

    const createMockDrag = () => ({
        on: jest.fn(() => createMockDrag())
    });

    return d3Mock;
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
})
