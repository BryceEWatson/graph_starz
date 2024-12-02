// Create sample users
MERGE (root:Root {id: 'root'})
MERGE (user1:User {userId: 'sample_user_1', createdAt: datetime(), lastLogin: datetime()})
MERGE (user2:User {userId: 'sample_user_2', createdAt: datetime(), lastLogin: datetime()})
CREATE (root)-[:CONNECTED_TO]->(user1)
CREATE (root)-[:CONNECTED_TO]->(user2)

// Create sample images with attributes
CREATE (img1:Image {
    imageId: 'sample_image_1',
    uploadedAt: datetime(),
    url: 'https://storage.googleapis.com/sample/image1.jpg',
    status: 'processed'
})
WITH img1
CREATE (img2:Image {
    imageId: 'sample_image_2',
    uploadedAt: datetime(),
    url: 'https://storage.googleapis.com/sample/image2.jpg',
    status: 'processed'
})
WITH img1, img2
CREATE (img3:Image {
    imageId: 'sample_image_3',
    uploadedAt: datetime(),
    url: 'https://storage.googleapis.com/sample/image3.jpg',
    status: 'processed'
})
WITH img1, img2, img3

// Create user-image relationships
MATCH (user1:User {userId: 'sample_user_1'})
MATCH (user2:User {userId: 'sample_user_2'})
WITH user1, user2, img1, img2, img3
CREATE (user1)-[:UPLOADED]->(img1)
CREATE (user1)-[:UPLOADED]->(img2)
CREATE (user2)-[:UPLOADED]->(img3)
WITH img1, img2, img3

// Create attribute nodes for different categories
CREATE (style1:Attribute {attributeId: 'style_impressionist', type: 'style', value: 'impressionist'})
CREATE (style2:Attribute {attributeId: 'style_modern', type: 'style', value: 'modern'})
CREATE (color1:Attribute {attributeId: 'color_blue', type: 'color', value: 'blue'})
CREATE (color2:Attribute {attributeId: 'color_green', type: 'color', value: 'green'})
CREATE (mood1:Attribute {attributeId: 'mood_peaceful', type: 'mood', value: 'peaceful'})
CREATE (mood2:Attribute {attributeId: 'mood_energetic', type: 'mood', value: 'energetic'})
CREATE (comp1:Attribute {attributeId: 'composition_rule_of_thirds', type: 'composition', value: 'rule_of_thirds'})
CREATE (tech1:Attribute {attributeId: 'technique_oil_painting', type: 'technique', value: 'oil_painting'})
CREATE (obj1:Attribute {attributeId: 'object_tree', type: 'object', value: 'tree'})
CREATE (obj2:Attribute {attributeId: 'object_mountain', type: 'object', value: 'mountain'})
WITH img1, img2, img3, style1, style2, color1, color2, mood1, mood2, comp1, tech1, obj1, obj2

// Image 1 attributes (User 1)
CREATE (img1)-[:HAS_ATTRIBUTE]->(style1)
CREATE (img1)-[:HAS_ATTRIBUTE]->(color1)
CREATE (img1)-[:HAS_ATTRIBUTE]->(mood1)
CREATE (img1)-[:HAS_ATTRIBUTE]->(comp1)
CREATE (img1)-[:HAS_ATTRIBUTE]->(tech1)
CREATE (img1)-[:HAS_ATTRIBUTE]->(obj1)

// Image 2 attributes (User 1)
CREATE (img2)-[:HAS_ATTRIBUTE]->(style2)
CREATE (img2)-[:HAS_ATTRIBUTE]->(color2)
CREATE (img2)-[:HAS_ATTRIBUTE]->(mood2)
CREATE (img2)-[:HAS_ATTRIBUTE]->(comp1)
CREATE (img2)-[:HAS_ATTRIBUTE]->(tech1)
CREATE (img2)-[:HAS_ATTRIBUTE]->(obj2)

// Image 3 attributes (User 2) - intentionally sharing some attributes with User 1's images
CREATE (img3)-[:HAS_ATTRIBUTE]->(style1)  // Same style as img1
CREATE (img3)-[:HAS_ATTRIBUTE]->(color2)  // Same color as img2
CREATE (img3)-[:HAS_ATTRIBUTE]->(mood1)   // Same mood as img1
CREATE (img3)-[:HAS_ATTRIBUTE]->(comp1)   // Same composition as both
CREATE (img3)-[:HAS_ATTRIBUTE]->(tech1)   // Same technique as both
CREATE (img3)-[:HAS_ATTRIBUTE]->(obj2)    // Same object as img2
