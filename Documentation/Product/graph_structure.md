# Graph structure

## High level overview

- Root node always exists as a singular node that all user nodes connect to.
- User nodes are created when a user signs in for the first time.
- User nodes are connected to the root node.
- User nodes are connected to the image nodes of images they have uploaded.
- Image nodes are created when an image is uploaded.
- Image nodes are connected to attribute nodes.
- Image nodes are connected to user nodes.
- Attribute nodes are also created when an image is uploaded.
- Attribute nodes are singular and will connect to multiple images from any user.

## DB Modeling

Based on the described structure, here's how to model this graph database effectively:

### Node Labels

**Core Nodes**
- `:Root` - Single root node
- `:User` - User nodes
- `:Image` - Image nodes
- `:Attribute` - Attribute nodes

### Relationships

**Primary Connections**
- `(:User)-[:CONNECTED_TO]->(:Root)` - Links users to root node
- `(:User)-[:UPLOADED]->(:Image)` - Shows image ownership
- `(:Image)-[:HAS_ATTRIBUTE]->(:Attribute)` - Links images to their attributes

### Properties

**User Node**
- `userId` (unique identifier)
- `createdAt` (timestamp)
- `lastLogin` (timestamp)

**Image Node**
- `imageId` (unique identifier)
- `uploadedAt` (timestamp)
- `url` (string)
- `status` (string)

**Attribute Node**
- `attributeId` (unique identifier)
- `type` (string)
- `value` (string)

### Constraints and Indexes

```cypher
// Unique constraints
CREATE CONSTRAINT root_unique IF NOT EXISTS FOR (r:Root) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE;
CREATE CONSTRAINT image_id_unique IF NOT EXISTS FOR (i:Image) REQUIRE i.imageId IS UNIQUE;
CREATE CONSTRAINT attribute_id_unique IF NOT EXISTS FOR (a:Attribute) REQUIRE a.attributeId IS UNIQUE;

// Indexes for performance
CREATE INDEX user_lastLogin IF NOT EXISTS FOR (u:User) ON (u.lastLogin);
CREATE INDEX image_uploadedAt IF NOT EXISTS FOR (i:Image) ON (i.uploadedAt);
```

### Implementation Notes

1. Create a single root node during database initialization
2. Use `MERGE` instead of `CREATE` for attribute nodes to ensure uniqueness
3. Implement cascading deletes for image nodes when users are removed
4. Properties should be indexed for attributes that will be frequently queried
5. Use relationship properties sparingly to maintain performance
