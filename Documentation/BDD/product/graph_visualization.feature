Feature: Graph Visualization
  As a user
  I want to visualize the global graph of interconnected images, users, and attributes
  So that I can discover relationships and patterns across the entire platform

  Background:
    Given I am signed in to the application
    And I have uploaded multiple images
    And I am viewing the graph visualization

  Scenario: Graph Display
    Given the graph visualization is loaded
    Then I should see:
      | Element            | Description                                    |
      | Image Nodes       | Actual images displayed as nodes               |
      | User Nodes        | Users who uploaded images                      |
      | Attribute Nodes   | Nodes representing shared attributes           |
      | Preview           | Full image preview on hover                    |
      | Edges             | Lines showing upload and attribute connections |
      | Labels            | Text showing node types and values            |
    And image nodes should display their thumbnails
    And user nodes should show profile pictures or initials
    And the graph should be rendered using D3.js
    And the visualization should be responsive to screen size

  Scenario: Node Properties
    Given nodes are displayed in the graph
    Then each node type should show relevant properties:
      | Node Type         | Properties                                     |
      | Image            | Title, dimensions, upload date                 |
      | User             | Name, join date                               |
      | Attribute        | Type, value, confidence score                 |
    And properties should be visible on hover or selection
    And confidence scores should be reflected in edge thickness

  Scenario: Image Relationships
    Given multiple images are displayed in the graph
    Then images should be connected through:
      | Connection Type    | Description                                    |
      | User Upload       | UPLOADED relationship to user                  |
      | Attributes        | HAS_ATTRIBUTE relationship to attributes       |
    And attribute nodes should be categorized by type:
      | Attribute Type    | Examples                                       |
      | Style            | Impressionist, modern                          |
      | Color            | Blue, green                                    |
      | Mood             | Peaceful, energetic                            |
      | Composition      | Rule of thirds                                 |
      | Technique        | Oil painting                                   |
      | Objects          | Tree, mountain                                 |
    And attribute nodes should be visually distinct by type
    And connections should show relationship types

  Scenario: Interactive Navigation
    Given I am viewing the graph visualization
    When I interact with the graph
    Then I should be able to:
      | Action             | Description                                    |
      | Pan               | Move the view around the graph                |
      | Zoom              | Adjust the zoom level                         |
      | Drag Nodes        | Reposition nodes                             |
      | Select Nodes      | Focus on specific nodes and their connections|
      | Hover             | View node properties and metadata            |
    And the interactions should be smooth and responsive
    And the graph should maintain a readable layout

  Scenario: Graph Filtering
    Given I am viewing the graph visualization
    When I use the filtering controls
    Then I should be able to filter by:
      | Filter Type        | Description                                    |
      | Upload Date       | Images from specific time periods             |
      | User              | Images uploaded by specific users             |
      | Attribute Type    | Specific types of attributes                  |
      | Attribute Value   | Specific attribute values                     |
      | Confidence Score  | Minimum confidence threshold                  |
    And the graph should update dynamically to show:
      | Display Element    | Description                                    |
      | Filtered Images   | Images matching selected criteria             |
      | Related Users     | Users who uploaded matching images            |
      | Attribute Nodes   | Related attributes for filtered images        |
      | Connections       | All relevant relationships                    |
    And non-matching elements should be visually de-emphasized
