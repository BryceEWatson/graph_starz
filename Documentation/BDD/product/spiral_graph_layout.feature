Feature: Enhanced Spiral Graph Layout
  As a user
  I want a clear and visually coherent way to see my user node, its images, and shared attribute nodes
  So that I can navigate a large, evolving graph without confusion

  Background:
    Given I am signed in to the application
    And I have uploaded multiple images
    And I am viewing the graph visualization component
    And the graph theme is configured for proper contrast
    And node sizes are configured as:
      | Node Type     | Size   | Notes              |
      | User         | 60px   | Diameter           |
      | Image        | 160px  | Width only         |
      | Attribute    | 30px   | Diameter           |
    # Implemented in src/components/GraphVisualization.jsx
    # Theme configuration in setupGraph.js
    # Node sizes defined in setupGraph.js:nodeSizes

  @todo @file:src/lib/d3/layouts/spiralLayout.js @file:src/lib/d3/setupGraph.js
  Scenario: User-Centric Spiral Layout
    Given a user has multiple uploaded images
    When the graph layout is calculated
    Then images should be arranged in an Archimedean spiral around their user node:
      | Parameter           | Implementation Detail                          | Config Location              |
      | Spiral Formula     | r = a + bθ (Archimedean)                      | spiralLayout.js             |
      | Base Radius (a)    | forceConfig.distance.image (250px default)    | setupGraph.js:forceConfig   |
      | Growth Rate (b)    | 20px per revolution                           | spiralLayout.js             |
      | Angular Step (θ)   | 2π / max(8, numImages)                        | spiralLayout.js             |
      | Node Image Size   | 160px width, maintain aspect ratio            | setupGraph.js:nodeSizes     |
    And the spiral should maintain consistent spacing between images
    And the layout should scale smoothly for large image sets
    # Implementation in spiralLayout.js:calculateSpiralPositions
    # Integration with existing force configuration

  @todo @file:src/lib/d3/layouts/boundingCircles.js @file:src/lib/d3/setupGraph.js
  Scenario: Dynamic Bounding Circles
    Given user nodes have spiral-arranged images
    When calculating the graph layout
    Then each user's subgraph should have a bounding circle that:
      | Property           | Implementation Detail                          | Config Location              |
      | Radius            | Dynamic based on spiral extent                 | boundingCircles.js          |
      | Center            | User node position                             | setupGraph.js:forceConfig   |
      | Collision         | Extend forceConfig.strength settings           | setupGraph.js:forceConfig   |
      | Visual Style      | Use theme colors for subtle indication         | setupGraph.js:colors        |
    And bounding circles should prevent overlap between user subgraphs
    And the collision force should adapt to zoom level
    # Implementation in boundingCircles.js:calculateBoundingCircles
    # Theme integration with setupGraph.js colors

  @implemented @file:src/lib/d3/layouts/attributeLayout.js @file:src/lib/d3/setupGraph.js
  Scenario: Attribute Node Positioning
    Given multiple images share common attributes
    When positioning attribute nodes
    Then attributes should be positioned using forces that:
      | Force Type        | Implementation Detail                          | Config Location              |
      | Link Force       | Extend forceConfig.strength settings           | setupGraph.js:forceConfig   |
      | Collision       | Use nodeSizes.attribute for spacing            | setupGraph.js:nodeSizes     |
      | Repulsion      | Keep attributes away from user subgraphs       | attributeLayout.js          |
    And attributes should gravitate toward their connected images
    And the position should balance between all connected images
    # Implementation in attributeLayout.js:setupAttributeForces
    # Force configuration integration

  @future @file:src/lib/d3/interactions/edgeRendering.js
  Scenario: Edge Visual Clarity
    Given the graph contains many image-to-attribute connections
    When rendering edges
    Then edges should be styled for clarity:
      | Feature           | Implementation Detail                          | Config Location              |
      | Opacity         | Use theme-specific stroke-opacity              | setupGraph.js:links         |
      | Highlighting    | Integrate with hover.js states                | interactions/hover.js       |
      | Colors          | Use theme-specific link colors                | setupGraph.js:colors        |
    And edges should update smoothly during interactions
    # Implementation using existing hover.js states
    # Basic styling in setupGraph.js:setupLinks

  @todo @file:src/lib/d3/interactions/zoomBehavior.js
  Scenario: Zoom and Pan Interactions
    Given the graph contains multiple user subgraphs
    When zooming or panning
    Then the visualization should:
      | Behavior          | Implementation Detail                          | Config Location              |
      | Maintain Layout  | Preserve spiral structure during zoom         | zoomBehavior.js             |
      | Scale Text      | Use existing text visibility logic            | setupGraph.js               |
      | Performance     | Optimize rendering at different scales        | zoomBehavior.js             |
      | Transitions     | Use existing transitionConfig                 | setupGraph.js               |
    And the zoom behavior should be smooth and responsive
    And the graph should remain interactive at all zoom levels
    # Extends existing zoom behavior in GraphVisualization.jsx
    # Uses existing transition configuration

  # Performance Acceptance Criteria
  # 1. Smooth rendering with 1000+ images per user
  # 2. Responsive interaction at 60fps
  # 3. Layout stabilization within 2 seconds
  # 4. Transition duration matches setupGraph.js:transitionConfig
