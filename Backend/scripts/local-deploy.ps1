param(
    [switch]$ValidateOnly
)

# Set output encoding to ASCII
[Console]::OutputEncoding = [System.Text.Encoding]::ASCII
$ErrorActionPreference = "Continue"

# Function to read required environment variable
function Get-RequiredEnvValue {
    param (
        [string]$key
    )
    
    $envPath = Join-Path $PSScriptRoot "../../.env"
    if (-not (Test-Path $envPath)) {
        Write-SafeOutput "Environment file not found at: $envPath" -IsError
        exit 1
    }
    
    $value = Get-Content $envPath | Where-Object { $_ -match "^$key=" } | ForEach-Object { $_.Split('=')[1] }
    if (-not $value) {
        Write-SafeOutput "Required environment variable '$key' not found in .env file" -IsError
        exit 1
    }
    return $value.Trim('"', "'")
}

# Function to validate Docker environment
function Test-DockerEnvironment {
    Write-SafeOutput "Validating Docker environment..."
    
    # Check if Docker is running with timeout
    $dockerRunning = $false
    $job = Start-Job -ScriptBlock { 
        docker ps | Out-Null
        $LASTEXITCODE -eq 0 
    }
    
    if (Wait-Job $job -Timeout 10) {
        $dockerRunning = Receive-Job $job
    } else {
        Write-SafeOutput "[ERROR] Docker check timed out after 10 seconds" -IsError
        Remove-Job $job -Force
        return $false
    }
    
    Remove-Job $job -Force
    
    if (-not $dockerRunning) {
        Write-SafeOutput "[ERROR] Docker is not running" -IsError
        return $false
    }
    Write-SafeOutput "[OK] Docker is running"
    
    # Verify network exists (created by Neo4j deployment)
    $networkName = "graph-starz-network"
    $networkExists = docker network ls --format '{{.Name}}' | Select-String -Pattern "^$networkName`$"
    if (-not $networkExists) {
        Write-SafeOutput "[ERROR] Docker network '$networkName' not found. Please run Neo4j deployment first" -IsError
        return $false
    }
    Write-SafeOutput "[OK] Docker network exists"
    
    return $true
}

# Function to validate Neo4j connection
function Test-Neo4jConnection {
    param (
        [string]$uri,
        [string]$user,
        [string]$password
    )
    
    Write-SafeOutput "Validating Neo4j connection..."
    
    # Check if Neo4j container is running
    $neo4jContainer = docker ps -q -f name=neo4j-local
    if (-not $neo4jContainer) {
        Write-SafeOutput "[ERROR] Neo4j container is not running. Please start Neo4j first" -IsError
        return $false
    }
    Write-SafeOutput "[OK] Neo4j container is running"
    
    # Try to connect to Neo4j
    try {
        $result = docker exec neo4j-local cypher-shell -u $user -p $password "RETURN 1 as test;"
        if ($result -match "test") {
            Write-SafeOutput "[OK] Successfully connected to Neo4j"
            return $true
        }
    } catch {
        Write-SafeOutput "[ERROR] Failed to connect to Neo4j: $_" -IsError
        return $false
    }
    return $false
}

# Function to safely get container logs
function Get-SafeContainerLogs {
    param (
        [string]$containerName
    )
    
    try {
        # Get logs and filter out non-ASCII characters
        $logs = docker logs $containerName 2>&1 | ForEach-Object {
            if ($_) {
                # Convert to ASCII, replacing non-ASCII chars with ?
                $([System.Text.Encoding]::ASCII.GetString([System.Text.Encoding]::ASCII.GetBytes($_)))
            }
        }
        return $logs
    } catch {
        return "Failed to retrieve container logs: $_"
    }
}

# Function to safely write output
function Write-SafeOutput {
    param (
        [string]$Message,
        [switch]$IsError
    )
    
    if ($IsError) {
        [Console]::Error.WriteLine("ERROR: $Message")
    } else {
        [Console]::WriteLine($Message)
    }
}

# Function to check if backend container is healthy
function Test-BackendHealth {
    param (
        [string]$containerName,
        [string]$port,
        [int]$maxAttempts = 30,
        [int]$sleepSeconds = 2
    )
    
    Write-SafeOutput "Waiting for backend container to be healthy..."
    
    for ($i = 1; $i -le $maxAttempts; $i++) {
        # Check if container is still running (redirect output to null)
        $container = docker ps -q -f name=$containerName 2>$null
        if (-not $container) {
            Write-SafeOutput "Backend container stopped unexpectedly" -IsError
            return $false
        }
        
        # Try to connect to the backend
        try {
            $ProgressPreference = 'SilentlyContinue'  # Disable progress bar
            $response = Invoke-WebRequest -Uri "http://localhost:$port/health" -Method GET -TimeoutSec 1
            if ($response.StatusCode -eq 200) {
                Write-SafeOutput "Backend is healthy and responding"
                return $true
            }
        } catch {
            if ($i -lt $maxAttempts) {
                Write-SafeOutput "Waiting for backend to start (Attempt $i of $maxAttempts)..."
            }
        }
        
        Start-Sleep -Seconds $sleepSeconds
    }
    
    Write-SafeOutput "Backend failed to become healthy within timeout period" -IsError
    return $false
}

# Function to test endpoints and save responses
function Test-Endpoints {
    param (
        [string]$baseUrl,
        [string]$outputDir = (Join-Path $PSScriptRoot "../test-results")
    )
    
    Write-Host "`nTesting API endpoints..."
    
    # Create output directory if it doesn't exist
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir | Out-Null
    }
    
    # Define endpoints to test with their methods and sample data
    $endpoints = @(
        @{
            Name = "health"
            Path = "/health"
            Method = "GET"
            SaveAs = "health.json"
        },
        @{
            Name = "auth-status"
            Path = "/auth/status"
            Method = "GET"
            SaveAs = "auth.json"
        },
        @{
            Name = "graph"
            Path = "/graph"
            Method = "GET"
            SaveAs = "graph.json"
        },
        @{
            Name = "upload-status"
            Path = "/upload/status"
            Method = "GET"
            SaveAs = "upload.json"
        }
    )
    
    $allSuccessful = $true
    
    foreach ($endpoint in $endpoints) {
        $uri = "${baseUrl}$($endpoint.Path)"
        Write-Host "Testing $($endpoint.Method) $($endpoint.Path)..."
        
        try {
            $ProgressPreference = 'SilentlyContinue'
            $response = Invoke-WebRequest -Uri $uri -Method $endpoint.Method -TimeoutSec 5
            
            if ($response.StatusCode -eq 200) {
                Write-Host "  Success"
                
                # Save response to JSON file
                $outputFile = Join-Path $outputDir $endpoint.SaveAs
                $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Out-File $outputFile -Encoding UTF8
                Write-Host "  Response saved to: $endpoint.SaveAs"
            }
            else {
                Write-Host "  Failed with status code: $($response.StatusCode)"
                $allSuccessful = $false
            }
        }
        catch {
            Write-Host "  Error: $($_.Exception.Message)"
            $allSuccessful = $false
        }
    }
    
    if ($allSuccessful) {
        Write-Host "`nAll endpoints tested successfully"
        return $true
    }
    else {
        Write-Host "`nSome endpoints failed testing"
        return $false
    }
}

# Verify Docker environment
if (-not (Test-DockerEnvironment)) {
    exit 1
}

# Read required environment variables
$port = Get-RequiredEnvValue "PORT"
$nodeEnv = Get-RequiredEnvValue "NODE_ENV"
$neo4jUri = Get-RequiredEnvValue "NEO4J_URI"
$neo4jUser = Get-RequiredEnvValue "NEO4J_USER"
$neo4jPassword = Get-RequiredEnvValue "NEO4J_PASSWORD"

# Validate Neo4j connection
if (-not (Test-Neo4jConnection -uri $neo4jUri -user $neo4jUser -password $neo4jPassword)) {
    exit 1
}

# If ValidateOnly flag is set, exit here
if ($ValidateOnly) {
    Write-SafeOutput "[SUCCESS] Backend environment validation successful"
    exit 0
}

# Stop and remove existing container if it exists
Write-SafeOutput "Cleaning up existing backend container..."
docker stop graph-starz-backend >$null 2>&1
docker rm graph-starz-backend >$null 2>&1

# Build the image (redirect stderr to stdout and then to null to suppress output)
Write-SafeOutput "Building Docker image..."
docker build -t graph-starz-backend (Join-Path $PSScriptRoot "..") 2>&1 >$null

# Create and start the container
Write-SafeOutput "Starting container..."
$containerId = docker run -d `
    --name graph-starz-backend `
    --network graph-starz-network `
    -p "${port}:${port}" `
    -e NEO4J_URI=$neo4jUri `
    -e NEO4J_USER=$neo4jUser `
    -e NEO4J_PASSWORD=$neo4jPassword `
    -e NODE_ENV=$nodeEnv `
    -e PORT=$port `
    graph-starz-backend 2>$null

if (-not $containerId) {
    Write-SafeOutput "Failed to start backend container" -IsError
    exit 1
}

# Check container health
if (-not (Test-BackendHealth -containerName "graph-starz-backend" -port $port)) {
    Write-SafeOutput "Backend failed to start properly" -IsError
    exit 1
}

# Test endpoints
$baseUrl = "http://localhost:${port}"
if (-not (Test-Endpoints -baseUrl $baseUrl)) {
    Write-SafeOutput "Some endpoints failed testing" -IsError
    exit 1
}

Write-SafeOutput "`nBackend server is running on http://localhost:$port"
exit 0
