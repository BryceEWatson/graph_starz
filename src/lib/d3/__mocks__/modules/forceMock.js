// D3 Force Mock
import * as jest from 'jest-mock';

// Simulation mock
export const forceSimulation = jest.fn().mockImplementation(() => ({
    force: jest.fn().mockReturnThis(),
    nodes: jest.fn().mockReturnThis(),
    alpha: jest.fn().mockReturnThis(),
    restart: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis()
}));

// Force center mock
const center = () => ({
    initialize: () => {},
    force: () => {}
});

export const forceCenter = jest.fn().mockImplementation(center);

// Force many body mock
const manyBody = () => ({
    initialize: () => {},
    force: () => {}
});

export const forceManyBody = jest.fn().mockImplementation(manyBody);

// Force link mock
export const forceLink = jest.fn().mockImplementation(() => ({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis(),
    strength: jest.fn().mockReturnThis()
}));

// Force collide mock
const collide = () => ({
    initialize: () => {},
    force: () => {}
});

export const forceCollide = jest.fn().mockImplementation(collide);

// Force mock
const force = () => ({
    initialize: () => {},
    force: () => {}
});

export { force };
