# Graph Starz

Graph Starz is a graph-based image upload and sharing platform that leverages AI understanding to create a coherent global graph of interconnected images. The platform uses advanced AI models to identify image attributes, creating natural connections between related content across different users.

## Documentation

Detailed documentation can be found in the following files:
- [Product Vision](Documentation/Product/product_vision.md) - Overview of the problem, solution, and features
- [Project Structure](Documentation/Product/project_structure.md) - Technical documentation of the codebase structure
- [Upload Flow](Documentation/Product/upload_flow.md) - Details of the image upload process
- [Sign In Flow](Documentation/Product/sign_in_flow.md) - Authentication process documentation

## Quick Start

### Prerequisites
- Windows OS
- Docker Desktop
- PowerShell
- Git

### Running Neo4j Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/graph_starz.git
   cd graph_starz
   ```

2. Run the local deployment script:
   ```powershell
   cd Neo4j
   ./local-deploy.ps1
   ```

   This script will:
   - Clean up any existing Neo4j containers
   - Start a fresh Neo4j instance
   - Initialize the database schema
   - Create sample data
   - Export the graph structure to JSON
   - Run verification queries

3. Access Neo4j:
   - Browser Interface: http://localhost:7474
   - Credentials: neo4j/development_password
   - Bolt Port: 7687

### Sample Queries

Once Neo4j is running, you can try these queries in the Neo4j Browser:

1. View all images with their attributes:
   ```cypher
   MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute)
   RETURN i.imageId, collect(a.value)
   ```

2. Find images by attribute:
   ```cypher
   MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute {value: 'impressionist'})
   RETURN i.imageId
   ```

3. View user's uploaded images:
   ```cypher
   MATCH (u:User)-[:UPLOADED]->(i:Image)
   RETURN u.userId, collect(i.imageId)
   ```

4. View complete graph structure:
   ```cypher
   MATCH (root:Root)-[:CONNECTED_TO]->(user:User)-[:UPLOADED]->(image:Image)-[:HAS_ATTRIBUTE]->(attr:Attribute)
   RETURN root.id as Root,
          user.userId as User,
          image.imageId as Image,
          collect(DISTINCT {type: attr.type, value: attr.value}) as Attributes
   ORDER BY Image
   ```

## Data Structure

### Nodes
- Root: Entry point node
- User: Platform users
- Image: Uploaded images
- Attribute: Image characteristics (style, color, mood, etc.)

### Relationships
- (Root)-[CONNECTED_TO]->(User)
- (User)-[UPLOADED]->(Image)
- (Image)-[HAS_ATTRIBUTE]->(Attribute)

For more details about the data structure, see the [Product Vision](Documentation/Product/product_vision.md) document.

## Development

### Project Structure
```bash
.
├── Documentation/      # Project documentation
├── Backend/           # Node.js backend server
├── Frontend/          # React frontend application
└── Neo4j/            # Neo4j database configuration and scripts
```

For a detailed breakdown of the project structure, see the [Project Structure](Documentation/Product/project_structure.md) document.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

TBD.
