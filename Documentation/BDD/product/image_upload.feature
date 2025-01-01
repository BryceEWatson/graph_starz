Feature: Image Upload and AI Analysis
  As a user
  I want to upload images and have them automatically analyzed
  So that they can be properly integrated into the platform's graph structure

  Background:
    Given I am signed in with my Google account
    And my user profile is automatically created in Neo4j during first sign-in
    And I have an image file to upload
    # Auth implemented in src/app/api/auth/[...nextauth]/options.js

  @implemented @file:src/lib/neo4j/userRepository.js
  Scenario: First-Time User Sign In
    Given I sign in with Google for the first time
    Then the system should:
      | Step                | Description                                          | Implementation                        |
      | Profile Creation   | Create Neo4j user node with Google profile data     | ensureUserExists() in userRepository  |
      | Data Storage      | Store name, email, and provider ID                  | Neo4j User node properties            |
      | Session Setup     | Initialize user session with proper IDs             | getServerSession() in upload route    |
    And subsequent sign-ins should use the existing Neo4j profile
    # User verification in src/app/api/images/upload/route.js

  @implemented @file:src/app/api/images/upload/route.js
  Scenario: Successful Image Upload
    When I upload an image file
    Then the system should:
      | Step                | Description                                    | Implementation                        |
      | Verify User        | Confirm user exists in Neo4j database         | findUserById() in userRepository      |
      | Process Image      | Generate different size variants              | processImage() in imageProcessor      |
      | Generate Hash      | Create perceptual hash for duplicate check    | Sharp in imageProcessor              |
      | Check Duplicates   | Verify image hasn't been uploaded before      | findSimilarImage() in imageRepository |
      | Analyze Content    | Use Anthropic to analyze image content        | analyzeImage() in imageAnalyzer      |
      | Store Image        | Save image variants to cloud storage          | uploadToGCS() in gcs.js              |
      | Save Metadata      | Store analysis results in Neo4j database      | saveImageData() in imageRepository    |
    And I should receive a success response with the image ID and metadata
    # Upload flow in src/app/api/images/upload/route.js

  @implemented @file:src/lib/storage/imageProcessor.js
  Scenario: WebP Image Conversion
    Given I have uploaded an image file
    When the backend processes the image
    Then it should convert the image to WebP format
    And generate 3 sizes while maintaining aspect ratio:
      | Size          | Width  | Height Calculation |
      | Thumbnail     | 100px  | Maintain Ratio     |
      | Preview       | 400px  | Maintain Ratio     |
      | Full Size     | 2048px | Maintain Ratio     |

  @implemented @file:src/lib/storage/gcs.js
  Scenario: Google Cloud Storage Upload
    Given the system has generated WebP images
    When uploading to Google Cloud Storage
    Then it should:
      | Step                  | Description                               |
      | Upload All Sizes      | Upload thumbnail, preview, and full size |
      | Generate URLs         | Create public URLs for each size         |
      | Prepare DB Package    | Combine URLs and metadata for storage    |

  @implemented @file:src/lib/neo4j/imageRepository.js
  Scenario: Neo4j Image Data Storage
    Given the images are uploaded to GCS
    And the AI analysis is complete
    When saving to Neo4j
    Then the system should:
      | Step                | Implementation                             |
      | Create Image Node   | Save URLs and metadata                    |
      | Link Attributes     | Create attribute nodes and relationships  |
      | User Association    | Link image to user who uploaded it        |

  @implemented @file:src/app/api/images/upload/route.js
  Scenario: Unauthorized Upload Attempt
    Given I try to upload an image
    When my user profile is not found in Neo4j
    Then I should receive a 401 Unauthorized response
    And the response should include an error message
    # Error handling in upload route POST handler

  @implemented @file:src/lib/neo4j/imageRepository.js
  Scenario: Duplicate Image Detection
    Given I try to upload an image
    When the image matches an existing image's perceptual hash
    Then I should receive a 409 Conflict response
    And the response should include:
      | Field              | Description                                    | Implementation                        |
      | Error Message     | Indication that image is a duplicate          | findSimilarImage() response           |
      | Existing Image ID | Reference to the matching image               | Returned from findSimilarImage()      |
    # Duplicate detection in findSimilarImage()

  @implemented @file:src/lib/image/imageAnalyzer.js
  Scenario: Image Analysis
    When an image is being analyzed
    Then the Anthropic API should identify:
      | Attribute Type     | Description                                    | Implementation                        |
      | Title             | Descriptive title for the image               | Anthropic API response parsing        |
      | Description       | Detailed description of content               | Anthropic API response parsing        |
      | Visual Style      | Artistic style and techniques                 | Anthropic API response parsing        |
      | Objects           | Key objects and elements present              | Anthropic API response parsing        |
      | Colors            | Dominant color palette                        | Anthropic API response parsing        |
      | Mood              | Emotional qualities and atmosphere            | Anthropic API response parsing        |
    And each attribute should be normalized and saved to Neo4j
    # Analysis in imageAnalyzer.js using Anthropic API

  @implemented @file:src/app/api/images/upload/route.js
  Scenario: Failed Upload Handling
    Given I attempt to upload an image
    When an error occurs during:
      | Process              | Error Handler                                  | Status Code |
      | User Verification   | Session and findUserById validation           | 401         |
      | Image Processing    | processImage error handling                   | 400         |
      | Cloud Storage       | uploadToGCS error handling                    | 500         |
      | AI Analysis        | analyzeImage error handling                   | 500         |
      | Database Storage    | saveImageData error handling                  | 500         |
    Then I should receive an appropriate error response with details
    # Error handling in upload route try-catch block
