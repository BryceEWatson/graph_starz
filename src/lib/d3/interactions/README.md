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

## Touch Support

The interaction managers support touch events for mobile devices:

### Single Tap
- Select/deselect nodes
- Show node details
- Highlight connected nodes and links

### Double Tap
- Reset selection state
- Return to overview

Example touch handling:
```javascript
const manager = new NodeInteractionManager({
    hoverDuration: 200,
    selectionDuration: 300,
    opacity: {
        default: 0.6,
        hover: 0.8,
        selected: 1.0,
        faded: 0.3
    }
});

// Touch events are automatically handled
manager.attachEventHandlers(nodes, links);
```

## Resource Management

The interaction managers implement thorough resource cleanup:

### Event Handlers
- All event listeners are properly removed
- Touch event handlers are cleaned up
- Selection state is reset

### Visual State
- Node opacity is reset
- Link highlighting is cleared
- Transitions are completed

Example cleanup:
```javascript
// Clean up when done
manager.removeEventHandlers();
```

## Development Guidelines
1. Always cleanup event listeners
2. Use consistent transition timings
3. Handle all edge cases
4. Document state changes
