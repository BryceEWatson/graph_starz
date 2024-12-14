const createMockSelection = (type = '', parent = null) => {
    // Create the mock object first
    const mock = {};

    // Add call tracking - shared between parent and children
    mock._mockCalls = parent?._mockCalls || {
        append: [],
        attr: [],
        style: [],
        classed: [],
        filter: [],
        on: [],
        call: [],
        text: []
    };

    // Add data storage
    mock._data = [];
    mock._attributes = {};
    mock._styles = {};
    mock._classes = {};
    mock._text = '';
    mock._type = type;
    mock._parent = parent;

    // Core selection methods
    mock.select = jest.fn().mockReturnThis();
    mock.selectAll = jest.fn().mockImplementation(function(selector) {
        const selection = createMockSelection(selector, this);
        selection._data = this._data;
        selection._parent = this;
        return selection;
    });

    mock.data = jest.fn().mockImplementation(function(data) {
        if (data) {
            this._data = Array.isArray(data) ? data : [data];
        }
        return this;
    });

    mock.join = jest.fn().mockImplementation(function(type) {
        // Create a new selection with the joined elements
        const joined = createMockSelection(type, this);
        joined._data = this._data;
        joined._parent = this;
        joined._attributes = {};  // New selections get fresh attributes
        joined._styles = {};
        joined._classes = {};
        return joined;
    });

    mock.enter = jest.fn().mockReturnThis();
    mock.exit = jest.fn().mockReturnThis();
    mock.merge = jest.fn().mockReturnThis();

    // Add chainable methods with call tracking
    mock.append = jest.fn().mockImplementation(function(type) {
        this._mockCalls.append.push([type]);
        const child = createMockSelection(type, this);
        child._mockCalls = this._mockCalls;  // Share mock calls
        child._data = this._data;
        child._parent = this;
        child._type = type;  // Explicitly set the element type
        
        // Set up attr for child selection
        child.attr = jest.fn().mockImplementation(function(name, value) {
            // Store the attr call with element type
            this._mockCalls.attr.push([name, value, this._type]);
            
            // Store the actual value or function
            if (typeof value === 'function') {
                this._attributes[name] = value;
            } else {
                // Store both the raw value and a function that returns it
                this._attributes[name] = value;
                this._attributes[`${name}_fn`] = () => value;
            }
            
            return this;
        });
        
        return child;
    });

    mock.attr = jest.fn().mockImplementation(function(name, value) {
        // Store the attr call for verification with element type
        this._mockCalls.attr.push([name, value, this._type]);
        
        // Store the actual value or function
        if (typeof value === 'function') {
            this._attributes[name] = value;
        } else {
            // Store both the raw value and a function that returns it
            this._attributes[name] = value;
            this._attributes[`${name}_fn`] = () => value;
        }
        
        return this;
    });

    // Helper to get attribute value
    mock.getAttrValue = function(name, data, index = 0) {
        const attrValue = this._attributes[name];
        if (typeof attrValue === 'function') {
            try {
                return attrValue(data, index);
            } catch (e) {
                console.error('Error evaluating attribute:', e);
                return undefined;
            }
        }
        return attrValue;
    };

    mock.style = jest.fn().mockImplementation(function(name, value) {
        this._mockCalls.style.push([name, value]);
        if (typeof value === 'function') {
            const computedValues = this._data.map(d => value(d));
            this._styles[name] = computedValues.length === 1 ? computedValues[0] : computedValues;
        } else {
            this._styles[name] = value;
        }
        return this;
    });

    mock.classed = jest.fn().mockImplementation(function(name, value) {
        this._mockCalls.classed.push([name, value]);
        if (typeof value === 'function') {
            const computedValues = this._data.map(d => value(d));
            this._classes[name] = computedValues.length === 1 ? computedValues[0] : computedValues;
        } else {
            this._classes[name] = value;
        }
        return this;
    });

    mock.filter = jest.fn().mockImplementation(function(predicate) {
        this._mockCalls.filter.push([predicate]);
        const filtered = createMockSelection(this._type, this);
        filtered._mockCalls = this._mockCalls;  // Share mock calls
        
        // Apply filter to data
        filtered._data = this._data.filter(d => {
            try {
                if (typeof predicate === 'function') {
                    return predicate(d);
                } else if (typeof predicate === 'string') {
                    // For string predicates, check if the type matches
                    return d.type === predicate;
                }
                return false;
            } catch (e) {
                console.error('Filter error:', e);
                return false;
            }
        });
        
        // Share parent's attributes but create new storage
        filtered._parent = this;
        filtered._attributes = { ...this._attributes };
        filtered._styles = { ...this._styles };
        filtered._classes = { ...this._classes };
        
        // Set up append method for the filtered selection
        filtered.append = jest.fn().mockImplementation(function(type) {
            this._mockCalls.append.push([type]);
            const child = createMockSelection(type, this);
            child._mockCalls = this._mockCalls;  // Share mock calls
            child._data = this._data;
            child._parent = this;
            child._type = type;  // Explicitly set the element type
            
            // Set up attr for child selection
            child.attr = jest.fn().mockImplementation(function(name, value) {
                // Store the attr call with element type
                this._mockCalls.attr.push([name, value, this._type]);
                
                // Store the actual value or function
                if (typeof value === 'function') {
                    this._attributes[name] = value;
                } else {
                    // Store both the raw value and a function that returns it
                    this._attributes[name] = value;
                    this._attributes[`${name}_fn`] = () => value;
                }
                
                return this;
            });
            
            return child;
        });
        
        return filtered;
    });

    mock.on = jest.fn().mockImplementation(function(eventName, handler) {
        this._mockCalls.on.push([eventName, handler]);
        return this;
    });

    // Add node method that returns the first element
    mock.node = jest.fn().mockImplementation(function() {
        return {
            getBoundingClientRect: () => ({
                width: 100,
                height: 100
            }),
            ...this._attributes,
            ...this._styles,
            classList: {
                contains: (className) => this._classes[className] || false
            },
            textContent: this._text
        };
    });

    // Add nodes method that returns all elements
    mock.nodes = jest.fn().mockImplementation(function() {
        return this._data.map(d => ({
            getBoundingClientRect: () => ({
                width: 100,
                height: 100
            }),
            ...this._attributes,
            ...this._styles,
            classList: {
                contains: (className) => this._classes[className] || false
            },
            textContent: this._text
        }));
    });

    // Add text method
    mock.text = jest.fn().mockImplementation(function(value) {
        this._mockCalls.text.push([value]);
        if (typeof value === 'function') {
            const computedValues = this._data.map(d => value(d));
            this._text = computedValues.length === 1 ? computedValues[0] : computedValues;
        } else {
            this._text = value;
        }
        return this;
    });

    // Add transition methods
    mock.transition = jest.fn().mockReturnThis();
    mock.duration = jest.fn().mockReturnThis();

    // Add call method for applying functions
    mock.call = jest.fn().mockImplementation(function(fn, ...args) {
        this._mockCalls.call.push([fn, ...args]);
        if (typeof fn === 'function') {
            fn(this, ...args);
        }
        return this;
    });

    // Evaluate stored attribute functions
    mock._evaluateAttr = function(name, datum, index) {
        const fn = this[`_${name}`];
        if (typeof fn === 'function') {
            return fn(datum, index);
        }
        return undefined;
    }

    return mock;
};

// Create the D3 mock object
const mockD3 = {
    select: jest.fn().mockImplementation(() => createMockSelection()),
    selectAll: jest.fn().mockImplementation(() => createMockSelection()),
    zoom: jest.fn().mockImplementation(() => ({
        on: jest.fn().mockReturnThis(),
        scaleExtent: jest.fn().mockReturnThis(),
        translateExtent: jest.fn().mockReturnThis()
    })),
    drag: jest.fn().mockImplementation(() => ({
        on: jest.fn().mockReturnThis()
    })),
    forceSimulation: jest.fn().mockImplementation(() => ({
        nodes: jest.fn().mockReturnThis(),
        force: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        alpha: jest.fn().mockReturnThis(),
        restart: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        tick: jest.fn().mockReturnThis()
    })),
    forceManyBody: jest.fn().mockImplementation(() => ({
        strength: jest.fn().mockReturnThis()
    })),
    forceCenter: jest.fn().mockImplementation(() => ({
        x: jest.fn().mockReturnThis(),
        y: jest.fn().mockReturnThis()
    })),
    forceLink: jest.fn().mockImplementation(() => ({
        id: jest.fn().mockReturnThis(),
        distance: jest.fn().mockReturnThis(),
        strength: jest.fn().mockReturnThis(),
        links: jest.fn().mockReturnThis()
    }))
};

// Export both named and default exports
module.exports = mockD3;
module.exports.createMockSelection = createMockSelection;
