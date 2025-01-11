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
```

## Development Guidelines
1. Always validate input parameters
2. Handle edge cases gracefully
3. Provide detailed error messages
4. Document public interfaces
