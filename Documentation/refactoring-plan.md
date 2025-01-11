# Graph Starz Revised Refactoring Plan
*Last Updated: 2025-01-11*

## Priority Files for Refactoring

### 1. src/lib/d3/setupGraph.js (Highest Priority)
Current Issues:
- File is over 600 lines with multiple responsibilities
- Mixes initialization, rendering, and event handling
- Complex force simulation logic is difficult to test
- Limited error handling and validation

Incremental Changes:
1. **Step 1: Extract Configuration (Already Started)**
   - Move force configuration to separate file ✓
   - Add validation for configuration parameters
   ```javascript
   // forceConfig.js
   export function validateForceConfig(config) {
     if (!config.link?.distance) {
       throw new Error('Missing link distance configuration');
     }
     // Additional validation...
   }
   ```

2. **Step 2: Separate Graph Initialization**
   - Create GraphInitializer class
   ```javascript
   // src/lib/d3/core/GraphInitializer.js
   export class GraphInitializer {
     constructor(config) {
       this.config = config;
     }

     initialize(svgElement) {
       this.validateElement(svgElement);
       const container = this.createContainer(svgElement);
       return this.setupSimulation(container);
     }
   }
   ```

3. **Step 3: Extract Event Handlers**
   - Move event handling logic to separate files
   - Create dedicated classes for different interaction types

4. **Step 4: Improve Error Recovery**
   - Add error boundaries around critical operations
   - Implement graceful fallbacks

### 2. src/lib/d3/layouts/spiralLayout.js (High Priority)
Current Issues:
- Complex mathematical calculations lack documentation
- No validation of input parameters
- Missing error handling for edge cases

Incremental Changes:
1. **Step 1: Add Input Validation**
   ```javascript
   export function validateSpiralParams(params) {
     const { centerNode, radius, growthRate } = params;
     if (!centerNode?.x || !centerNode?.y) {
       throw new Error('Invalid center node coordinates');
     }
     if (radius <= 0 || growthRate <= 0) {
       throw new Error('Invalid spiral parameters');
     }
   }
   ```

2. **Step 2: Document Algorithm**
   - Create detailed README explaining the mathematical basis
   - Add JSDoc comments to all functions
   - Include diagrams for visual explanation

3. **Step 3: Extract Calculations**
   - Separate pure mathematical functions
   - Create testable utility functions

### 3. src/lib/d3/interactions/hover.js (Medium Priority)
Current Issues:
- Event handling logic is tightly coupled
- Lacks clear separation of concerns
- Limited configurability

Incremental Changes:
1. **Step 1: Create Event Manager**
   ```javascript
   export class HoverEventManager {
     constructor(config) {
       this.config = config;
     }

     attachListeners(selection) {
       this.setupMouseOver(selection);
       this.setupMouseOut(selection);
     }
   }
   ```

2. **Step 2: Extract Style Updates**
   - Create separate functions for visual updates
   - Make styling configurable

## Documentation Improvements

### 1. New Documentation Files
- `src/lib/d3/README.md`: Overview of D3 implementation
- `src/lib/d3/layouts/README.md`: Layout algorithms explanation
- `src/lib/d3/core/ARCHITECTURE.md`: Core architecture documentation

### 2. Code Documentation Standards
- Add JSDoc comments to all public functions
- Include examples in documentation
- Document error handling approaches

### 3. Algorithm Documentation
- Create detailed documentation for spiral layout
- Add performance considerations
- Include edge case handling

## Test Strategy

### Existing Test Files
1. `integration.test.js`
   - Currently tests: Basic graph setup, force simulation
   - Add: Configuration validation, error recovery

2. `nodeRendering.test.js`
   - Currently tests: Node appearance, styling
   - Add: Edge case handling for missing properties

### New Test Requirements
Only adding tests essential for refactoring:

1. **Configuration Validation Tests**
   ```javascript
   describe('Force Configuration Validation', () => {
     test('throws error on invalid link distance', () => {
       expect(() => validateForceConfig({
         link: { distance: null }
       })).toThrow('Missing link distance configuration');
     });
   });
   ```
   Reason: Ensures configuration changes are safe

2. **Graph Initialization Tests**
   ```javascript
   describe('Graph Initialization', () => {
     test('creates valid container structure', () => {
       const initializer = new GraphInitializer(config);
       const container = initializer.initialize(svgElement);
       expect(container.select('defs')).toBeDefined();
     });
   });
   ```
   Reason: Validates core setup functionality

## Implementation Schedule

### Week 1 (Current)
- Complete force configuration extraction
- Add configuration validation
- Create initial documentation structure

### Week 2
- Extract graph initialization logic
- Add core documentation
- Implement basic error handling

### Week 3
- Extract event handlers
- Document interaction patterns
- Add critical validation tests

### Week 4
- Refactor spiral layout
- Complete algorithm documentation
- Add remaining validation tests

## Success Criteria
1. No file longer than 300 lines
2. All public functions documented
3. Clear separation of concerns
4. Comprehensive error handling
5. Essential test coverage for refactored components
