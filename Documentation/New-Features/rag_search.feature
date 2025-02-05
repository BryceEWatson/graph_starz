Feature: RAG-Enhanced Image Search
  As a user
  I want to search for images using natural language and graph patterns
  So that I can find relevant images based on their content and relationships

  Background:
    Given I am signed in with my Google account
    And there are multiple images stored in the system
    And each image has vectorized attributes in the database
    # Vector storage implemented in src/lib/vector/vectorStore.js

  @implemented @file:src/lib/search/hybridSearch.js
  Scenario: Semantic Search with Natural Language
    Given I am on the search page
    When I enter a natural language query
    Then the system should:
      | Step                | Description                                          | Implementation                        |
      | Query Vectorization | Convert query text to vector embedding              | vectorizeQuery() in vectorStore.js    |
      | Similarity Search   | Find images with similar attribute vectors          | findSimilar() in vectorStore.js       |
      | Result Ranking      | Sort results by similarity score                    | rankResults() in hybridSearch.js      |
    And the results should include:
      | Field              | Description                                          |
      | Image Preview      | Thumbnail version of the matched image              |
      | Match Score        | Similarity score between query and image            |
      | Matching Attributes| Which attributes contributed to the match           |

  @implemented @file:src/lib/search/graphSearch.js
  Scenario: Graph Pattern Search
    Given I am viewing the search results
    When the system processes my query
    Then it should also:
      | Step                | Description                                          | Implementation                        |
      | Pattern Extraction  | Identify graph patterns in the query                | extractPatterns() in graphSearch.js   |
      | Graph Traversal     | Find matching paths in Neo4j                        | findPaths() in graphSearch.js         |
      | Pattern Scoring     | Score results based on path relevance              | scorePaths() in graphSearch.js        |

  @implemented @file:src/lib/search/hybridSearch.js
  Scenario: Hybrid Search Results
    Given both semantic and graph searches are complete
    When combining the results
    Then the system should:
      | Step                | Description                                          | Implementation                        |
      | Result Merging      | Combine vector and graph search results             | mergeResults() in hybridSearch.js     |
      | Score Normalization | Normalize scores from different search methods       | normalizeScores() in hybridSearch.js  |
      | Final Ranking       | Apply personalization and recency factors           | applyFactors() in hybridSearch.js     |
    And the final results should be ordered by combined relevance score

  @implemented @file:src/lib/cache/searchCache.js
  Scenario: Search Result Caching
    Given a search query has been processed
    When the same query is received again within the cache timeout
    Then the system should:
      | Step                | Description                                          | Implementation                        |
      | Cache Check         | Look for existing results in cache                  | checkCache() in searchCache.js        |
      | Cache Hit           | Return cached results if found and fresh            | getCached() in searchCache.js         |
      | Cache Update        | Update cache with new results if needed             | updateCache() in searchCache.js       |

  @implemented @file:src/lib/vector/vectorStore.js
  Scenario: Dynamic Vector Updates
    Given an image's metadata or attributes are updated
    When the changes are saved
    Then the system should:
      | Step                | Description                                          | Implementation                        |
      | Vector Regeneration | Create new vectors for updated attributes           | regenerateVectors() in vectorStore.js |
      | Cache Invalidation  | Clear affected cache entries                        | invalidateCache() in searchCache.js   |
      | Index Update        | Update vector search index                          | updateIndex() in vectorStore.js       |

  @implemented @file:src/lib/search/errorHandler.js
  Scenario: Search Error Handling
    Given a search operation is in progress
    When an error occurs during:
      | Process              | Error Handler                                  | Status Code |
      | Query Vectorization  | handleVectorError() in errorHandler.js        | 400         |
      | Vector Search        | handleSearchError() in errorHandler.js        | 500         |
      | Graph Search         | handleGraphError() in errorHandler.js         | 500         |
      | Cache Operations     | handleCacheError() in errorHandler.js         | 500         |
    Then the system should:
      | Action              | Implementation                                  |
      | Log Error           | logSearchError() in errorHandler.js            |
      | Return Status       | Appropriate HTTP status code                   |
      | Provide Details     | Human-readable error message                   |

  Implementation Notes:
    1. Vector Store Schema:
       ```javascript
       vectorStore: {
         type: "object",
         properties: {
           embedding: {
             type: "array",
             items: { type: "number" }
           },
           metadata: {
             type: "object",
             properties: {
               imageId: { type: "string" },
               timestamp: { type: "string" },
               userId: { type: "string" }
             }
           }
         }
       }
       ```

    2. Neo4j Query Example:
       ```cypher
       MATCH (img:Image)-[r:HAS_ATTRIBUTE]->(attr:Attribute)
       WHERE vector.similarity(attr.embedding, $queryVector) > 0.7
       WITH img, sum(r.prominence * vector.similarity(attr.embedding, $queryVector)) as score
       RETURN img, score
       ORDER BY score DESC
       LIMIT 20
       ```

    3. Cache Structure:
       ```javascript
       cacheEntry: {
         query: string,
         results: Array<SearchResult>,
         timestamp: DateTime,
         ttl: number
       }
       ```

    4. Error Response Format:
       ```javascript
       errorResponse: {
         status: number,
         message: string,
         details: {
           errorType: string,
           errorLocation: string,
           suggestedAction: string
         }
       }
       ```
