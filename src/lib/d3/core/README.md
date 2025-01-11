# Graph Core Components

This directory contains the core initialization and management components for the D3 graph visualization.

## Components

### GraphInitializer
Handles the initialization of the D3 graph visualization:
- SVG container setup
- Force simulation initialization
- Basic graph structure creation

```javascript
import { GraphInitializer } from './GraphInitializer';

const initializer = new GraphInitializer({
    width: 800,
    height: 600,
    theme: 'light'
});

const graph = initializer.initialize(svgElement);
```

### GraphSetup
Manages the complete setup and lifecycle of the D3 graph visualization:
- Container and element creation
- Force simulation configuration
- Interaction handling
- Resource cleanup

```javascript
import { GraphSetup } from './GraphSetup';

const setup = new GraphSetup({
    forceConfig: {
        link: { distance: { ... } },
        charge: { ... },
        collide: { ... }
    },
    theme: {
        colors: {
            nodeFill: '#374151',
            nodeStroke: '#4B5563',
            // ... other colors
        }
    },
    nodeSizes: {
        user: 60,
        image: { width: 160 },
        attribute: 30
    }
});

// Create graph elements
const { container, background } = setup.setupContainer(svgElement, width, height);
const { nodes, links } = setup.createGraphElements(container, data);

// Clean up resources when done
setup.cleanup();
```

## Error Handling
The components implement comprehensive error handling:
- Input validation for all parameters
- Graceful fallbacks for missing values
- Detailed error messages for debugging

Example error handling:
```javascript
try {
    const graph = initializer.initialize(null);
} catch (error) {
    // Error: "Invalid SVG element: element must be a valid SVG node"
}
```

## Error Recovery
The components implement a robust error recovery system:
- Automatic cleanup on initialization errors
- Fallback nodes for failed element creation
- Resource cleanup on component disposal

Example error recovery:
```javascript
try {
    const setup = new GraphSetup(config);
    const { nodes, links } = setup.createGraphElements(container, data);
} catch (error) {
    // Error will be caught and resources cleaned up
    // Fallback nodes will be created for any failed elements
}
```

## Type Definitions
```typescript
interface InitializerConfig {
    width: number;      // Width of the graph area
    height: number;     // Height of the graph area
    theme?: string;     // Visual theme (default: 'light')
}

interface GraphContainer {
    container: d3.Selection;  // Main graph container
    defs: d3.Selection;      // Definitions container
    nodes: d3.Selection;     // Nodes container
    links: d3.Selection;     // Links container
}

interface GraphSetupConfig {
    forceConfig: ForceConfig;     // Force simulation parameters
    theme: ThemeConfig;           // Visual theme configuration
    nodeSizes: NodeSizeConfig;    // Node size configuration
}

interface ForceConfig {
    link: LinkForceConfig;        // Link force parameters
    charge: ChargeForceConfig;    // Charge force parameters
    collide: CollideForceConfig;  // Collision force parameters
}

interface ThemeConfig {
    colors: {
        nodeFill: string;         // Base node color
        nodeStroke: string;       // Node border color
        linkStroke: string;       // Link color
        textFill: string;         // Text color
        userNode: string;         // User node color
        attributeNode: string;    // Attribute node color
        defaultNode: string;      // Default node color
        nodeBorder: string;       // Node border color
    }
}

interface NodeSizeConfig {
    user: number;                 // User node size
    image: { width: number };     // Image node size
    attribute: number;            // Attribute node size
}
```

## Integration with Product Vision
The core components support the product vision by:
1. **Graph View**: 
   - Reliable graph visualization with error recovery
   - Consistent visual styling across themes
   - Smooth transitions and interactions

2. **AI Integration**:
   - Support for AI-identified attributes
   - Graceful handling of attribute relationships
   - Visual distinction of attribute types

3. **User Experience**:
   - Responsive interactions
   - Clear visual feedback
   - Consistent behavior

## Development Guidelines
1. Always validate input parameters
2. Handle edge cases gracefully
3. Provide detailed error messages
4. Document public interfaces
5. Implement proper cleanup
6. Test error recovery
7. Verify visual consistency

## Testing
The components include comprehensive tests:
- Input validation
- Error handling
- Resource cleanup
- Visual consistency
- Edge cases
- Integration tests

Example test pattern:
```javascript
describe('GraphSetup', () => {
    test('handles invalid data gracefully', () => {
        const setup = new GraphSetup(validConfig);
        expect(() => setup.createGraphElements(container, invalidData))
            .not.toThrow();
        // Verify fallback nodes are created
        expect(container.selectAll('.fallback-node')).toHaveLength(1);
    });
});
