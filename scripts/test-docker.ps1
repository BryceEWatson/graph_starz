# PowerShell script for testing Docker build and deployment
$ImageName = "graph-starz"
$ContainerName = "${ImageName}-test"
$LocalPort = 3000
$FrontendUrl = "http://localhost:${LocalPort}"
$LogFile = "docker_test_logs.txt"

# Function to write colored output
function Write-ColorOutput($Color, $Message) {
    $prevColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $prevColor
}

# Function to test health endpoints
function Test-HealthEndpoints {
    Write-ColorOutput "Yellow" "Testing health endpoints..."
    $endpoints = @(
        @{
            Name = "Main Health Check"
            Path = "/api/health"
            Required = $true
            ExpectedFields = @("status", "timestamp", "startTime", "initialization", "neo4j")
        },
        @{
            Name = "Database Health"
            Path = "/api/health/db"
            Required = $true
            ExpectedFields = @("healthy", "timestamp", "details.validation", "details.connectionInfo")
        },
        @{
            Name = "Storage Health"
            Path = "/api/health/storage"
            Required = $true
            ExpectedFields = @("healthy", "timestamp", "details.bucket", "details.location")
        }
    )

    $allPassed = $true
    foreach ($endpoint in $endpoints) {
        Write-ColorOutput "Yellow" "Testing $($endpoint.Name)..."
        try {
            $response = Invoke-WebRequest -Uri "${FrontendUrl}$($endpoint.Path)" -Method GET
            $content = $response.Content | ConvertFrom-Json

            # Verify response format
            $missingFields = $endpoint.ExpectedFields | Where-Object {
                $field = $_
                $value = $content
                foreach ($part in $field.Split('.')) {
                    if ($null -eq $value.$part) {
                        return $true
                    }
                    $value = $value.$part
                }
                return $false
            }

            if ($missingFields.Count -gt 0) {
                Write-ColorOutput "Red" "- $($endpoint.Name) response missing required fields: $($missingFields -join ', ')"
                $allPassed = $false
                continue
            }

            if ($endpoint.Path -eq "/api/health") {
                if ($content.status -eq "healthy") {
                    Write-ColorOutput "Green" "+ $($endpoint.Name) is healthy"
                    Write-ColorOutput "Gray" "  Start Time: $($content.startTime)"
                    Write-ColorOutput "Gray" "  Neo4j Status: $($content.neo4j.status)"
                } else {
                    Write-ColorOutput "Red" "- $($endpoint.Name) is unhealthy"
                    Write-ColorOutput "Red" "  Status: $($content.status)"
                    Write-ColorOutput "Red" "  Neo4j Status: $($content.neo4j.status)"
                    $allPassed = $false
                }
            } else {
                if ($content.healthy -eq $true) {
                    Write-ColorOutput "Green" "+ $($endpoint.Name) is healthy"
                    Write-ColorOutput "Gray" "  Response time: $($content.details.totalResponseTime)ms"
                } else {
                    Write-ColorOutput "Red" "- $($endpoint.Name) is unhealthy"
                    if ($content.error) {
                        Write-ColorOutput "Red" "  Error: $($content.error)"
                    }
                    if ($endpoint.Required) {
                        $allPassed = $false
                    }
                }
            }
        } catch {
            Write-ColorOutput "Red" "- Failed to test $($endpoint.Name)"
            Write-ColorOutput "Red" "  Error: $($_.Exception.Message)"
            if ($endpoint.Required) {
                $allPassed = $false
            }
        }
    }
    return $allPassed
}

# Function to test initialization
function Test-Initialization {
    Write-ColorOutput "Yellow" "Testing application initialization..."
    try {
        $response = Invoke-WebRequest -Uri "${FrontendUrl}/api/init" -Method POST
        $content = $response.Content | ConvertFrom-Json

        if ($content.initialized -eq $true) {
            Write-ColorOutput "Green" "+ Application initialized successfully"
            Write-ColorOutput "Gray" "  Status: $($content.status)"
            Write-ColorOutput "Gray" "  Environment: $($content.environment)"
            return $true
        } else {
            Write-ColorOutput "Red" "- Application initialization failed"
            Write-ColorOutput "Red" "  Status: $($content.status)"
            Write-ColorOutput "Red" "  Error: $($content.error)"
            return $false
        }
    } catch {
        Write-ColorOutput "Red" "- Failed to initialize application"
        Write-ColorOutput "Red" "  Error: $($_.Exception.Message)"
        return $false
    }
}

Write-ColorOutput "Yellow" "Starting Docker test process..."

# Get secrets and create environment file
Write-ColorOutput "Yellow" "Validating secrets..."
$Secrets = node scripts/validate-secrets.js development | ConvertFrom-Json

# Build image with build arguments
Write-ColorOutput "Yellow" "Building Docker image..."
docker build --progress=plain --no-cache `
    --build-arg NODE_ENV=production `
    --build-arg GOOGLE_CLIENT_ID=$($Secrets.GOOGLE_CLIENT_ID) `
    --build-arg GOOGLE_CLIENT_SECRET=$($Secrets.GOOGLE_CLIENT_SECRET) `
    --build-arg ANTHROPIC_API_KEY=$($Secrets.ANTHROPIC_API_KEY) `
    --build-arg NEO4J_URI=$($Secrets.NEO4J_URI) `
    --build-arg NEO4J_USER=$($Secrets.NEO4J_USER) `
    --build-arg NEO4J_PASSWORD=$($Secrets.NEO4J_PASSWORD) `
    --build-arg GCS_BUCKET_NAME=$($Secrets.GCS_BUCKET_NAME) `
    --build-arg FRONTEND_URL=$FrontendUrl `
    -t $ImageName .

# Create environment file for runtime
$EnvVars = @"
NODE_ENV=development
NEO4J_URI=$($Secrets.NEO4J_URI)
NEO4J_USER=$($Secrets.NEO4J_USER)
NEO4J_PASSWORD=$($Secrets.NEO4J_PASSWORD)
GOOGLE_CLIENT_ID=$($Secrets.GOOGLE_CLIENT_ID)
GOOGLE_CLIENT_SECRET=$($Secrets.GOOGLE_CLIENT_SECRET)
ANTHROPIC_API_KEY=$($Secrets.ANTHROPIC_API_KEY)
GCS_BUCKET_NAME=$($Secrets.GCS_BUCKET_NAME)
FRONTEND_URL=$FrontendUrl
"@
$EnvVars | Out-File -FilePath ".env.docker" -Encoding UTF8

# Start container with environment file
Write-ColorOutput "Yellow" "Starting container..."
docker run -d `
    --name $ContainerName `
    -p "${LocalPort}:3000" `
    --env-file .env.docker `
    $ImageName

# Wait for container to start
Write-ColorOutput "Yellow" "Waiting for container to start..."
Start-Sleep -Seconds 15

# Initialize application first
$initSuccess = $false
$initAttempts = 3
for ($i = 1; $i -le $initAttempts; $i++) {
    Write-ColorOutput "Yellow" "Initialization attempt $i of $initAttempts..."
    if (Test-Initialization) {
        $initSuccess = $true
        break
    }
    if ($i -lt $initAttempts) {
        Write-ColorOutput "Yellow" "Waiting 5 seconds before next attempt..."
        Start-Sleep -Seconds 5
    }
}

if (-not $initSuccess) {
    Write-ColorOutput "Red" "Application initialization failed after $initAttempts attempts"
    Write-ColorOutput "Yellow" "Cleaning up..."
    docker logs $ContainerName > $LogFile
    docker rm -f $ContainerName
    Remove-Item -Path ".env.docker" -Force
    exit 1
}

# Test health endpoints with retries
$maxAttempts = 5
$attempt = 1
$success = $false

while ($attempt -le $maxAttempts -and -not $success) {
    Write-ColorOutput "Yellow" "Health check attempt $attempt of $maxAttempts..."
    
    if (Test-HealthEndpoints) {
        $success = $true
        Write-ColorOutput "Green" "+ All health checks passed!"
        break
    }
    
    if ($attempt -lt $maxAttempts) {
        Write-ColorOutput "Yellow" "Waiting 5 seconds before next attempt..."
        Start-Sleep -Seconds 5
    }
    $attempt++
}

# Cleanup
Write-ColorOutput "Yellow" "Cleaning up..."
docker logs $ContainerName > $LogFile
docker rm -f $ContainerName
Remove-Item -Path ".env.docker" -Force

if (-not $success) {
    Write-ColorOutput "Red" "Health checks failed after $maxAttempts attempts. See $LogFile for details."
    exit 1
} else {
    Write-ColorOutput "Green" "All tests passed successfully!"
    exit 0
}
