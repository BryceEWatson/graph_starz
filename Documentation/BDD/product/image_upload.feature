Feature: Image Upload and AI Analysis
  As a user
  I want to upload images and have them automatically analyzed
  So that they can be properly integrated into the platform's graph structure

  Background:
    Given I am signed in to the application
    And I have an image file to upload

  Scenario: Successful Image Upload
    When I upload an image file
    Then the system should:
      | Step                | Description                                    |
      | Process Image      | Generate different size variants              |
      | Generate Hash      | Create perceptual hash for duplicate detection|
      | Check Duplicates   | Verify image hasn't been uploaded before      |
      | Analyze Content    | Use AI to analyze image content               |
      | Store Image        | Save image variants to cloud storage          |
      | Save Metadata      | Store analysis results in Neo4j database      |
    And I should receive a success response with:
      | Field              | Description                                    |
      | Image ID          | Unique identifier for the uploaded image      |
      | Title             | AI-generated title from analysis              |
      | Is New            | Confirmation this is a new upload             |

  Scenario: Duplicate Image Detection
    Given I try to upload an image
    When the image matches an existing image's perceptual hash
    Then I should receive a 409 Conflict response
    And the response should include:
      | Field              | Description                                    |
      | Error Message     | Indication that image is a duplicate          |
      | Existing Image ID | Reference to the matching image               |

  Scenario: Image Analysis
    When an image is being analyzed
    Then the AI should identify:
      | Attribute Type     | Description                                    |
      | Title             | Descriptive title for the image               |
      | Description       | Detailed description of content               |
      | Visual Style      | Artistic style and techniques                 |
      | Objects           | Key objects and elements present              |
      | Colors            | Dominant color palette                        |
      | Mood              | Emotional qualities and atmosphere            |
      | Composition       | Layout and compositional techniques           |
      | Technique         | Specific artistic or technical methods        |
    And each attribute should have:
      | Property          | Description                                    |
      | Type             | Category of attribute (style, color, etc)      |
      | Value            | Specific attribute value                       |
      | Confidence       | AI confidence score for the attribute          |
    And attributes should be saved as graph nodes with appropriate relationships

  Scenario: Failed Upload Handling
    Given I attempt to upload an image
    When an error occurs during:
      | Process              | Possible Errors                               |
      | Image Processing    | Invalid format, corruption                    |
      | Cloud Storage       | Network issues, storage errors                |
      | AI Analysis        | Service unavailable, timeout                  |
      | Database Storage    | Connection issues, validation errors          |
    Then I should receive a 500 error response
    And the response should include:
      | Field              | Description                                    |
      | Error Message     | User-friendly error description               |
      | Error Details     | Technical details for debugging               |
