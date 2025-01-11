# Graph Interactions

This directory contains the interaction handlers for the D3 graph visualization, implementing the interactive features described in the product vision.

## Components

### NodeInteractionManager
Manages node-level interactions:
- Hover effects
- Selection behavior
- Connected node highlighting

### LinkInteractionManager
Manages link-level interactions:
- Hover effects
- Connected link highlighting
- Link opacity transitions

### TransitionManager
Handles visual transitions:
- Node/link opacity
- Element scaling
- Color transitions

## Usage

```javascript
import { NodeInteractionManager } from './NodeInteractionManager';
import { LinkInteractionManager } from './LinkInteractionManager';

// Create managers
const nodeManager = new NodeInteractionManager({
    hoverDuration: 200,
    selectionDuration: 300
});

const linkManager = new LinkInteractionManager({
    hoverDuration: 200,
    opacity: { default: 0.6, hover: 0.8 }
});

// Attach handlers
nodeManager.attachEventHandlers(nodes);
linkManager.attachEventHandlers(links);

// Cleanup when done
nodeManager.cleanup();
linkManager.cleanup();
```

## Event Handling
The interaction managers follow these principles:
1. Clean separation of concerns
2. Consistent transition behavior
3. Proper event cleanup
4. Error recovery

## State Management
- Selection state is managed independently
- Hover state is tracked per element
- Transitions are queued and managed

## Error Handling
All managers implement comprehensive error handling:
- Invalid element detection
- Missing data handling
- Event cleanup on errors

## Development Guidelines
1. Always cleanup event listeners
2. Use consistent transition timings
3. Handle all edge cases
4. Document state changes
