# Project Structure

## Directory Structure

The project is structured as follows:

```bash
.
├── Documentation
│   ├── Best_Practices
│   ├── Product
│   │   ├── api_endpoints.md     # API documentation and response formats
│   │   ├── graph_structure.md   # Neo4j database schema
│   │   ├── product_vision.md    # Product vision and goals
│   │   ├── project_structure.md # Project organization
│   │   ├── sign_in_flow.md     # Authentication flow
│   │   └── upload_flow.md      # Image upload workflow
│   ├── README.md
│   └── docker_k8_best_practices.md
├── Backend
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── test-results            # API response validation files
│   │   ├── auth.json
│   │   ├── graph.json
│   │   ├── health.json
│   │   └── upload.json
│   └── src
│       ├── controllers
│       ├── models
│       ├── routes              # API endpoint definitions
│       │   ├── auth.js        # Authentication endpoints
│       │   ├── graph.js       # Graph data endpoint
│       │   ├── health.js      # Health check endpoint
│       │   └── upload.js      # Upload endpoints
│       └── services
├── Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── public
│   └── src
├── Neo4j
│   ├── Dockerfile              # Neo4j container configuration
│   ├── graph_structure.json    # Sample graph structure
│   ├── neo4j.conf             # Neo4j database configuration
│   ├── local-deploy.ps1       # Local deployment script
│   └── sample_data.cypher     # Sample data initialization
└── README.md

## API Structure

### Core Endpoints
- `GET /health` - Service health check
- `GET /auth/status` - Authentication status
- `GET /graph` - Complete graph data for visualization
- `GET /upload/status` - Upload service status

### Data Flow
1. Authentication via `/auth` endpoints
2. Graph data retrieval via `/graph` endpoint
3. Image upload via `/upload` endpoint
4. Automatic attribute extraction and graph updates

## Neo4j Schema

### Nodes
- Root: Entry point node
- User: Platform users
- Image: Uploaded images
- Attribute: Image characteristics

### Relationships
- (User)-[:CONNECTED_TO]->(Root)
- (User)-[:UPLOADED]->(Image)
- (Image)-[:HAS_ATTRIBUTE]->(Attribute)

### Constraints
- Unique node IDs:
  - Root.id
  - User.userId
  - Image.imageId
  - Attribute.attributeId

### Indexes
- User.lastLogin
- Image.uploadedAt