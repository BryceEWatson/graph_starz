// D3 Selection Mock
import * as jest from 'jest-mock';

export const createMockSelection = (initialData = null) => {
    let currentDatum = initialData;
    let isEmpty = false;
    let nodeElement = null;
    let attributes = new Map();
    let styles = new Map();

    // Create a base mock function with chaining
    const createChainableMock = () => {
        const mock = jest.fn().mockReturnThis();
        mock.mockImplementation = jest.fn().mockReturnValue(mock);
        mock.mockReturnValue = jest.fn().mockReturnValue(mock);
        mock.mockReturnValueOnce = jest.fn().mockReturnValue(mock);
        return mock;
    };

    // Create a mock function that can be chained and return different values
    const createSequentialMock = () => {
        const mock = jest.fn();
        mock.mockReturnThis = jest.fn().mockReturnValue(mock);
        mock.mockImplementation = jest.fn().mockReturnValue(mock);
        mock.mockReturnValue = jest.fn().mockReturnValue(mock);
        mock.mockReturnValueOnce = jest.fn().mockReturnValue(mock);
        return mock;
    };

    const selection = {
        select: createChainableMock(),
        selectAll: createChainableMock(),
        data: createSequentialMock(),
        join: createSequentialMock(),
        append: createSequentialMock(),
        attr: jest.fn((name, value) => {
            if (value === undefined) {
                return attributes.get(name) || '';
            }
            attributes.set(name, value);
            return selection;
        }),
        style: jest.fn((name, value) => {
            if (value === undefined) {
                return styles.get(name) || '';
            }
            styles.set(name, value);
            return selection;
        }),
        text: jest.fn((value) => {
            if (value === undefined) {
                return attributes.get('text') || '';
            }
            attributes.set('text', value);
            return selection;
        }),
        call: createChainableMock(),
        on: createChainableMock(),
        transition: createChainableMock(),
        duration: createChainableMock(),
        remove: createChainableMock(),
        classed: jest.fn((name, value) => {
            if (value === undefined) {
                return attributes.get(`class-${name}`) || false;
            }
            attributes.set(`class-${name}`, value);
            return selection;
        }),
        filter: createChainableMock(),
        each: createChainableMock(),
        empty: jest.fn(() => isEmpty),
        node: jest.fn(() => nodeElement),
        datum: jest.fn(d => {
            if (d === undefined) return currentDatum;
            currentDatum = d;
            return selection;
        })
    };

    // Add test helper methods
    selection.setDatum = function(d) {
        currentDatum = d;
        return this;
    };

    selection.setEmpty = function(empty) {
        isEmpty = empty;
        return this;
    };

    selection.setNode = function(node) {
        nodeElement = node;
        return this;
    };

    // Ensure all mock functions have the basic Jest mock properties
    Object.values(selection).forEach(value => {
        if (typeof value === 'function' && !value.mockImplementation) {
            value.mockImplementation = jest.fn().mockReturnValue(value);
            value.mockReturnValue = jest.fn().mockReturnValue(value);
            value.mockReturnValueOnce = jest.fn().mockReturnValue(value);
            value.mockReturnThis = jest.fn().mockReturnValue(value);
            value.mockClear = jest.fn();
            value.mockReset = jest.fn();
        }
    });

    return selection;
};

export const selection = () => {
    return createMockSelection();
};

export const mockSelect = jest.fn().mockImplementation(() => {
    return createMockSelection();
});

export const mockSelectAll = jest.fn().mockImplementation(() => {
    return createMockSelection().setEmpty(true);
});
