# Graph Visualization Rules

## Overview

This document outlines the rules and best practices for visualizing our graph data using D3. The focus is on creating a visually pleasing and intuitive user interface while adhering to our graph structure and product vision.

## Core Principles

1. **Visual Clarity**: All elements must be easily readable and distinguishable
2. **Spatial Efficiency**: Graph layout should maximize screen space usage while preventing overcrowding
3. **Intuitive Navigation**: Users should naturally understand how to interact with the graph
4. **Visual Hierarchy**: Node and relationship importance should be reflected in their visual representation
5. **Performance**: Maintain smooth interactions regardless of graph size
6. **Progressive Enhancement**: Gracefully handle increasing data complexity

## Technical Considerations

1. **D3-Based Rendering Strategy**
   - Primary SVG-based rendering using D3's built-in capabilities
   - Custom force simulation optimization:
     - Web workers for force calculations
     - Batched force updates for large graphs
     - Dynamic force strength adjustment based on graph size
   - Viewport optimization:
     - D3 zoom and pan behavior management
     - Selective rendering of node details based on zoom level
     - Custom culling for off-screen elements
   - Performance techniques:
     - D3 selection optimization for large datasets
     - Efficient data join patterns
     - SVG group-based organization for better performance

2. **Performance Thresholds**
   - Initial force simulation convergence < 1000ms
   - Smooth pan/zoom at 60fps
   - Interaction response < 16ms
   - Force calculation distribution:
     - Main thread: < 500 nodes
     - Worker thread: 500+ nodes
   - Memory management:
     - Active nodes: < 1000 in DOM
     - Cached nodes: up to 5000
     - Beyond: progressive loading

3. **Error Handling**
   - Graceful force simulation adjustment for large datasets
   - Clear loading states during force recalculation
   - Automatic simulation cool-down for stability
   - Recovery from force simulation instability

## Layout Rules

### Node Positioning

1. **Viewport Optimization**
   - Maximize viewport space utilization by dynamically adjusting node positions
   - Ensure all nodes, including disconnected ones, remain within reasonable bounds
   - Scale layout based on viewport size and node count
   - Maintain visual grouping of related nodes while preventing isolation

2. **Dynamic Spacing**
   - Implement force-directed layout with custom forces:
     - Repulsion force between nodes to prevent overlap
     - Attraction force between connected nodes
     - Boundary force to keep nodes within reasonable viewport bounds
     - Intelligent subgraph management:
       - Detect distinct connected components (subgraphs)
       - Assign each subgraph to a region based on size and connectivity
       - Larger, more connected subgraphs get priority placement
       - Apply local center-gravity within each subgraph
       - Maintain buffer zones between subgraphs
   - Adjust force strengths based on:
     - Node type and relationship count
     - Subgraph size and density
     - Distance between subgraphs
   - Dynamic region allocation:
     - Grid-based placement for multiple subgraphs
     - Automatic rebalancing when subgraphs merge or split
     - Smooth transitions during restructuring

3. **Spatial Organization**
   - Virtual Grid System:
     - Divide viewport into quadrants for initial subgraph placement
     - Use golden ratio spacing for aesthetically pleasing distribution
     - Maintain consistent orientation using cardinal directions
   
   - Anchor Points:
     - Define key structural anchors:
       - User nodes act as primary anchors within their subgraphs
       - Most connected attribute nodes serve as secondary anchors
       - Store relative positions between anchors for stability
     - Use anchors to:
       - Guide force-directed layout initialization
       - Maintain consistent spatial relationships during updates
       - Provide reference points for viewport navigation

   - Quadtree Implementation:
     - Spatial indexing for efficient:
       - Node collision detection
       - Nearest neighbor queries
       - Region-based force calculations
     - Dynamic updates as nodes move
     - Viewport culling optimization

4. **Viewport Management**
   - Initially zoom to fit all nodes with 10% padding
   - When adding new nodes, smoothly transition the viewport to include them
   - Maintain a maximum zoom level to prevent nodes from becoming too small

### Label Placement

1. **Node Labels**
   - Position labels with smart anchoring to avoid overlap
   - Implement label collision detection and resolution
   - Use ellipsis for long labels with full text on hover
   - Maintain minimum font size of 12px for readability

2. **Relationship Labels**
   - Center on relationship lines
   - Rotate to follow line angle for better readability
   - Add subtle background to ensure contrast with graph elements

## Visual Styling

### Nodes

1. **User Nodes**
   - Larger size (50px diameter)
   - Display user avatar if available
   - Blue color scheme (#1E40AF)
   - Prominent border (2px)
   - Level-of-detail rendering based on viewport distance

2. **Image Nodes**
   - Medium size (40px diameter)
   - Display thumbnail preview
   - Green color scheme (#15803D)
   - Semi-transparent background
   - Progressive image loading for thumbnails

3. **Attribute Nodes**
   - Smaller size (30px diameter)
   - Distinct colors per type:
     - Style: Purple (#7E22CE)
     - Technique: Orange (#C2410C)
     - Mood: Pink (#BE185D)
     - Object: Teal (#0F766E)
     - Color: Gray (#4B5563)
   - Batch rendering for large attribute sets

### Relationships

1. **Line Styling**
   - Curved paths for better visual flow
   - Line thickness proportional to relationship strength/count
   - Semi-transparent to reduce visual noise
   - Arrows indicating relationship direction
   - WebGL-based rendering for dense relationship networks

2. **Interaction States**
   - Highlight connected nodes and relationships on hover
   - Fade unrelated elements to emphasize connections
   - Show relationship details on hover
   - Spatial indexing for fast interaction response
   - Debounced hover events for performance

## Performance Optimizations

1. **Rendering Strategy**
   - Level-of-detail rendering based on viewport
   - WebGL fallback for large graphs
   - Worker-based force calculations
   - Virtualization for large datasets
   - Progressive loading of subgraphs

2. **State Management**
   - Persist layout state between sessions
   - Cache frequently accessed subgraphs
   - Implement undo/redo for layout changes
   - Save user viewport preferences
   - Efficient delta updates

3. **Interaction Optimization**
   - Spatial indexing for hit detection
   - Debounced user interactions
   - Prioritized viewport calculations
   - Optimized force calculations
   - Smooth animation transitions

## Accessibility

1. **Color Considerations**
   - Ensure sufficient contrast ratios (WCAG AA compliance)
   - Use patterns or shapes as additional visual indicators
   - Provide high-contrast mode option

2. **Interactive Elements**
   - Support keyboard navigation between nodes
   - Implement ARIA labels for all interactive elements
   - Provide text alternatives for visual information

## Implementation Notes

1. **D3 Configuration**
   ```javascript
   const simulation = d3.forceSimulation()
     .force('link', d3.forceLink().id(d => d.id).distance(100))
     .force('charge', d3.forceManyBody().strength(-300))
     .force('center', d3.forceCenter(width / 2, height / 2))
     .force('collision', d3.forceCollide().radius(50))
     .force('boundary', boundaryForce);
   ```

2. **Key Event Handlers**
   - Pan: Mouse drag on background
   - Zoom: Mouse wheel or pinch gesture
   - Node drag: Mouse drag on node
   - Selection: Click or tap on node

3. **Viewport Management**
   ```javascript
   function zoomToFit(paddingPercent = 0.1) {
     const bounds = graphElement.node().getBBox();
     const fullWidth = bounds.width;
     const fullHeight = bounds.height;
     const midX = bounds.x + fullWidth / 2;
     const midY = bounds.y + fullHeight / 2;
     const scale = (1 - paddingPercent) / Math.max(fullWidth / width, fullHeight / height);
     const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
     
     svg.transition()
        .duration(500)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
   }
   ```
