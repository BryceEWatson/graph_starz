# Stop and remove existing Neo4j container if it exists
Write-Host "Cleaning up existing Neo4j container..."
docker stop neo4j-local 2>$null
docker rm neo4j-local 2>$null

# Remove existing Neo4j data
$dataPath = "$HOME/neo4j/data"
if (Test-Path $dataPath) {
    Write-Host "Removing existing Neo4j data..."
    Remove-Item -Path $dataPath -Recurse -Force
}

# Create necessary directories
Write-Host "Creating Neo4j directories..."
$directories = @(
    "$HOME/neo4j/data",
    "$HOME/neo4j/logs",
    "$HOME/neo4j/conf",
    "$HOME/neo4j/import"
)
foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

# Copy configuration file
Write-Host "Copying Neo4j configuration..."
Copy-Item "./neo4j.conf" -Destination "$HOME/neo4j/conf/neo4j.conf" -Force

# Copy sample data file
Write-Host "Copying sample data file..."
Copy-Item "./sample_data.cypher" -Destination "$HOME/neo4j/import/sample_data.cypher" -Force

# Start Neo4j container
Write-Host "Starting Neo4j container..."
docker run -d --name neo4j-local `
    --publish=7474:7474 --publish=7687:7687 `
    --volume="$HOME/neo4j/data:/data" `
    --volume="$HOME/neo4j/logs:/logs" `
    --volume="$HOME/neo4j/conf:/conf" `
    --volume="$HOME/neo4j/import:/import" `
    --env NEO4J_AUTH=neo4j/development_password `
    neo4j:5.9.0

# Function to test if Neo4j is ready
function Test-Neo4jReady {
    try {
        $result = docker exec neo4j-local cypher-shell -u neo4j -p development_password "RETURN 1;"
        return $true
    } catch {
        return $false
    }
}

# Wait for Neo4j to start
Write-Host "Waiting for Neo4j to start..."
$maxAttempts = 10
$attempts = 0
do {
    $attempts++
    Write-Host "Attempt $attempts of $maxAttempts..."
    Start-Sleep -Seconds 10
    
    if (Test-Neo4jReady) {
        Write-Host "Neo4j is ready!"
        break
    }
    
    if ($attempts -eq $maxAttempts) {
        Write-Host "Error: Neo4j failed to start after $maxAttempts attempts"
        exit 1
    }
} while ($true)

# Initialize database schema
Write-Host "Initializing database schema..."

$commands = @(
    'CREATE CONSTRAINT root_unique IF NOT EXISTS FOR (r:Root) REQUIRE r.id IS UNIQUE;',
    'CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE;',
    'CREATE CONSTRAINT image_id_unique IF NOT EXISTS FOR (i:Image) REQUIRE i.imageId IS UNIQUE;',
    'CREATE CONSTRAINT attribute_id_unique IF NOT EXISTS FOR (a:Attribute) REQUIRE a.attributeId IS UNIQUE;',
    'CREATE INDEX user_lastLogin IF NOT EXISTS FOR (u:User) ON (u.lastLogin);',
    'CREATE INDEX image_uploadedAt IF NOT EXISTS FOR (i:Image) ON (i.uploadedAt);',
    "MERGE (r:Root {id: 'root'}) RETURN r;"
)

foreach ($cmd in $commands) {
    Write-Host "Executing: $cmd"
    docker exec neo4j-local cypher-shell -u neo4j -p development_password "$cmd"
}

# Create sample data
Write-Host "Creating sample data..."
$sampleDataContent = Get-Content -Path "./sample_data.cypher" -Raw
$sampleDataContent = $sampleDataContent -replace "`r`n", "`n"  # Normalize line endings
$encodedCommand = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($sampleDataContent))

Write-Host "Executing sample data script..."
docker exec neo4j-local bash -c "echo $encodedCommand | base64 -d | cypher-shell -u neo4j -p development_password"

# Verify the sample data
Write-Host "Verifying sample data..."
$verificationQueries = @(
    "MATCH (u:User)-[:UPLOADED]->(i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute) RETURN count(DISTINCT i) as ImageCount",
    "MATCH (a:Attribute) RETURN a.type as Type, count(*) as Count",
    "MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute) RETURN i.imageId as Image, collect(a.value) as Attributes",
    "MATCH (root:Root)-[:CONNECTED_TO]->(user:User)-[:UPLOADED]->(image:Image) 
     RETURN root.id as Root, user.userId as User, collect(image.imageId) as Images"
)

foreach ($query in $verificationQueries) {
    Write-Host "`nExecuting verification query: $query"
    docker exec neo4j-local cypher-shell -u neo4j -p development_password "$query"
}

# Export complete graph structure to JSON
Write-Host "`nExporting complete graph structure to JSON..."
$completeGraphQuery = @"
MATCH (root:Root)
OPTIONAL MATCH (root)-[:CONNECTED_TO]->(user:User)
OPTIONAL MATCH (user)-[:UPLOADED]->(image:Image)
OPTIONAL MATCH (image)-[:HAS_ATTRIBUTE]->(attr:Attribute)
WITH root, user, image,
     CASE WHEN image IS NOT NULL 
          THEN collect({type: attr.type, value: attr.value})
          ELSE []
     END as imageAttributes
WITH root, user,
     CASE WHEN user IS NOT NULL
          THEN collect({
              imageId: image.imageId,
              uploadedAt: toString(image.uploadedAt),
              url: image.url,
              status: image.status,
              attributes: imageAttributes
          })
          ELSE []
     END as userImages
WITH root,
     collect({
         userId: user.userId,
         createdAt: toString(user.createdAt),
         lastLogin: toString(user.lastLogin),
         images: userImages
     }) as users
RETURN {
    root: root.id,
    users: users
} as data
"@

$jsonOutput = docker exec neo4j-local cypher-shell -u neo4j -p development_password "$completeGraphQuery" --format plain
# Clean and format the JSON
$cleanJson = $jsonOutput -replace '^data$', '' -replace '^\{', '{' -replace '\n', '' -replace '\r', ''
$jsonObject = $cleanJson | ConvertFrom-Json
$formattedJson = $jsonObject | ConvertTo-Json -Depth 10
$formattedJson | Out-File -FilePath "graph_structure.json" -Encoding UTF8
Write-Host "Graph structure exported to graph_structure.json"

Write-Host "`nNeo4j deployment successful! Database is running with sample data."
Write-Host "Access Neo4j Browser at: http://localhost:7474"
Write-Host "Credentials: neo4j/development_password"
Write-Host "`nSample Cypher queries to explore the data:"
Write-Host "1. View all images with their attributes:"
Write-Host "   MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute) RETURN i.imageId, collect(a.value)"
Write-Host "2. Find images by attribute:"
Write-Host "   MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute {value: 'impressionist'}) RETURN i.imageId"
Write-Host "3. View user's uploaded images:"
Write-Host "   MATCH (u:User)-[:UPLOADED]->(i:Image) RETURN u.userId, collect(i.imageId)"