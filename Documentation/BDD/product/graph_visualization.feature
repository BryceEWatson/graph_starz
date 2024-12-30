Feature: Graph Visualization
  As a user
  I want to visualize the global graph of interconnected images, users, and attributes
  So that I can discover relationships and patterns across the entire platform

  Background:
    Given I am signed in to the application
    And I have uploaded multiple images
    And I am viewing the graph visualization component
    # Implemented in src/components/GraphVisualization.jsx

  @implemented @file:src/components/GraphVisualization.jsx @file:src/hooks/useD3Graph.js
  Scenario: Graph Display
    Given the graph visualization is loaded with D3.js
    Then I should see:
      | Element            | Description                                    | Implementation                             |
      | Image Nodes       | Actual images displayed as nodes               | container.append('circle') in setupGraph.js |
      | User Nodes        | Users who uploaded images                      | theme.userNode color in setupGraph.js      |
      | Attribute Nodes   | Nodes representing shared attributes           | theme.attributeNode color in setupGraph.js  |
      | Edges             | Lines showing upload and attribute connections | d3.forceLink() in setupGraph.js            |
    And image nodes should display their thumbnails using SVG patterns
    And the graph should be rendered using D3.js force-directed layout
    And the visualization should be responsive using client dimensions
    # Force configuration in setupGraph.js:forceConfig

  @implemented @file:src/lib/d3/setupGraph.js
  Scenario: Node Properties
    Given nodes are displayed in the graph
    Then each node type should use theme-specific colors:
      | Node Type         | Theme Implementation                           |
      | Image            | theme.defaultNode color                        |
      | User             | theme.userNode color                           |
      | Attribute        | theme.attributeNode color                      |
    And edge thickness should reflect relationship strength
    # Theme colors defined in setupGraph.js:setupGraph

  @implemented @file:src/lib/d3/interactions.js
  Scenario: Interactive Navigation
    Given I am viewing the graph visualization
    When I interact with the graph
    Then I should be able to:
      | Action             | Implementation                                 |
      | Pan               | d3.zoom() transform in useD3Graph.js          |
      | Zoom              | scaleExtent([0.5, 2]) in useD3Graph.js       |
      | Drag Nodes        | d3.drag() in interactions.js                  |
    And the interactions should use D3 zoom and drag behaviors
    And the graph should maintain readability at all zoom levels
    # Zoom behavior in useD3Graph.js
    # Drag behavior in interactions.js:setupInteractions

  Scenario: Graph Filtering
    Given I am viewing the graph visualization
    When I use the filtering controls
    Then I should be able to filter the graph by:
      | Filter Type        | Description                                    |
      | Upload Date       | Show images from specific time periods        |
      | User              | Show images by specific users                 |
      | Attribute Type    | Show specific types of attributes             |
    And the graph should update to reflect the filtered view
    And non-matching elements should be visually de-emphasized
    # Not yet implemented