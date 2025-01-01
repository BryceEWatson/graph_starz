Feature: Enhanced Image Analysis Prompting
  As a Graph Starz developer
  I want to improve the image analysis prompting system
  So that we get more consistent and atomic attributes from the LLM

  Background:
    Given the image analyzer uses Claude 3 Sonnet
    And we have a defined set of attribute categories in imageAnalyzer.js
    And we want to maintain atomic attributes for better graph relationships

  Scenario: Analyzing an image with atomic attributes
    Given an image is uploaded to the system
    When the image analyzer processes the image
    Then it should extract atomic attributes using the following prompt structure:
      """
      Analyze this image focusing on specific, atomic details. For each element you identify:
      1. Use the most specific term possible (e.g., "crimson" instead of just "red")
      2. Consider the element's prominence in the image
      3. Focus on observable characteristics rather than interpretations

      For each attribute you identify, explain:
      - Why you chose this specific term
      - Where in the image this attribute is observed
      - How prominent or significant this element is
      """
    And the response should be structured according to the schema in imageAnalyzer.js

  Scenario: Extracting consistent color attributes
    Given an image contains various colors
    When the image analyzer identifies colors
    Then it should:
      | Action                           | Example                               |
      | Use specific color terms         | "crimson" instead of "dark red"      |
      | Note color prominence           | "crimson (primary color, 40% of image)" |
      | Identify color relationships    | "crimson appears in sunset sky"       |
    And maintain consistency with the predefined color enum in the schema

  Scenario: Identifying artistic techniques
    Given an image shows specific artistic techniques
    When the image analyzer identifies techniques
    Then it should:
      | Action                           | Example                               |
      | Identify primary technique      | "digital_painting"                    |
      | Note specific applications      | "digital_painting in character design"|
      | Describe technical elements     | "brush stroke patterns in background" |
    And maintain consistency with the technique enum in the schema

  Scenario: Extracting compositional elements
    Given an image has distinct compositional elements
    When the image analyzer identifies composition
    Then it should:
      | Action                           | Example                               |
      | Identify specific patterns      | "rule_of_thirds in subject placement" |
      | Note spatial relationships      | "leading_lines from bottom to center" |
      | Describe visual flow           | "radial composition from central point"|
    And maintain consistency with the composition enum in the schema

  Scenario: Creating HAS_ATTRIBUTE relationships with context
    Given an image has been analyzed
    When creating relationships in Neo4j
    Then each HAS_ATTRIBUTE relationship should include:
      | Property    | Description                                    | Example                                        |
      | context    | Where/how the attribute appears                | "Crimson appears in the sunset sky"            |
      | prominence | How significant the attribute is (0-1)         | 0.8                                           |
      | reasoning  | Why this specific attribute was chosen         | "The deep red hue matches crimson precisely"   |
      | timestamp  | When the attribute was identified              | "2024-12-31T09:47:41-08:00"                   |

  Scenario: Querying images by attribute context
    Given multiple images share the same attribute
    When querying for images with a specific attribute
    Then we can filter by:
      | Filter                 | Example Query                                          |
      | Prominence threshold   | "Find images where 'crimson' has prominence > 0.7"    |
      | Context contains      | "Find images where 'crimson' appears in the sky"      |
      | Multiple attributes   | "Find images with prominent 'crimson' AND 'sunset'"   |

  Implementation Notes:
    1. Schema Updates (imageAnalyzer.js):
       ```javascript
       attributes: {
         type: 'array',
         items: {
           type: 'object',
           properties: {
             category: {
               type: 'string',
               enum: ['style', 'color', 'mood', 'technique', 'object', 'composition']
             },
             value: {
               type: 'string',
               description: 'The most specific, atomic value possible'
             },
             context: {
               type: 'string',
               description: 'Where and how this attribute appears in the image'
             },
             prominence: {
               type: 'number',
               minimum: 0,
               maximum: 1,
               description: 'How prominent this attribute is in the image (0-1)'
             },
             reasoning: {
               type: 'string',
               description: 'Why this specific term was chosen'
             }
           }
         }
       }
       ```

    2. Neo4j Relationship Properties:
       ```cypher
       CREATE (img:Image)-[r:HAS_ATTRIBUTE {
         context: "Crimson appears in the sunset sky",
         prominence: 0.8,
         reasoning: "The deep red hue matches crimson precisely",
         timestamp: datetime()
       }]->(attr:Attribute {
         type: "color",
         value: "crimson"
       })
       ```

    3. Example Queries:
       ```cypher
       // Find images with prominent crimson in the sky
       MATCH (img:Image)-[r:HAS_ATTRIBUTE]->(attr:Attribute)
       WHERE attr.value = 'crimson'
         AND r.prominence > 0.7
         AND r.context CONTAINS 'sky'
       RETURN img

       // Find similar images through shared attributes with similar contexts
       MATCH (img1:Image)-[r1:HAS_ATTRIBUTE]->(attr:Attribute)<-[r2:HAS_ATTRIBUTE]-(img2:Image)
       WHERE r1.context CONTAINS 'sky'
         AND r2.context CONTAINS 'sky'
         AND r1.prominence > 0.5
         AND r2.prominence > 0.5
       RETURN img1, img2
       ```

    4. Future Enhancements:
       - Add support for attribute confidence scores
       - Add support for user-defined attribute categories
       - Improve context similarity matching
