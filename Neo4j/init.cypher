// Create constraints
CREATE CONSTRAINT root_unique IF NOT EXISTS FOR (r:Root) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE;
CREATE CONSTRAINT image_id_unique IF NOT EXISTS FOR (i:Image) REQUIRE i.imageId IS UNIQUE;
CREATE CONSTRAINT attribute_id_unique IF NOT EXISTS FOR (a:Attribute) REQUIRE a.attributeId IS UNIQUE;

// Create indexes
CREATE INDEX user_lastLogin IF NOT EXISTS FOR (u:User) ON (u.lastLogin);
CREATE INDEX image_uploadedAt IF NOT EXISTS FOR (i:Image) ON (i.uploadedAt);

// Create root node if it doesn't exist
MERGE (r:Root {id: 'root'});
