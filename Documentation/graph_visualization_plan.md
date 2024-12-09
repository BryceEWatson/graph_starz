# Graph Visualization Implementation Plan

This document outlines the technical implementation plan for the graph visualization system described in `graph_visualization.md`.

## Directory Structure

```
src/lib/d3/
├── spatial/
│   ├── quadtree.js       # Spatial indexing implementation
│   ├── gridSystem.js     # Virtual grid and anchor point management
│   ├── subgraphManager.js # Subgraph detection and management
│   └── renderOptimizer.js # Performance optimization and worker management
├── hooks/
│   ├── useD3Graph.js     # Main graph hook with React Query integration
│   └── useGraphData.js   # Progressive data loading hook
├── types/
│   └── graphState.ts     # TypeScript definitions for graph state
├── components/
│   ├── GraphVisualization.tsx # Main graph component with error boundaries
│   └── GraphErrorFallback.tsx # Error handling components
├── workers/
│   └── forceCalculation.worker.js # Web worker for force calculations
├── setupGraph.js         # Enhanced force simulation and worker-based force calculation
├── interactions.js       # Smooth transitions and viewport management
├── selectionManager.js   # Efficient D3 selection management
├── viewportManager.js    # Enhanced zoom behavior and viewport management
└── styles.js            # (existing) - needs updates
```

## Testing Infrastructure

### Visual Regression Testing
```
src/tests/visual/
├── __image_snapshots__/  # Snapshot directory for visual tests
├── setupVisualTests.js   # Test environment configuration
├── mockData/
│   ├── graphFixtures.js  # Sample graph data fixtures
│   └── testUser.js       # Mock authenticated user data
└── specs/
    ├── graphLoad.spec.js # Graph loading visual tests
    ├── layout.spec.js    # Layout and positioning tests
    └── interaction.spec.js# User interaction tests
```

### Test Implementation Strategy

1. **Test User Authentication**
   ```javascript
   // mockData/testUser.js
   export const TEST_USER = {
     id: 'test-user-id',
     name: 'Test User',
     email: 'test@example.com'
   };
   ```

2. **Visual Test Setup**
   ```javascript
   // setupVisualTests.js
   import { setupTestEnvironment } from '@testing-library/react';
   import { mockNextAuth } from 'next-auth/jest';
   
   beforeAll(() => {
     // Mock Next-Auth session
     mockNextAuth({
       session: { user: TEST_USER }
     });
   });
   ```

3. **Screenshot Testing**
   ```javascript
   // specs/graphLoad.spec.js
   describe('Graph Loading States', () => {
     it('should render initial empty state', async () => {
       const { container } = render(<GraphVisualization />);
       await waitForElementToBeStable(container);
       expect(container).toMatchImageSnapshot();
     });

     it('should render with sample data', async () => {
       const { container } = render(
         <GraphVisualization initialData={sampleGraphData} />
       );
       await waitForElementToBeStable(container);
       expect(container).toMatchImageSnapshot();
     });
   });
   ```

### Test-Driven Development Flow

1. **Write Test First**
   - Create visual snapshot test for new feature
   - Define expected visual state
   - Run test (it will fail)

2. **Implement Feature**
   - Develop feature until test passes
   - Ensure visual regression tests pass
   - Add any new test cases discovered

3. **Refactor Safely**
   - Make improvements with test safety net
   - Update snapshots only when visual changes are intended
   - Document snapshot updates in commit messages

## Implementation Phases

### Phase 1: Testing Foundation (Days 1-3)
1. **Set Up Testing Infrastructure**
   - [ ] Install and configure Jest for visual testing
   - [ ] Set up mock authentication for tests
   - [ ] Create initial test fixtures and helpers
   - [ ] Add CI pipeline for visual testing

2. **Create Baseline Tests**
   - [ ] Empty graph state test
   - [ ] Basic graph loading test
   - [ ] Simple interaction tests
   - [ ] Performance measurement tests

### Phase 2: Core Implementation (Days 4-8)
1. **Graph State Management**
   - [ ] Write tests for state transitions
   - [ ] Implement graph state management
   - [ ] Add visual regression tests for each state
   - [ ] Test error states and loading indicators

2. **D3 Integration**
   - [ ] Test basic D3 rendering
   - [ ] Add force simulation with tests
   - [ ] Test zoom and pan behavior
   - [ ] Verify layout stability visually

### Phase 3: Viewport Management

#### Enhanced Viewport Control (`viewportManager.js`)
```javascript
class ViewportManager {
  constructor(svg, content) {
    this.svg = svg;
    this.content = content;
    this.transform = d3.zoomIdentity;
    this.setupZoom();
  }

  setupZoom() {
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.transform = event.transform;
        this.updateViewport();
      })
      .filter(event => {
        // Custom filters for zoom behavior
        return !event.ctrlKey && event.type !== 'dblclick';
      });

    this.svg.call(zoom);
  }

  updateViewport() {
    // Use CSS transform for better performance
    this.content.style('transform', 
      `translate(${this.transform.x}px, ${this.transform.y}px) scale(${this.transform.k})`);
    this.content.style('transform-origin', '0 0');
    
    // Update detail level based on zoom
    this.updateDetailLevel(this.transform.k);
  }

  updateDetailLevel(scale) {
    const detail = scale < 0.5 ? 'low' : scale < 2 ? 'medium' : 'high';
    this.content.attr('data-detail', detail);
    this.updateNodeDetail(detail);
  }

  updateNodeDetail(detail) {
    // Adjust node rendering based on detail level
    this.content.selectAll('.node')
      .each(function() {
        const node = d3.select(this);
        switch(detail) {
          case 'low':
            node.select('text').style('display', 'none');
            node.select('image').attr('width', d => d.radius);
            break;
          case 'medium':
            node.select('text').style('display', null);
            node.select('image').attr('width', d => d.radius * 1.2);
            break;
          case 'high':
            node.select('text').style('display', null);
            node.select('image').attr('width', d => d.radius * 1.5);
            break;
        }
      });
  }
}
```

## Implementation Timeline

1. **Week 1: Testing Foundation** (Days 1-5)
   - Set up testing infrastructure
   - Create baseline tests
   - Implement test-driven development flow

2. **Week 2: Core Implementation** (Days 6-10)
   - Implement graph state management
   - Integrate D3 with tests
   - Add viewport management

3. **Week 3: Viewport & Interaction** (Days 11-15)
   - Enhance zoom and pan behavior
   - Implement level of detail rendering
   - Add smooth transitions
   - Optimize interaction handling

4. **Week 4: Polish & Testing** (Days 16-20)
   - Performance optimization
   - Edge case handling
   - Browser compatibility testing
   - Documentation updates
   - Force simulation stress testing

## Success Metrics

1. **Performance**
   - Initial force simulation convergence < 500ms
   - Smooth pan/zoom at 60fps
   - Selection updates < 16ms
   - Worker utilization < 70%
   - Force calculation cache hit rate > 80%

2. **Layout Stability**
   - Minimal node jitter during transitions
   - Consistent anchor node positioning
   - Smooth phyllotaxis-based initial layout
   - Effective collision handling during transitions
   - Predictable force simulation convergence

3. **Interaction Quality**
   - Responsive drag behavior
   - Smooth zoom transitions
   - Consistent frame rate during interactions
   - Efficient level of detail switching
   - Natural-feeling layout transitions

4. **Testing**
   - All visual regression tests pass
   - Test coverage > 80% for graph components
   - Visual snapshots updated and reviewed in PRs
   - Performance tests show consistent render times
   - Mock data covers edge cases and stress tests
