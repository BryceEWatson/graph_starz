# Graph Starz Product Feature List

## Overview
Graph Starz is a graph-based image upload and sharing platform that leverages AI understanding to create a coherent global graph of interconnected images, users, and the attributes that define them.

---

## Implemented Features

### 1. User Authentication and Access Management

#### Google Sign-In Integration
- Seamless OAuth authentication with Google accounts
- Session persistence across page refreshes
- Automatic session management with NextAuth.js
- Secure callback handling and redirect flows

#### Early Access and Whitelist System
- Request early access workflow for new users
- User profile creation in Neo4j upon first request
- Whitelist-based access control to protected features
- Pending status display for users awaiting approval
- Admin tools for managing whitelist requests via Neo4j queries

#### User Database Integration
- Automatic user node creation in Neo4j on first sign-in
- Storage of Google profile data (name, email, avatar, provider ID)
- User lookup and session management
- Relationship tracking between users and uploaded images

---

### 2. Interactive Graph Visualization

#### Dynamic Graph Rendering
- D3.js-powered force-directed graph layout
- Interactive visualization of images, users, and attributes
- Responsive design adapting to client dimensions
- Real-time node and edge rendering

#### Node Display and Theming
- **Image Nodes**: Display actual image thumbnails using SVG patterns
- **User Nodes**: Distinct visual styling for user accounts
- **Attribute Nodes**: Visual representation of shared characteristics
- Theme-specific color schemes for light and dark modes
- High contrast and readability in both themes

#### Interactive Navigation
- Pan and zoom functionality with D3 zoom behaviors
- Constrained zoom levels (0.5x to 2x) for optimal viewing
- Drag-and-drop node positioning
- Smooth transitions and animations
- Readability maintenance at all zoom levels

#### Node Selection and Details
- Hover interactions with visual highlighting
- Selected node emphasis with connected node highlighting
- Non-connected nodes fade for focus
- Detailed image view modal with:
  - High-resolution image display
  - Title and description
  - Full attribute information
- Exit details view via Escape key or background click
- Single-selection mode (deselect before selecting another)

#### Edge Visualization
- Visual connections showing UPLOADED and HAS_ATTRIBUTE relationships
- Edge thickness reflecting relationship strength
- Theme-aware link colors and opacity
- Clear relationship traceability

---

### 3. Image Upload Workflow with AI Analysis

#### Secure Image Upload
- File validation and format checking
- User authorization verification against Neo4j database
- Multi-stage upload processing pipeline
- Comprehensive error handling and recovery

#### Image Processing
- Automatic conversion to WebP format for optimal web performance
- Three size variants generated while maintaining aspect ratio:
  - **Thumbnail**: 100px width (graph view)
  - **Preview**: 400px width (preview display)
  - **Full Size**: 2048px width (detailed viewing)
- Perceptual hash generation for duplicate detection
- Aspect ratio preservation across all variants

#### Duplicate Detection
- Perceptual hash-based similarity checking
- Prevention of duplicate image uploads
- 409 Conflict response with existing image reference
- Protection against content redundancy

#### Google Cloud Storage Integration
- Automated upload of all image variants to GCS
- Public URL generation for each size variant
- Bucket-based organization and management
- Secure credential handling

#### AI-Powered Image Analysis
- Integration with Anthropic Claude 3 Sonnet
- Automatic extraction of image attributes:
  - **Title**: Descriptive title generation
  - **Description**: Detailed content description
  - **Visual Style**: Artistic style and techniques
  - **Objects**: Key elements and subjects
  - **Colors**: Dominant color palette identification
  - **Mood**: Emotional qualities and atmosphere
  - **Composition**: Structural elements and patterns
  - **Technique**: Technical approaches and methods

#### Enhanced Attribute Analysis
- Atomic attribute extraction with specific terminology
- Context-aware attribute identification
- Prominence scoring (0-1 scale) for each attribute
- Reasoning documentation for attribute selection
- Relationship properties including:
  - Context: Where/how attribute appears
  - Prominence: Significance level
  - Reasoning: Justification for attribute
  - Timestamp: When identified

#### Neo4j Graph Integration
- Image node creation with metadata and URLs
- Attribute node creation with categorization
- HAS_ATTRIBUTE relationship creation with rich properties
- UPLOADED relationship linking users to images
- Graph structure maintenance and optimization

#### Error Handling
- Unauthorized access prevention (401 responses)
- Invalid file format rejection (400 responses)
- Processing failure recovery (500 responses)
- Detailed error messages for troubleshooting
- Graceful degradation on service failures

---

### 4. Production Deployment and Environment Management

#### Automated Deployment Pipeline
- PowerShell-based deployment script for Google Cloud Run
- Docker image build automation
- Multi-stage Docker builds for optimization
- Image versioning with timestamp-based tags
- Automatic backup creation before deployment

#### Secret and Configuration Validation
- Pre-deployment secret verification
- Required environment variables:
  - Neo4j connection credentials (URI, user, password)
  - Google OAuth credentials (client ID, secret, callback URL)
  - Anthropic API key
  - GCS bucket configuration
  - NextAuth secret and frontend URL
- Service account permission validation
- Type safety enforcement for configuration

#### Container Optimization
- Multi-stage Docker builds for minimal image size
- Dependency caching optimization
- Build-time vs runtime environment separation
- Security-focused secret handling
- Directory structure validation

#### Deployment Management
- Zero-downtime deployment strategy
- Previous version preservation as backup
- Health check validation post-deployment
- Image cleanup after successful deployment
- Version control and rollback capability

#### Runtime Configuration
- Environment variable loading and validation
- API key verification at startup
- Database and service connection testing
- Initialization endpoint for system verification
- Graceful failure on invalid configuration

---

### 5. Theming and UI Enhancements

#### Theme Management
- Server-side rendering (SSR) compatible theme system
- Light and dark theme support
- Theme toggle functionality in navigation
- Persistent theme preferences
- Theme-specific color schemes for graph elements

#### UI Components
- Modern, responsive navigation bar
- User profile display with avatar
- Sign-in/sign-out controls
- Upload button for whitelisted users
- Clean, accessible interface design

#### Visual Design
- Tailwind CSS-based styling
- Consistent design language
- High contrast for accessibility
- Optimized for performance
- Mobile-responsive layouts

---

### 6. Testing and Code Quality

#### Test-Driven Development
- Jest-based testing framework
- Organized test structure in `__tests__` directories
- Mock implementations in `__mocks__` directories
- Test-first development approach

#### Quality Assurance Tools
- ESLint for code linting
- Syntax checking scripts
- Coverage reporting
- Development workflow scripts

#### Code Quality Guidelines
- KISS (Keep It Simple, Stupid) principle
- POLA (Principle of Least Astonishment)
- SRP (Single Responsibility Principle)
- DRY (Don't Repeat Yourself)
- Best practices for Next.js and React

---

### 7. Developer and Operational Tools

#### Development Scripts
- Local development server (`yarn dev`)
- Production build (`yarn build`)
- Production server (`yarn start`)
- Test execution (`yarn test`)
- Code linting (`yarn lint`)

#### Operational Scripts
- Syntax checking utilities
- Secret validation tools
- Database initialization helpers
- Deployment automation
- Environment setup assistance

#### Documentation
- Comprehensive README with setup instructions
- BDD feature specifications
- API documentation in code comments
- Deployment guides
- Environment variable examples

---

## Planned Features (Not Yet Implemented)

### 8. RAG-Enhanced Search System

#### Hybrid Search Architecture
- **Semantic Vector Search**: Natural language query processing with vector embeddings
- **Graph Pattern Matching**: Relationship-based query execution
- **Smart Result Ranking**: Combined scoring from both search approaches
- Vector dimension: 1536 (Claude 3.5 embeddings)

#### Search Capabilities
- Natural language image queries
- Context-aware search results
- Attribute-based filtering
- Relationship pattern discovery
- Similar image finding based on shared attributes

#### Performance Optimizations
- **Redis-based Caching**:
  - 5-minute TTL for search results
  - Query fingerprinting for cache keys
  - Compressed JSON storage
  - 80%+ target hit rate
- **Dynamic Vector Updates**: Automatic re-vectorization on metadata changes
- **Cache Invalidation**: Smart cache clearing on relevant updates

#### Result Quality
- Match score display (0.0-1.0 similarity)
- Matching attribute highlighting
- Context explanation for matches
- Image preview in results
- Relevance-based sorting with configurable weights:
  - Vector similarity: 60%
  - Graph relevance: 30%
  - Recency: 10%

#### Search Components
- Query vectorization with Claude 3.5
- Similarity search in vector store
- Graph pattern extraction and traversal
- Result merging and normalization
- Personalization factors

#### Error Handling
- Invalid query validation (400 responses)
- Vector search failure recovery (500 responses)
- Graph database timeout handling (503 responses)
- Detailed error logging
- User-friendly error messages

#### Testing and Evaluation
- Synthetic test data generation
- Automated quality metrics:
  - Precision@10 > 0.7
  - Recall@20 > 0.8
  - NDCG@10 > 0.8
  - Mean Reciprocal Rank > 0.7
- Performance benchmarks:
  - <200ms latency without cache
  - <50ms latency on cache hit
- CI/CD integration for continuous evaluation

---

### 9. Enhanced Spiral Graph Layout

#### User-Centric Spiral Arrangement
- Archimedean spiral layout for images around user nodes
- Formula: r = a + bθ
- Base radius: 250px (configurable via forceConfig)
- Growth rate: 20px per revolution
- Angular step: 2π / max(8, numImages)
- Consistent spacing between images
- Scalable for large image collections (1000+ images)

#### Dynamic Bounding Circles
- User-specific subgraph boundaries
- Dynamic radius based on spiral extent
- Collision prevention between user subgraphs
- Theme-aware visual styling
- Zoom-adaptive collision forces

#### Attribute Node Positioning
- Force-based positioning near connected images
- Balance between multiple image connections
- Collision detection with configured node sizes
- Type-based clustering for similar attributes
- Link force strength configuration

#### Edge Bundling
- Hierarchical edge bundling for visual clarity
- Reduced clutter for many connections
- Theme-specific edge colors
- Integration with hover state highlighting
- Smooth updates during interactions
- Preserved edge traceability

#### Enhanced Zoom and Pan
- Spiral structure preservation during zoom
- Text visibility optimization at different scales
- 60fps interactive performance target
- Smooth transitions using existing configuration
- Interactive at all zoom levels

#### Performance Targets
- Smooth rendering with 1000+ images per user
- 60fps interaction responsiveness
- Edge bundling calculation under 100ms
- Layout stabilization within 2 seconds
- Optimized rendering at different zoom scales

---

### 10. Enhanced Image Upload with Real-time Progress

#### Upload History Display
- Chronological list of all user uploads
- Collapsible upload records for space efficiency
- Status indicators with icons:
  - [WAIT]: Queued for processing
  - [>]: Currently processing
  - [OK]: Successfully completed
  - [TEMP]: Unpublished (private visibility)
  - [PUB]: Published (public visibility)
  - [!]: Error state
- Sortable by upload timestamp (newest first)
- Expandable details for each upload

#### WebSocket Progress Updates
- Real-time connection for upload status
- Checkpoint-based progress tracking
- Current operation details
- Overall completion percentage
- Status change notifications:
  - WAIT → IN_PROGRESS → COMPLETE
  - Error state handling

#### Enhanced Image Node Management
- Immediate node creation on upload start
- Initial visibility set to 'private'
- Metadata storage (size, name, dimensions)
- UPLOADED_BY relationship creation
- Private images excluded from public searches

#### Detailed Progress Tracking
- **Format Conversion**: Web-optimization progress
- **Variant Generation**: Progress for each size (160px, 400px, 2048px)
- **Hash Calculation**: Perceptual hash generation status
- **AI Analysis**: Attribute extraction progress
- **Storage**: Cloud upload completion

#### Upload Record Details
- File information (name, size, format, dimensions)
- Processing timeline visualization
- Generated preview display (when available)
- AI-detected attributes grouped by category
- Publication controls
- Error details (if applicable)

#### Publication Workflow
- Review generated attributes before publishing
- One-click publish action with confirmation
- Visibility state change (private → public)
- Publication timestamp tracking
- Success confirmation messaging
- Continued history retention

#### Error Recovery
- Visual error indicators ([!] icon)
- Auto-expansion of records with errors
- Detailed error descriptions
- Cancel operation option
- Record retention for review
- Clear error context for troubleshooting

#### User Experience Enhancements
- Immediate feedback (< 100ms for file selection)
- Real-time status updates via WebSocket
- Preview generation under 2 seconds
- Instant error reporting
- Smooth record expansion (< 50ms)
- Time elapsed and estimated remaining display

---

### 11. Graph Filtering

#### Filter Types
- **Upload Date**: Time-based filtering for specific periods
- **User**: Show images by specific users
- **Attribute Type**: Filter by attribute categories
- **Attribute Value**: Filter by specific attribute values

#### Visual Feedback
- Real-time graph updates reflecting filters
- Visual de-emphasis of non-matching elements
- Smooth transitions between filter states
- Clear indication of active filters

#### Filter Controls
- User-friendly filter interface
- Multiple filter combination support
- Filter reset functionality
- Filter state persistence

---

## Technical Foundation

### Core Technologies
- **Frontend**: Next.js 14, React 18, D3.js
- **Backend**: Node.js, NextAuth.js
- **Database**: Neo4j (graph database)
- **Storage**: Google Cloud Storage
- **AI**: Anthropic Claude 3 Sonnet
- **Styling**: Tailwind CSS
- **Container**: Docker
- **Deployment**: Google Cloud Run
- **Testing**: Jest

### Data Structure
- **User Nodes**: id, email, name, image, isWhitelisted, createdAt
- **Image Nodes**: id, title, description, url variants (thumbnail, preview, full), width, height, pHash, createdAt
- **Attribute Nodes**: id, type, value, confidence (with relationship context, prominence, reasoning)

### Relationships
- **UPLOADED**: (User)-[timestamp]->(Image)
- **HAS_ATTRIBUTE**: (Image)-[context, prominence, reasoning, timestamp]->(Attribute)

---

## Implementation Timeline

### Phase 1: RAG Search Foundation
- Vector store implementation
- Query vectorization
- Basic semantic search

### Phase 2: Graph Pattern Matching
- Pattern extraction from queries
- Neo4j traversal optimization
- Path scoring algorithm

### Phase 3: Hybrid Search Integration
- Result merging logic
- Score normalization
- Ranking algorithm

### Phase 4: Search Performance Optimization
- Redis cache implementation
- Dynamic vector updates
- Performance benchmarking

### Phase 5: Enhanced Upload Experience
- WebSocket infrastructure
- Progress tracking system
- Upload history UI

### Phase 6: Graph Layout Improvements
- Spiral layout algorithm
- Bounding circle implementation
- Edge bundling
- Performance optimization

### Phase 7: Filtering and Discovery
- Filter UI implementation
- Graph filtering logic
- Filter state management

---

## Success Metrics

### Performance Targets
- Page load time: < 2 seconds
- Graph rendering: < 1 second for 100 nodes
- Image upload processing: < 10 seconds per image
- Search response time: < 200ms (uncached), < 50ms (cached)
- Graph interaction: 60fps

### Quality Targets
- Test coverage: > 90% for critical paths
- Search precision@10: > 0.7
- Search recall@20: > 0.8
- Uptime: 99.9% availability
- Error rate: < 0.1%

### User Experience
- Intuitive navigation and discovery
- Clear visual feedback for all actions
- Accessible design for all users
- Responsive across devices
- Fast, smooth interactions
