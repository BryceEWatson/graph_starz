# D3 Force Graph Edge Routing Research

## Problem Statement
When implementing edge routing in D3 force graphs with mixed node types (images and circles) and SVG transforms, connections were incorrectly attaching to node centers instead of their visual boundaries.

## Key Findings

### 1. Coordinate Systems

#### Force Simulation Space
- D3's force simulation operates in absolute SVG coordinates (0,0 at top-left)
- Node positions (d.x, d.y) represent absolute coordinates in the SVG viewport
- Force simulation directly manipulates these coordinates during physics calculations

#### Visual Space
- SVG transforms can be used for node positioning: `translate(${d.x},${d.y})`
- Nested elements (like images) use relative positioning within transformed nodes
- Link positions should be calculated in absolute coordinates to match the force simulation

### 2. Node Positioning Best Practices

#### Transform Approach
```javascript
// Recommended node positioning
nodes.attr("transform", d => `translate(${d.x},${d.y})`);

// Nested elements use relative positioning
node.append('image')
    .attr('width', d.properties.width)
    .attr('height', d.properties.height)
    .attr('x', -d.properties.width / 2)  // Center relative to transform
    .attr('y', -d.properties.height / 2);
```

#### Link Updates
```javascript
// Links should use absolute coordinates
links
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);
```

### 3. Edge Routing Implementation

#### Intersection Point Calculation
For rectangular nodes (images), intersection points should be calculated:
1. Relative to the node's center position (d.x, d.y)
2. Taking into account the node's dimensions
3. Transformed into absolute SVG coordinates

```javascript
function getIntersectionPoint(source, target, nodeType) {
    if (nodeType === 'image') {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const width = target.properties.width;
        const height = target.properties.height;
        
        // Calculate intersection with rectangle boundaries
        // Return in absolute coordinates
        return calculateRectIntersection(
            source.x, source.y,      // Line start
            target.x, target.y,      // Line end
            width, height            // Rectangle dimensions
        );
    }
    // Handle other node types...
}
```

### 4. Performance Considerations

#### Coordinate Updates
- Direct position updates (x1,y1,x2,y2) perform better than transforms for links
- Transform groups can cause jittery animations during simulation cooling
- Consider caching boundary calculations when possible

#### Collision Detection
- Use simplified circular boundaries for force simulation physics
- Calculate precise visual intersections only during rendering
- Balance between physics accuracy and visual precision

## Implementation Recommendations

1. **Node Structure**
   - Keep force simulation data separate from visual properties
   - Use type property to determine intersection calculation method
   - Maintain consistent coordinate space usage

2. **Edge Routing**
   - Calculate intersections in absolute coordinates
   - Update link positions directly rather than using transforms
   - Handle different node shapes with separate intersection logic

3. **Performance**
   - Cache boundary calculations where possible
   - Use simplified physics boundaries
   - Calculate precise intersections only when needed

## References
1. [D3 Force Layout Documentation](https://d3js.org/d3-force/simulation)
2. [D3 in Depth - Force Layout](https://www.d3indepth.com/force-layout/)
3. [SVG Coordinate Space with D3](https://www.dashingd3js.com/d3-tutorial/using-the-svg-coordinate-space-with-d3-js)
4. [Force Layout Optimization](https://www.nebula-graph.io/posts/d3-force-layout-optimization)

## Next Steps
1. Implement precise rectangle intersection calculations
2. Add caching for boundary calculations
3. Consider edge routing optimizations for performance
4. Add visual debugging tools for coordinate system verification
