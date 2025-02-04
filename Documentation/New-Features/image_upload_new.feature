Feature: Enhanced Image Upload with Real-time Progress
  As a user
  I want to upload images with real-time progress updates and manage my upload history
  So that I can track multiple uploads and their status effectively

  Background:
    Given I am signed in with my Google account
    And my user profile exists in Neo4j
    And I have one or more image files to upload
    # Auth implemented in src/app/api/auth/[...nextauth]/options.js

  @ui @new
  Scenario: Upload History Display
    Given I am on the upload page
    Then I should see a list of my previous uploads
    And each upload record should:
      | Element            | Description                                          |
      | Header            | Show file name and upload timestamp                  |
      | Status            | Display current state with icon ([WAIT], [>], etc.)  |
      | Progress          | Show overall progress percentage                     |
      | Controls          | Provide expand/collapse and cancel buttons           |
    And upload records should be collapsible for space efficiency
    And records should be sorted by upload timestamp descending

  @ui @new
  Scenario: Upload Record Details
    Given I have an upload record
    When I expand the record
    Then I should see:
      | Section           | Details Shown                                        |
      | File Info        | Name, size, format, dimensions                      |
      | Progress         | Current checkpoint and operation                     |
      | Preview          | Generated image variants when available             |
      | Attributes       | AI-generated attributes by category                  |
      | Controls         | Action buttons (retry, cancel, publish)             |
    And the record should maintain its expanded state until manually collapsed

  @websocket @new
  Scenario: WebSocket Connection for Upload Progress
    Given I am on the upload page
    When I connect to the upload progress WebSocket
    Then I should receive a successful connection confirmation
    And the connection should remain open for status updates
    And status updates should include:
      | Field             | Purpose                                              |
      | Checkpoint       | Current processing stage                            |
      | Status          | WAIT, IN_PROGRESS, COMPLETE, or ERROR               |
      | Progress        | Overall completion percentage                        |
      | Operation       | Current operation details                           |

  @record @new
  Scenario: Image Node Creation with Visibility
    Given I have selected an image file
    When the upload process begins
    Then the system should:
      | Step              | Description                                          |
      | Create Node      | Create image node with initial state                |
      | Set Visibility   | Set visibility to 'private'                        |
      | Store Metadata   | Save file size and name                            |
      | Link to User     | Create UPLOADED_BY relationship                     |
    And the image should not appear in public searches
    And the upload record should appear in my history immediately

  @processing @new
  Scenario: Image Processing with Progress Updates
    Given I have created an image node
    When the image processing begins
    Then I should see real-time updates for:
      | Stage             | Visual Indicator                                     |
      | Format           | Converting to web-optimized format                  |
      | Thumbnail        | Creating 160px variant                             |
      | Preview          | Creating 400px variant                             |
      | Full            | Creating 2048px variant                            |
      | Hash            | Calculating perceptual hash                        |
    And each stage should show:
      | Element           | Description                                         |
      | Status Icon      | Visual indicator of current state                  |
      | Progress Bar     | Percentage complete for current operation          |
      | Operation Name   | Clear description of current task                  |
      | Preview         | Image preview when available                       |

  @analysis @new
  Scenario: AI Analysis with Existing Categories
    Given image processing is complete
    When the AI analysis begins
    Then the system should analyze using standard categories:
      | Category         | Examples                                            |
      | Title           | "Sunset over mountains"                            |
      | Description     | "A vibrant landscape photograph..."                |
      | Style           | "Photorealistic, Long Exposure"                    |
      | Objects         | "Mountains, Sun, Clouds"                           |
      | Colors          | "Orange, Purple, Blue"                             |
      | Mood            | "Peaceful, Serene"                                 |
    And results should be displayed in an expandable section
    And each attribute should show its category and value

  @publishing @new
  Scenario: Image Publication State Change
    Given the image processing and analysis is complete
    When I click the "Publish" button
    Then the system should:
      | Step              | Visual Indicator                                     |
      | Confirm          | Show confirmation dialog                            |
      | Update State     | Change status icon from [TEMP] to [PUB]            |
      | Set Time        | Display publication timestamp                       |
      | Update Access    | Make image visible in public searches              |
    And I should see a success message
    And the record should remain in my upload history

  @error @new
  Scenario: Error Recovery with Progress
    Given an error occurs during any stage
    When the error is detected
    Then the system should:
      | Action            | Visual Indicator                                     |
      | Show Error       | Display error message with [!] icon                 |
      | Update Status    | Change status to ERROR state                       |
      | Offer Retry      | Show retry button for failed operation             |
      | Keep History     | Maintain record in upload history                  |
    And I should be able to retry from the failed stage
    And previous successful stages should not be repeated
    And the record should stay expanded to show error details