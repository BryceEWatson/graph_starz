# Common PowerShell functions for Graph Starz scripts

function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Color,
        [Parameter(Mandatory=$true)]
        [string]$Message
    )
    
    $prevColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $prevColor
}

function Test-CommandExists {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command
    )
    
    $exists = Get-Command -Name $Command -ErrorAction SilentlyContinue
    return $null -ne $exists
}

function Wait-ForHealthCheck {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Url,
        [int]$MaxAttempts = 5,
        [int]$DelaySeconds = 5
    )
    
    Write-Host "Checking health at $Url"
    $attempt = 1
    
    while ($attempt -le $MaxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Host "Health check passed on attempt $attempt"
                return $true
            }
        } catch {
            Write-Host "Attempt $attempt failed: $_"
        }
        
        if ($attempt -lt $MaxAttempts) {
            Write-Host "Waiting $DelaySeconds seconds before next attempt..."
            Start-Sleep -Seconds $DelaySeconds
        }
        $attempt++
    }
    
    Write-Error "Health check failed after $MaxAttempts attempts"
    return $false
}

function Test-RequiredTools {
    $tools = @("docker", "gcloud", "node")
    $allPresent = $true
    
    foreach ($tool in $tools) {
        if (-not (Test-CommandExists $tool)) {
            Write-ColorOutput Red "❌ Required tool not found: $tool"
            $allPresent = $false
        }
    }
    
    return $allPresent
}
