param(
    [switch]$ValidateOnly,
    [switch]$AutoCreateNetwork
)

# Function to read required environment variable
function Get-RequiredEnvValue {
    param (
        [string]$key
    )
    
    $envPath = Join-Path $PSScriptRoot "../.env"
    if (-not (Test-Path $envPath)) {
        Write-Error "Environment file not found at: $envPath"
        exit 1
    }
    
    $value = Get-Content $envPath | Where-Object { $_ -match "^$key=" } | ForEach-Object { $_.Split('=')[1] }
    if (-not $value) {
        Write-Error "Required environment variable '$key' not found in .env file"
        exit 1
    }
    return $value.Trim('"', "'")
}

# Function to validate Neo4j container health
function Test-Neo4jHealth {
    param (
        [string]$containerName,
        [string]$user,
        [string]$password
    )
    
    Write-Host "Checking Neo4j container health..."
    
    # Check if container exists and is running
    $container = docker ps -q -f name=$containerName
    if (-not $container) {
        Write-Error "Neo4j container '$containerName' is not running"
        return $false
    }
    
    # Test database connection
    try {
        $result = docker exec $containerName cypher-shell -u $user -p $password "RETURN 1 as test;"
        if ($result -match "test") {
            Write-Host " Neo4j connection successful"
            return $true
        }
    } catch {
        Write-Error "Failed to connect to Neo4j: $_"
        return $false
    }
    return $false
}

# Function to validate Docker environment
function Test-DockerEnvironment {
    Write-Host "Validating Docker environment..."
    
    # Check if Docker is running by attempting a simple command
    try {
        docker ps | Out-Null
        Write-Host " Docker is running"
    } catch {
        Write-Error " Docker is not running"
        return $false
    }
    
    return $true
}

# Function to manage Docker network
function Initialize-DockerNetwork {
    param(
        [switch]$AutoCreate
    )

    $networkName = "graph-starz-network"
    $networkExists = docker network ls --format '{{.Name}}' | Select-String -Pattern "^$networkName`$"
    
    if (-not $networkExists) {
        Write-Host "`nDocker network '$networkName' not found."
        
        if ($AutoCreate) {
            Write-Host "Auto-creating network: $networkName"
            docker network create $networkName
            if ($LASTEXITCODE -eq 0) {
                Write-Host " Network created successfully"
                return $true
            } else {
                Write-Error " Failed to create network"
                return $false
            }
        } else {
            $createNetwork = Read-Host "Would you like to create it? (y/n)"
            if ($createNetwork -eq 'y') {
                Write-Host "Creating Docker network: $networkName"
                docker network create $networkName
                if ($LASTEXITCODE -eq 0) {
                    Write-Host " Network created successfully"
                    return $true
                } else {
                    Write-Error " Failed to create network"
                    return $false
                }
            } else {
                Write-Error " Network is required for deployment"
                return $false
            }
        }
    } else {
        Write-Host " Docker network '$networkName' exists"
        return $true
    }
}

# Read required environment variables
$neo4jUser = Get-RequiredEnvValue "NEO4J_USER"
$neo4jPassword = Get-RequiredEnvValue "NEO4J_PASSWORD"

# Validate environment and network
$envValid = Test-DockerEnvironment
if (-not $envValid) {
    exit 1
}

$networkValid = Initialize-DockerNetwork -AutoCreate:$AutoCreateNetwork
if (-not $networkValid) {
    exit 1
}

# If ValidateOnly flag is set, check container health and exit
if ($ValidateOnly) {
    $containerName = "neo4j-local"
    $isHealthy = Test-Neo4jHealth -containerName $containerName -user $neo4jUser -password $neo4jPassword
    
    if ($isHealthy) {
        Write-Host "`n Neo4j environment is healthy and ready"
        Write-Host "Browser: http://localhost:7474"
        Write-Host "Bolt: bolt://localhost:7687"
        exit 0
    } else {
        Write-Error " Neo4j environment validation failed"
        exit 1
    }
}

# Verify Docker is running
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker Desktop is not running. Please start Docker Desktop and try again."
        exit 1
    }
} catch {
    Write-Error "Docker Desktop is not running. Please start Docker Desktop and try again."
    exit 1
}

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
    --network graph-starz-network `
    --publish=7474:7474 --publish=7687:7687 `
    --volume="$HOME/neo4j/data:/data" `
    --volume="$HOME/neo4j/logs:/logs" `
    --volume="$HOME/neo4j/conf:/conf" `
    --volume="$HOME/neo4j/import:/import" `
    --env NEO4J_AUTH="${neo4jUser}/${neo4jPassword}" `
    neo4j:5.9.0

# Function to test if Neo4j is ready
function Test-Neo4jReady {
    try {
        $result = docker exec neo4j-local cypher-shell -u $neo4jUser -p $neo4jPassword "RETURN 1;"
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
    docker exec neo4j-local cypher-shell -u $neo4jUser -p $neo4jPassword "$cmd"
}

# Create sample data
Write-Host "Creating sample data..."
$sampleDataContent = Get-Content -Path "./sample_data.cypher" -Raw
$sampleDataContent = $sampleDataContent -replace "`r`n", "`n"  # Normalize line endings
$encodedCommand = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($sampleDataContent))

Write-Host "Executing sample data script..."
docker exec neo4j-local bash -c "echo $encodedCommand | base64 -d | cypher-shell -u $neo4jUser -p $neo4jPassword"

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
    docker exec neo4j-local cypher-shell -u $neo4jUser -p $neo4jPassword "$query"
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

$jsonOutput = docker exec neo4j-local cypher-shell -u $neo4jUser -p $neo4jPassword "$completeGraphQuery" --format plain
# Clean and format the JSON
$cleanJson = $jsonOutput -replace '^data$', '' -replace '^\{', '{' -replace '\n', '' -replace '\r', ''
$jsonObject = $cleanJson | ConvertFrom-Json
$formattedJson = $jsonObject | ConvertTo-Json -Depth 10
$formattedJson | Out-File -FilePath "graph_structure.json" -Encoding UTF8
Write-Host "Graph structure exported to graph_structure.json"

Write-Host "`nNeo4j deployment successful! Database is running with sample data."
Write-Host "Access Neo4j Browser at: http://localhost:7474"
Write-Host "Credentials: $neo4jUser/$neo4jPassword"
Write-Host "`nSample Cypher queries to explore the data:"
Write-Host "1. View all images with their attributes:"
Write-Host "   MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute) RETURN i.imageId, collect(a.value)"
Write-Host "2. Find images by attribute:"
Write-Host "   MATCH (i:Image)-[:HAS_ATTRIBUTE]->(a:Attribute {value: 'impressionist'}) RETURN i.imageId"
Write-Host "3. View user's uploaded images:"
Write-Host "   MATCH (u:User)-[:UPLOADED]->(i:Image) RETURN u.userId, collect(i.imageId)"