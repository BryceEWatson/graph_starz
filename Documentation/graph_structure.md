# Graph structure

## High level overview

- User nodes are created when a user signs in for the first time.
- User nodes are connected to the image nodes of images they have uploaded.
- Image nodes are created when an image is uploaded.
- Image nodes are connected to attribute nodes.
- Image nodes are connected to user nodes.
- Attribute nodes are also created when an image is uploaded.
- Attribute nodes are singular and will connect to multiple images from any user.
- All queries must return at least the current user's node and any connected nodes.
- Other users that are not connected through images attributes will be returned as well, up to a limit.

## DB Modeling

Based on the described structure, here's how to model this graph database effectively:

### Node Labels

**Core Nodes**
- `:User` - User nodes
- `:Image` - Image nodes
- `:Attribute` - Attribute nodes

### Relationships

**Primary Connections**
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
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE;
CREATE CONSTRAINT image_id_unique IF NOT EXISTS FOR (i:Image) REQUIRE i.imageId IS UNIQUE;
CREATE CONSTRAINT attribute_id_unique IF NOT EXISTS FOR (a:Attribute) REQUIRE a.attributeId IS UNIQUE;

// Indexes for performance
CREATE INDEX user_lastLogin IF NOT EXISTS FOR (u:User) ON (u.lastLogin);
CREATE INDEX image_uploadedAt IF NOT EXISTS FOR (i:Image) ON (i.uploadedAt);
```

## Graph Database Structure

### Node Types

#### User
Represents a user in the system.
```cypher
(:User {
    id: string,          // Unique identifier
    name: string,        // User's display name
    email: string,       // User's email address
    createdAt: datetime  // When the user was created
})
```

#### Image
Represents an uploaded image.
```cypher
(:Image {
    id: string,          // Unique identifier
    url: string,         // URL to the image
    title: string,       // Image title
    description: string, // Image description
    createdAt: datetime, // When the image was uploaded
    width: int,         // Image width in pixels
    height: int         // Image height in pixels
})
```

#### Attribute
Represents a characteristic or feature of an image.
```cypher
(:Attribute {
    id: string,         // Unique identifier
    name: string,       // Name of the attribute
    type: string,       // Type of attribute (e.g., "color", "object", "style")
    value: string,      // Value of the attribute
    confidence: float   // Confidence score of the attribute (0-1)
})
```

### Relationships

#### UPLOADED
```cypher
(user:User)-[:UPLOADED {
    timestamp: datetime  // When the upload occurred
}]->(image:Image)
```
Connects a user to an image they uploaded.

#### HAS_ATTRIBUTE
```cypher
(image:Image)-[:HAS_ATTRIBUTE {
    confidence: float,  // Confidence score of this attribute for this image
    timestamp: datetime // When the attribute was assigned
}]->(attribute:Attribute)
```
Connects an image to its attributes.

### Example Queries

#### Get all attributes for an image
```cypher
MATCH (i:Image {id: $imageId})-[r:HAS_ATTRIBUTE]->(a:Attribute)
RETURN a.name, a.type, a.value, r.confidence
ORDER BY r.confidence DESC
```

#### Get all images with a specific attribute
```cypher
MATCH (i:Image)-[r:HAS_ATTRIBUTE]->(a:Attribute {name: $attributeName})
RETURN i
ORDER BY r.confidence DESC
```
