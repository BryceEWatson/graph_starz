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

**1. Addressing `ReferenceError` during Initialization:**
*   Problem: Directly referencing the mock object within its definition leads to errors.
*   Solution: Use a function within `mockReturnValue` that returns the mock object or use `mockReturnThis()`. Or, create mock object first and then add methods to it.
    ```javascript
    // Corrected
    forceLink: jest.fn().mockImplementation(() => {
        const mock = {
            id: jest.fn().mockReturnValue(() => mock),
            distance: jest.fn().mockReturnValue(() => mock),
            strength: jest.fn().mockReturnValue(() => mock)
        };
        return mock;
    });

    // Or using mockReturnThis()
     forceLink: jest.fn().mockImplementation(() => {
        const mock = {
            id: jest.fn().mockReturnThis(),
            distance: jest.fn().mockReturnThis(),
            strength: jest.fn().mockReturnThis()
        };
        return mock;
    });

    //Or Create Mock Object First
     forceLink: jest.fn().mockImplementation(() => {
        const mock = {};
        mock.id = jest.fn().mockReturnThis();
        mock.distance = jest.fn().mockReturnThis();
        mock.strength = jest.fn().mockReturnThis();
        return mock;
    });
    ```

**2. Handling Chainable APIs:**
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
**3.  Tracking Method Calls**
    *   Problem: `jest.fn().mock.calls` array is empty if the mock doesn't return an object with the correct mocked methods to maintain chainability.
    *  Solution: Ensure each method in the chain returns an object that has the next method mocked.
    *   Verification:
        * Use `expect(mockMethod).toHaveBeenCalledWith(...args)` to check specific arguments.
        * Use `expect(mockMethod.mock.calls).toEqual([...expectedCalls])` to verify all arguments.
    *  Side effects: Use render testing libraries such as `react-testing-library` to query the DOM and verify the side effects.

**4. Element Type Tracking:**
   *   Problem: Element type information is lost when using `selection.filter()` and `selection.append()` without explicit preservation.
   *   Solution:
        *   Explicitly set and pass a `_type` property on selection mocks.
        *   When tracking attribute calls, store element type in a three-tuple: `[name, value, type]`.
        *   Share mock call tracking between parent and child selections.
   * Attribute Storage: Store both raw values and functions for non-function attributes.

        ```javascript
             if (typeof value === 'function') {
                 this._attributes[name] = value;
             } else {
                 this._attributes[name] = value;
                 this._attributes[`${name}_fn`] = () => value;
             }
        ```

**5. Mocking D3 Force Simulation**
*  Granular Mocking: Mock individual functions like `d3.forceSimulation`, `d3.forceLink`, etc. for precise control, however it requires more setup and may be more brittle to changes in the D3 API.
* High-Level Behavioral Mocking: Mock the overall behavior, such as node position updates on "tick". Simplifies setup but offers less control.
* Minimal Mock: Mock only the necessary parts for testing node rendering. For example:
  ```javascript
    jest.mock('d3', () => ({
    forceSimulation: jest.fn().mockImplementation((nodes) => {
        return {
            force: jest.fn().mockReturnThis(),
            on: jest.fn().mockImplementation((event, callback) => {
                 if (event === 'tick') {
                    nodes.forEach(node => {
                      node.x = Math.random() * 100;
                      node.y = Math.random() * 100;
                    })
                    callback();
                }
                return this;
            }),
            nodes: jest.fn().mockImplementation(() => nodes),
            stop: jest.fn().mockReturnThis(),
        };
    }),
    forceLink: jest.fn().mockImplementation(() => ({
         id: jest.fn().mockReturnThis(),
            distance: jest.fn().mockReturnThis(),
            strength: jest.fn().mockReturnThis(),
    })),
     forceManyBody: jest.fn().mockReturnValue({}),
    forceCenter: jest.fn().mockReturnValue({}),
}));

```

### Common Testing Pitfalls

1. **Element Counting**
   - Only count explicitly classed elements (e.g. `.graph-node`).
   - Don't include child elements in node counts.
   - Verify both nodes and links separately.

2. **Data Inheritance**
   - Child elements inherit data but not classes.
   - Data must persist through the selection chain.
   - Verify data binding on each element type.

3. **Selection Chain**
   - Maintain proper parent-child relationships.
   - Return correct selection objects.
   - Handle method chaining correctly by mocking methods in the chain.

### Testing Strategy

1.  **Graph Setup Tests**
    ```javascript
    test('creates correct number of nodes and links', () => {
      // Verify exact node count (only .graph-node elements)
      // Verify exact link count (only .graph-link elements)
    });
    ```

2.  **Node Structure Tests**
    ```javascript
    test('applies correct node types and styles', () => {
      // Verify node class assignment
      // Check data binding
      // Validate child elements (circle, text)
    });
    ```

3.  **Force Simulation Tests**
    ```javascript
    test('force simulation is initialized correctly', () => {
      // Verify force parameters
      // Check node and link assignments
      // Validate event handlers
    });
    ```

## Testing Selection Management

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

### Testing Best Practices

1. Test one behavior at a time.
2. Use clear, descriptive test names.
3. Keep setup code minimal and focused.
4. Test both success and error cases.

## Best Practices

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
