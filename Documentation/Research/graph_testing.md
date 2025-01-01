# Graph Testing Guide

## D3.js Mocking and Testing Strategy

### Core Concepts

#### 1. D3 Selection and DOM Structure
D3 selections follow a specific hierarchy that must be properly mocked to ensure tests accurately reflect the structure:
```html
<g>                         <!-- container -->
  <g>                      <!-- from container.append -->
    <g class="graph-node"> <!-- from join -->
      <circle>            <!-- inherits data only -->
      <text>             <!-- inherits data only -->
    </g>
  </g>
</g>
```

#### 2. Data Binding Rules
- Data flows from parent to child through inheritance.
- Classes and attributes do **not** automatically inherit.
- The `__data__` property stores bound data on DOM elements.
- Data binding occurs at element creation and persists.

#### 3. Key Selection Methods to Mock
Essential methods to mock, ensuring chainability and call tracking:
- `append()`: Creates new elements with proper data inheritance.
- `attr()`: Handles both function and value arguments; tracks calls with element type.
- `data()`: Manages data binding.
- `join()`: Creates elements with proper class assignment.
- `text()`: Handles text content with data binding.
- `call()`: Manages force simulation and drag behavior.
- `filter()`: Filters selections while preserving element type.
- `style()`: Sets styles on elements, should be chainable.
- `remove()`: Removes elements from the selection.
- `selectAll()`: Selects elements based on a selector.

### Essential Mocking Techniques

#### 1. Selection Mocking
*   Problem: D3's chainable methods require mocks to return new mock objects to enable method chaining.
*   Solution: Mock methods to return either the same mock object (using `mockReturnThis()`) or a new mock object with its own mocked methods.
*  Helper functions can be used to reduce code duplication.
  ```javascript
 const createMockD3Selection = () => ({
   append: jest.fn().mockReturnValue({
       attr: jest.fn().mockReturnThis(),
       style: jest.fn().mockReturnThis(),
       text: jest.fn().mockReturnThis(),
   }),
   attr: jest.fn().mockReturnThis(),
   style: jest.fn().mockReturnThis(),
   text: jest.fn().mockReturnThis(),
   remove: jest.fn().mockReturnThis(),
   selectAll: jest.fn().mockReturnThis(),
   data: jest.fn().mockReturnThis(),
   join: jest.fn().mockReturnValue({
     attr: jest.fn().mockReturnThis(),
     style: jest.fn().mockReturnThis(),
     remove: jest.fn().mockReturnThis(),
   })
 });
 ```

#### 2. Zoom Mock Implementation

**State Management:**
- Maintain transform object with `k` (scale), `x`, `y` properties
- Initialize with identity transform `{ k: 1, x: 0, y: 0 }`
- Store zoom extent as `[[x0, y0], [x1, y1]]`

**Key Methods:**
```javascript
class ZoomMock {
    constructor() {
        this.transform = { k: 1, x: 0, y: 0 };
        this.extent = [[-2000, -1600], [2000, 1600]];
        this.callHistory = [];
    }

    scaleExtent([min, max]) {
        if (!arguments.length) return this._scaleExtent;
        this._scaleExtent = [min, max];
        this.callHistory.push(['scaleExtent', [min, max]]);
        return this;
    }

    scaleTo(selection, scale, center) {
        this.transform.k = scale;
        if (center) {
            // Update transform based on center
            this.transform.x = center[0];
            this.transform.y = center[1];
        }
        this.callHistory.push(['scaleTo', [selection, scale, center]]);
        return this;
    }
}
```

**Event Handling:**
- Track event listeners in a dictionary
- Support both programmatic and user-initiated zooming
- Emit zoom events with transform data

#### 3. Force Simulation Mock

**State Management:**
- Track active forces in a dictionary by type
- Store simulation parameters (alpha, alphaMin, etc.)
- Maintain node and link data arrays

**Implementation Example:**
```javascript
class ForceSimulationMock {
    constructor() {
        this.forces = {};
        this.nodes = [];
        this.alpha = 1;
        this.alphaMin = 0.001;
        this.callHistory = [];
    }

    force(name, force) {
        if (arguments.length < 2) return this.forces[name];
        this.forces[name] = force;
        this.callHistory.push(['force', [name, force]]);
        return this;
    }

    tick(iterations = 1) {
        for (let i = 0; i < iterations; ++i) {
            // Simulate force calculations
            this.nodes.forEach(node => {
                node.x += Math.random() - 0.5;
                node.y += Math.random() - 0.5;
            });
        }
        return this;
    }
}
```

### Testing Best Practices

#### 1. Test Organization
- Group related tests logically.
- Test edge cases and error conditions.
- Verify visual and functional aspects.
- Document expected behavior.

#### 2. Integration Testing
- Use JSDOM for headless testing
- Combine mocked forces with real D3 code
- Test actual DOM manipulation for complex behaviors

#### 3. Data-Driven Testing
```javascript
test.each([
    [{ nodes: [], links: [] }, { x: 0, y: 0 }],
    [{ nodes: [{ id: 1 }], links: [] }, { x: 100, y: 100 }]
])('simulation with %p produces %p', (input, expected) => {
    const sim = new ForceSimulationMock()
        .nodes(input.nodes)
        .force('link', d3.forceLink(input.links));
    sim.tick();
    expect(sim.nodes[0]).toMatchObject(expected);
});
```

### Common Pitfalls and Solutions

1. **Reference Errors During Initialization**
   - Problem: Direct self-reference in mock definition
   - Solution: Use function within mockReturnValue or create object first

2. **Lost Element Type Information**
   - Problem: Element type lost during filter/append
   - Solution: Explicitly track _type property

3. **Transform String Generation**
   - Problem: Incorrect transform string format
   - Solution: Implement toString() method on transform object

4. **Event Propagation**
   - Problem: Events not properly simulated
   - Solution: Maintain event dictionary and proper emission order

### Testing Selection Management

### Core Test Cases
```javascript
describe('Selection Management', () => {
  let manager;

  beforeEach(() => {
    manager = new SelectionManager(simulation);
  });

  test('single selection', () => {
    manager.selectNode('node-1');
    expect(manager.isSelected('node-1')).toBe(true);
  });

  test('batch selection', () => {
    const nodes = ['node-1', 'node-2'];
    manager.batchSelect(nodes);
    nodes.forEach(id => {
      expect(manager.isSelected(id)).toBe(true);
    });
  });

  test('visual updates', () => {
    manager.selectNode('node-1');
    const node = container.querySelector('[data-id="node-1"]');
    expect(node.classList.contains('selected')).toBe(true);
  });
});
```

### Best Practices

1.  **Mock Implementation**
    -   Track created elements separately.
    -   Implement all necessary D3 methods.
    -   Match D3's exact behavior for selections.
    -   Handle both synchronous and async operations.
    -  Use `mockReturnThis()` when the method returns `this`.

2.  **Test Organization**
    -   Group related tests logically.
    -   Test edge cases and error conditions.
    -   Verify visual and functional aspects.
    -   Document expected behavior.

3.  **Maintenance**
    -   Keep mocks up to date with D3 version.
    -   Document any deviations from D3 behavior.
    -   Regular review and updates of test coverage.
    -   Monitor for test reliability.

## Key Principles

*   **Focus on Behavior:** Test the behavior and output of your D3 code, rather than specific D3 API implementation details.
*   **Mock Only What You Need:** Avoid over-mocking the entire D3 library. Mock only the specific methods your code uses.
*   **Maintain Chainability:**  Ensure mocked methods return the correct mock objects so that method chaining works as expected.
*   **Explicitly Track Context:** Preserve element type information throughout the selection chain.
*   **Use Helper Functions:** Create reusable mock setups for common D3 patterns.

This merged document provides a comprehensive guide to testing D3 graphs, incorporating best practices for mocking, call tracking, and verification. It should serve as a valuable resource for your team.
