# Graph Visualization Rules

## Core Principles

1. **Visual Clarity**: Users should immediately understand what they're looking at
2. **Responsive Interactions**: Every user action should have clear, immediate feedback
3. **Intuitive Navigation**: Users should naturally know how to explore the graph
4. **Visual Hierarchy**: Important information should stand out visually

## User Interaction Guidelines

### Selection Behavior
1. **Clear Visual Feedback**
   - Selected nodes highlight immediately
   - Connected relationships become emphasized
   - Non-selected elements subtly fade back
   
2. **Natural Selection Actions**
   - Click: Select/deselect single node
   - Shift+Click: Add to current selection
   - Escape: Clear selection
   - Double-click: Select connected nodes

3. **Selection States**
   - Selected: Bright, emphasized state
   - Connected to Selected: Semi-emphasized state
   - Unselected: Normal state
   - Faded: Dimmed state for unrelated elements

### Navigation
1. **Viewport Controls**
   - Pan: Drag empty space
   - Zoom: Mouse wheel or pinch gesture
   - Reset: Double-click empty space
   - Fit to View: Auto-zoom to show all nodes

## Visual Design

### Nodes
1. **User Nodes**
   - Larger size for emphasis (60px diameter)
   - Circular avatar display using user's profile image
   - Blue accent border (#1E40AF)
   - Label hidden by default, shows on hover
   - Label includes user name/email

2. **Image Nodes**
   - Displays medium-sized image URL as thumbnail
   - Preserves original aspect ratio
   - Maximum width: 160px
   - Maximum height: 120px
   - Scales proportionally within bounds
   - Semi-transparent border for visual boundary
   - Label hidden by default, shows on hover
   - Label includes image title and type

3. **Attribute Nodes**
   - Compact size (30px diameter)
   - Distinctive icon based on attribute type
   - Color coded by attribute category
   - Label hidden by default, shows on hover
   - Shows connected node labels when hovered

### Relationships
1. **Visual Style**
   - Curved paths for natural flow
   - Line thickness shows connection strength
   - Arrows indicate direction
   - Semi-transparent to reduce visual noise

2. **Interactive States**
   - Highlight on hover
   - Emphasize on node selection
   - Show details on hover

### Label Behavior
1. **Default State**
   - All labels hidden for clean visualization
   - Reduced visual clutter
   - Focus on visual relationships

2. **Hover Interactions**
   - Show label of hovered node
   - Show labels of directly connected nodes
   - Fade in smoothly (150ms transition)
   - Include relevant metadata based on node type

3. **Selection State**
   - Show labels of selected nodes
   - Show labels of nodes connected to selection
   - Labels persist until selection changes
   - Higher opacity than hover state

## Technical Implementation

### Force Simulation Rules
1. **Type-based Organization**
   - User nodes: Medium repulsion (-300)
   - Image nodes: Strong repulsion (-500)
   - Attribute nodes: Light repulsion (-100)
   - Type-specific collision radiuses
   - Related nodes maintain proximity through link forces

2. **Link Distance Rules**
   - Image-connected: 180px spacing
   - User-connected: 120px spacing
   - Attribute-connected: 80px spacing
   - Stronger links between same types (0.2)
   - Strong user-image connections (0.3)
   - Default link strength (0.1)

3. **Movement Parameters**
   - Alpha decay: 0.02 for stable layout
   - Alpha target: 0.05 for subtle movement
   - Velocity decay: 0.3 for smooth transitions
   - Multiple collision iterations for stability

### Selection Management
```javascript
// Simple, focused selection API
selectionManager.select(nodeId);     // Single select
selectionManager.addToSelection(nodeId); // Multi-select
selectionManager.deselect(nodeId);   // Remove from selection
selectionManager.clearSelection();    // Clear all

// Consistent visual updates
selectionManager.updateVisuals({
  selected: ['node1', 'node2'],
  connected: ['node3', 'node4'],
  unselected: ['node5', 'node6']
});
```

### Layout Guidelines
1. **Initial View**
   - Start zoomed to fit all nodes
   - Maintain readable text size
   - Keep related nodes visually grouped

2. **Dynamic Updates**
   - Smooth transitions for changes
   - Maintain user's mental map
   - Keep selected nodes visible

## Accessibility

1. **Visual Design**
   - High contrast for readability
   - Clear visual hierarchy
   - Consistent visual patterns

2. **Interaction Support**
   - Keyboard navigation
   - Screen reader support
   - Clear focus indicators
