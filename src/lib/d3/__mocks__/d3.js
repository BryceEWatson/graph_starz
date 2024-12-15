// Main D3 Mock
import { mockSelect, mockSelectAll } from './modules/selectionMock';
import { mockForce } from './modules/forceMock';
import { mockZoom } from './modules/zoomMock';
import { mockDrag } from './modules/dragMock';

// Mock D3 API
const d3 = {
    select: mockSelect,
    selectAll: mockSelectAll,
    
    // Add other D3 methods as needed
    scaleLinear: jest.fn().mockReturnValue({
        domain: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis()
    }),
    
    drag: mockDrag,
    
    zoom: mockZoom,
    
    zoomIdentity: {
        translate: jest.fn().mockReturnThis(),
        scale: jest.fn().mockReturnThis()
    },
    forceSimulation: mockForce
};

// Export everything
export default d3;
