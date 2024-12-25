# PowerShell script for monitoring Cloud Run service status
param(
    [string]$ServiceName = "graph-starz",
    [string]$Region = "us-west1",
    [int]$IntervalSeconds = 60,
    [int]$MaxAttempts = 0  # 0 means run indefinitely
)

# Function to write colored output
function Write-ColorOutput($Color, $Message) {
    $prevColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $prevColor
}

# Function to check service health
function Test-ServiceHealth($Url) {
    $endpoints = @(
        @{ Path = "/api/health"; Name = "Main Health" },
        @{ Path = "/api/health/db"; Name = "Database Health" },
        @{ Path = "/api/health/storage"; Name = "Storage Health" }
    )
    
    $status = @{
        Healthy = $true
        Details = @{}
    }
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "${Url}$($endpoint.Path)" -Method GET
            $content = $response.Content | ConvertFrom-Json
            
            $status.Details[$endpoint.Name] = @{
                Healthy = $content.healthy
                ResponseTime = $content.details.totalResponseTime
                Timestamp = $content.timestamp
            }
            
            if (-not $content.healthy) {
                $status.Healthy = $false
            }
        } catch {
            $status.Healthy = $false
            $status.Details[$endpoint.Name] = @{
                Healthy = $false
                Error = $_.Exception.Message
                Timestamp = (Get-Date).ToUniversalTime().ToString("o")
            }
        }
    }
    
    return $status
}

# Get service URL
$ServiceUrl = gcloud run services describe $ServiceName --region $Region --format="value(status.url)"
if (-not $ServiceUrl) {
    Write-ColorOutput "Red" "Failed to get service URL"
    exit 1
}

Write-Host "Monitoring service: $ServiceName"
Write-Host "Service URL: $ServiceUrl"
Write-Host "Check interval: $IntervalSeconds seconds"
Write-Host "Press Ctrl+C to stop monitoring"

$attempt = 0
while (($MaxAttempts -eq 0) -or ($attempt -lt $MaxAttempts)) {
    $attempt++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "`n[$timestamp] Checking service status..."
    
    # Get service status
    $serviceStatus = gcloud run services describe $ServiceName --region $Region --format="json" | ConvertFrom-Json
    Write-Host "Service Status: $($serviceStatus.status.conditions[0].type)"
    
    # Check health endpoints
    $health = Test-ServiceHealth $ServiceUrl
    
    if ($health.Healthy) {
        Write-ColorOutput "Green" "✓ Service is healthy"
    } else {
        Write-ColorOutput "Red" "✗ Service has issues"
    }
    
    # Display detailed status
    foreach ($endpoint in $health.Details.Keys) {
        $status = $health.Details[$endpoint]
        if ($status.Healthy) {
            Write-ColorOutput "Green" "  ✓ $endpoint"
            Write-Host "    Response Time: $($status.ResponseTime)ms"
        } else {
            Write-ColorOutput "Red" "  ✗ $endpoint"
            if ($status.Error) {
                Write-Host "    Error: $($status.Error)"
            }
        }
        Write-Host "    Last Check: $($status.Timestamp)"
    }
    
    if ($MaxAttempts -eq 0) {
        Write-Host "`nWaiting $IntervalSeconds seconds for next check..."
        Start-Sleep -Seconds $IntervalSeconds
    } elseif ($attempt -lt $MaxAttempts) {
        Write-Host "`nAttempt $attempt of $MaxAttempts"
        Write-Host "Waiting $IntervalSeconds seconds for next check..."
        Start-Sleep -Seconds $IntervalSeconds
    }
}
