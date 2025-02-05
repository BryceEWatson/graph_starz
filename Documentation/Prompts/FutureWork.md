# Prompt: Identify suitable areas for RAG (Retrieval-Augmented Generation)

Today I'd like you start by reading the following files fully, in this order:
1. @index.yml 
2. @image_upload.feature
3. @image_analysis_prompting.feature
4. @graph_visualization.feature

Then please reiterate the main functionality of the application, so that we can brainstorm potential RAG use cases that would improve the user experience.

---

Let's try to be more specific and explain exactly how the RAG functionality would work within the existing application.

# Prompt: Create new feature documentation for RAG additions

Today I'd like you start by reading the following files fully, in this order:
1. @index.yml 
2. @image_upload.feature
3. @image_analysis_prompting.feature
4. @graph_visualization.feature

Then please review these raw notes on our new RAG functionality:
"""
- RAG system for graphstarz:
      - Add image text data into RAG, chunked by image.
      - Title, description, and attributes all vectorized and included in image chunks.
      - Add semantic search feature:
          - Vectorize the user's plain text query and search the RAG vector database for relevant image chunks.
      - Integrate graph query-based search:
          - Combine graph query-based and vector-based search to improve result accuracy.
      - Enrich metadata in vectors:
          - Include additional metadata (upload time, user ID) for more contextualized retrieval.
      - Dynamic updating and caching:
          - Update vector embeddings when image attributes or metadata change.
          - Cache frequent queries to reduce retrieval latency.
      - Personalization and feedback:
          - Incorporate user interaction data to refine search results and recommendations over time.
      - Robust logging and error handling:
          - Track and log RAG operations for troubleshooting and performance tuning.
"""

Then please reiterate the main functionality of the application, so that we can create a new feature document in @New-Features.

---

Now, please research on the @Web what the best way to automate some evaluation of this new RAG functionality, then please create a detailed report on this for us to review.
Be sure to stay focused on the functionality already described in @rag_search.feature and the rest of the application.

---

Great, now can we please create a new rag_search.specification file that outlines all of the technical details.

Please remember:
"""
The primary purpose of a .specification file in Behavior-Driven Development (BDD) is to serve as executable documentation that bridges communication between technical and non-technical stakeholders while validating system behavior. Here’s a breakdown of its core functions:
1. Unifying Requirements and Tests
BDD specifications combine human-readable requirements with executable test logic in a single file15.
Written in a structured format like Gherkin (using Given-When-Then syntax), they act as a shared language for developers, testers, and business analysts26.
Example format:
text
Scenario: User account creation
  Given a user is on the registration page
  When valid details are entered
  Then the account is created
2. Enabling Collaboration
Specifications are created collaboratively by the "Three Amigos" (business, development, QA) to ensure alignment on expected outcomes211.
They reduce ambiguity by formalizing examples and edge cases into a ubiquitous language understood by all stakeholders
"""

---

Great, now please add a "Future Work" section to the @README.md file so that highlights our future plans and links to the documentation files.