param(
    [switch]$ValidateOnly
)

# Set output encoding to ASCII
[Console]::OutputEncoding = [System.Text.Encoding]::ASCII
$ErrorActionPreference = "Continue"

# Function to read required environment variable
function Get-RequiredEnvValue {
    param (
        [string]$key,
        [switch]$AsSecureString
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
    
    $value = $value.Trim('"', "'")
    
    if ($AsSecureString) {
        return (ConvertTo-SecureString $value -AsPlainText -Force)
    }
    
    return $value
}

# Function to safely use a secure string
function Use-SecureString {
    param (
        [Parameter(Mandatory=$true)]
        [SecureString]$SecureString,
        [Parameter(Mandatory=$true)]
        [scriptblock]$ScriptBlock
    )
    
    $BSTR = $null
    $plainText = $null
    
    try {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
        $plainText = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        
        & $ScriptBlock $plainText
    }
    finally {
        if ($BSTR) {
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
        }
        if ($plainText) {
            Remove-Variable -Name plainText -ErrorAction SilentlyContinue
        }
    }
}

# Function to execute Neo4j command securely
function Invoke-Neo4jCommand {
    param (
        [string]$user,
        [SecureString]$password,
        [string]$query
    )
    
    $result = $null
    Use-SecureString -SecureString $password -ScriptBlock {
        param([string]$plainTextPass)
        $result = docker exec neo4j-local cypher-shell -u $user -p $plainTextPass $query 2>&1
        $script:lastExitCode = $LASTEXITCODE
        return $result
    }
    return $result
}

# Function to manage Docker network
function Initialize-DockerNetwork {
    $networkName = "graph-starz-network"
    Write-SafeOutput "Checking Docker network..."
    
    $networkExists = docker network ls --format '{{.Name}}' | Select-String -Pattern "^$networkName`$"
    if (-not $networkExists) {
        Write-SafeOutput "[ERROR] Docker network '$networkName' not found. Please run Neo4j/local-deploy.ps1 first" -IsError
        return $false
    }
    
    Write-SafeOutput "[OK] Docker network exists"
    return $true
}

# Function to validate Docker environment
function Test-DockerEnvironment {
    Write-SafeOutput "Validating Docker environment..."
    
    # Check if Docker is running
    try {
        docker ps | Out-Null
        Write-SafeOutput "[OK] Docker is running"
    } catch {
        Write-SafeOutput "[ERROR] Docker is not running" -IsError
        return $false
    }
    
    # Check network
    if (-not (Initialize-DockerNetwork)) {
        return $false
    }
    
    return $true
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

# Function to wait for backend to be ready
function Wait-ForBackend {
    $maxAttempts = 30
    $attempt = 1
    $containerName = "graph-starz-backend"
    
    while ($attempt -le $maxAttempts) {
        Write-SafeOutput "Waiting for backend to start (Attempt $attempt of $maxAttempts)..."
        
        # Check if container is still running
        $status = docker ps -f name=$containerName --format "{{.Status}}"
        if (-not $status) {
            Write-SafeOutput "Backend container stopped unexpectedly" -IsError
            Write-SafeOutput "Container logs:" -IsError
            docker logs $containerName
            return $false
        }
        
        # Check container health
        try {
            $response = Invoke-WebRequest "http://localhost:${port}/health" -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-SafeOutput "[OK] Backend is ready"
                return $true
            }
        } catch {
            # Continue waiting
        }
        
        Start-Sleep -Seconds 1
        $attempt++
    }
    
    Write-SafeOutput "Backend failed to start properly" -IsError
    Write-SafeOutput "Container logs:" -IsError
    docker logs $containerName
    return $false
}

# Function to validate Neo4j connection
function Test-Neo4jConnection {
    param (
        [string]$uri,
        [string]$user,
        [SecureString]$password
    )
    
    Write-SafeOutput "Validating Neo4j connection..."
    
    # Check if Neo4j container is running
    $neo4jContainer = docker ps -q -f name=neo4j-local
    if (-not $neo4jContainer) {
        Write-SafeOutput "[ERROR] Neo4j container is not running. Please start Neo4j first" -IsError
        return $false
    }
    Write-SafeOutput "[OK] Neo4j container is running"
    
    # Test basic connectivity
    Write-SafeOutput "Testing Neo4j connectivity..."
    $result = Invoke-Neo4jCommand -user $user -password $password -query "RETURN 1 as test"
    Write-SafeOutput "Neo4j Response: $result"
    
    if ($script:lastExitCode -eq 0) {
        Write-SafeOutput "[OK] Successfully connected to Neo4j"
        
        # Test write permissions
        Write-SafeOutput "Testing Neo4j write permissions..."
        $result = Invoke-Neo4jCommand -user $user -password $password -query "CREATE (n:TestNode) RETURN true as success"
        Write-SafeOutput "Neo4j Response (raw): '$result'"
        
        # Check if response contains both "success" and "TRUE"
        $hasSuccess = $result.Contains("success")
        $hasTrue = $result.Contains("TRUE")
        Write-SafeOutput "Contains 'success': $hasSuccess"
        Write-SafeOutput "Contains 'TRUE': $hasTrue"
        
        if ($script:lastExitCode -eq 0 -and $hasSuccess -and $hasTrue) {
            Write-SafeOutput "[OK] Successfully verified Neo4j write permissions"
            
            # Clean up test node
            $result = Invoke-Neo4jCommand -user $user -password $password -query "MATCH (n:TestNode) DELETE n"
            if ($script:lastExitCode -ne 0) {
                Write-SafeOutput "[WARN] Failed to clean up test node: $result"
            }
            
            return $true
        } else {
            Write-SafeOutput "[ERROR] Failed to verify write permissions. Exit code: $script:lastExitCode" -IsError
            Write-SafeOutput "Full response: $result" -IsError
            return $false
        }
    } else {
        Write-SafeOutput "[ERROR] Failed to connect to Neo4j. Exit code: $script:lastExitCode" -IsError
        Write-SafeOutput "Full response: $result" -IsError
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
$neo4jUser = Get-RequiredEnvValue "NEO4J_USER"
$neo4jPassword = Get-RequiredEnvValue "NEO4J_PASSWORD" -AsSecureString

# For local development, Neo4j is accessed via container name
$neo4jUri = "neo4j://neo4j-local:7687"

# Validate Neo4j connection using local URI for testing
if (-not (Test-Neo4jConnection -uri "neo4j://localhost:7687" -user $neo4jUser -password $neo4jPassword)) {
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
Use-SecureString -SecureString $neo4jPassword -ScriptBlock {
    param([string]$plainTextPass)
    $script:containerId = docker run -d `
        --name graph-starz-backend `
        --network graph-starz-network `
        -p "${port}:${port}" `
        -e NEO4J_URI=$neo4jUri `
        -e NEO4J_USER=$neo4jUser `
        -e NEO4J_PASSWORD=$plainTextPass `
        -e NODE_ENV=$nodeEnv `
        -e PORT=$port `
        graph-starz-backend 2>$null
}

if (-not $script:containerId) {
    Write-SafeOutput "Failed to start backend container" -IsError
    exit 1
}

# Wait for backend to be ready
if (-not (Wait-ForBackend)) {
    Write-SafeOutput "Container logs before cleanup:" -IsError
    docker logs graph-starz-backend
    
    Write-SafeOutput "Cleaning up failed container..."
    docker rm -f graph-starz-backend 2>$null
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
