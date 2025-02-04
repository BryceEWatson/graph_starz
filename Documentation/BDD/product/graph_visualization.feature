Feature: Graph Visualization
  As a user
  I want to visualize the global graph of interconnected images, users, and attributes
  So that I can discover relationships and patterns across the entire platform

  Background:
    Given I am signed in to the application
    And I have uploaded multiple images
    And I am viewing the graph visualization component
    # Core implementation in src/lib/d3/setupGraph.js
    # Theme handling in src/lib/d3/styles.js
    # Performance monitoring in src/lib/d3/metrics/performanceMonitor.js
    # Test coverage in src/lib/d3/__tests__/setupGraph.test.js

  @implemented @file:src/lib/d3/setupGraph.js @file:src/lib/d3/styles.js @test:setupGraph.test.js
  Scenario: Graph Display
    Given the graph visualization is loaded with D3.js
    Then I should see:
      | Element         | Description                      | Implementation                                    | Test Coverage                          |
      | Image Nodes    | Actual images displayed as nodes | setupGraph.js:createImageNodes                    | nodeRendering.test.js:ImageNodes      |
      | User Nodes     | Users who uploaded images        | setupGraph.js:createUserNodes                     | nodeRendering.test.js:UserNodes       |
      | Attribute Nodes| Nodes representing attributes    | setupGraph.js:createAttributeNodes                | nodeRendering.test.js:AttributeNodes  |
      | Edges          | Connection lines                 | setupGraph.js:setupLinks                          | setupGraph.test.js:LinksSetup        |
    And nodes should be sized according to type:
      | Node Type      | Size   | Implementation                                    | Test Validation                        |
      | User          | 60px   | setupGraph.js:nodeSizes.user                     | nodeRendering.test.js:NodeSizes       |
      | Image         | 160px  | setupGraph.js:nodeSizes.image                    | nodeRendering.test.js:NodeSizes       |
      | Attribute     | 30px   | setupGraph.js:nodeSizes.attribute                | nodeRendering.test.js:NodeSizes       |
    And the graph should use force-directed layout with:
      | Force Type     | Implementation                                    | Test Coverage                          |
      | Link          | setupGraph.js:forceConfig.strength                | setupGraph.test.js:ForceParameters    |
      | Charge        | setupGraph.js:forceConfig.charge                  | setupGraph.test.js:ForceParameters    |
      | Center        | setupGraph.js:forceConfig.center                  | setupGraph.test.js:ForceParameters    |
    # Force configuration in setupGraph.js:setupForces
    # Theme handling in styles.js:applyStyles
    # Test mocks in __mocks__/modules/forceMock.js

  @implemented @file:src/lib/d3/setupGraph.js @file:src/lib/d3/styles.js @test:setupGraph.test.js
  Scenario: Theme-Aware Styling
    Given nodes are displayed in the graph
    Then each node type should use theme-specific colors:
      | Node Type      | Dark Theme                | Light Theme               | Test Coverage                |
      | Image         | nodeFill: '#374151'       | nodeFill: '#F3F4F6'      | setupGraph.test.js:Styling  |
      | User          | userNode: '#60A5FA'       | userNode: '#2563EB'      | setupGraph.test.js:Styling  |
      | Attribute     | attributeNode: '#9CA3AF'  | attributeNode: '#4B5563' | setupGraph.test.js:Styling  |
    And edges should use theme colors:
      | Theme         | Color                    | Implementation            | Test Coverage                |
      | Dark         | linkStroke: '#6B7280'    | setupGraph.js:colors     | setupGraph.test.js:Styling  |
      | Light        | linkStroke: '#9CA3AF'    | setupGraph.js:colors     | setupGraph.test.js:Styling  |
    # Theme colors defined in setupGraph.js:setupGraph
    # Style application in styles.js:applyStyles
    # Theme tests in setupGraph.test.js

  @implemented @file:src/lib/d3/interactions/hover.js @file:src/lib/d3/interactions/detailsView.js @test:hover.test.js
  Scenario: Node Selection and Details
    Given I am viewing the graph visualization
    When I hover over a node
    Then connected nodes and edges should be highlighted
    And other elements should be visually de-emphasized
    And I should see:
      | Element        | Description              | Implementation                               | Test Coverage                |
      | Tooltip       | Node details on hover    | hover.js:setupHoverInteractions             | hover.test.js:Interactions  |
      | Details Button| For image nodes         | detailsView.js:setupDetailsViewInteractions | hover.test.js:DetailsView   |
    When I click the Details button
    Then I should see a detailed view with:
      | Element        | Implementation                               | Test Coverage                     |
      | Full Image    | detailsView.js:enterDetailsView             | hover.test.js:DetailsView        |
      | Title         | detailsView.js:createDetailsContainer       | hover.test.js:DetailsContainer   |
      | Description   | detailsView.js:setupDetailsContent          | hover.test.js:DetailsContent     |
    # State management in hover.js:nodeStates
    # Event handling in detailsView.js
    # Integration tests in integration.test.js

  @implemented @file:src/lib/d3/viewportManager.js @test:viewport.test.js
  Scenario: Interactive Navigation
    Given I am viewing the graph visualization
    When I interact with the graph
    Then I should be able to:
      | Action         | Implementation                               | Configuration              | Test Coverage                |
      | Pan           | viewportManager.js:handleZoom               | translateExtent config     | viewport.test.js:Pan        |
      | Zoom          | viewportManager.js:zoom                     | scaleExtent: [0.1, 4]     | viewport.test.js:Zoom       |
      | Center        | viewportManager.js:centerOnNode             | duration: 750ms           | viewport.test.js:Center     |
    And the interactions should maintain:
      | Feature        | Implementation                               | Test Coverage                     |
      | Bounds        | viewportManager.js:translateExtent          | viewport.test.js:Bounds          |
      | Smoothness    | viewportManager.js:transition               | viewport.test.js:Transitions     |
      | State         | viewportManager.js:getState                 | viewport.test.js:State           |
    # Viewport management in viewportManager.js
    # Transition configuration in setupGraph.js:transitionConfig
    # Integration tests in integration.test.js

  @future @file:src/lib/d3/filters
  Scenario: Graph Filtering
    Given I am viewing the graph visualization
    When I use the filtering controls
    Then I should be able to filter the graph by:
      | Filter Type    | Description                  |
      | Upload Date   | Time period filtering        |
      | User          | User-specific content        |
      | Attribute Type| Attribute category           |
    And the graph should update to reflect the filtered view
    And non-matching elements should be visually de-emphasized
    # Planned for future implementation