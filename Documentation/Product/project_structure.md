# Project Structure

## Directory Structure

The project is structured as follows:

```bash
.
├── Documentation
│   ├── Best_Practices
│   ├── Product
│   │   ├── best_practices.md
│   │   ├── product_vision.md    # Product vision and data structure
│   │   ├── upload_flow.md       # Image upload workflow
│   │   └── sign_in_flow.md      # Authentication flow
│   ├── README.md
│   └── docker_k8_best_practices.md
├── Backend
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   └── src
│       ├── controllers
│       ├── models
│       ├── routes
│       └── services
├── Frontend
│   ├── Dockerfile
│   ├── package.json
│   ├── public
│   └── src
├── Neo4j
│   ├── Dockerfile              # Neo4j container configuration
│   ├── neo4j.conf             # Neo4j database configuration
│   ├── local-deploy.ps1       # Local deployment script with schema initialization
│   └── sample_data.cypher     # Sample data with users, images, and attributes
└── README.md

## Neo4j Schema

### Nodes
- Root: Entry point node
- User: Platform users
- Image: Uploaded images
- Attribute: Image characteristics

### Relationships
- (Root)-[CONNECTED_TO]->(User)
- (User)-[UPLOADED]->(Image)
- (Image)-[HAS_ATTRIBUTE]->(Attribute)

### Constraints
- Unique node IDs:
  - Root.id
  - User.userId
  - Image.imageId
  - Attribute.attributeId

### Indexes
- User.lastLogin
- Image.uploadedAt