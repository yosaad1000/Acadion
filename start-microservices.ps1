# Acadion Microservices Startup Script (PowerShell)

param(
    [bool]$GpuSupport = $true,
    [bool]$IncludeFrontend = $false,
    [bool]$ProductionMode = $false
)

# Configuration
$ComposeFile = "docker-compose.microservices.yml"

Write-Host "🚀 Starting Acadion Microservices Architecture" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Error: Docker is not running" -ForegroundColor Red
    exit 1
}

# Check if docker-compose is available
if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: docker-compose is not installed" -ForegroundColor Red
    exit 1
}

# Check for environment file
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path "backend\.env.example") {
        Copy-Item "backend\.env.example" ".env"
        Write-Host "📝 Please edit .env file with your configuration" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "❌ No .env.example template found" -ForegroundColor Red
        exit 1
    }
}

# Build profiles based on configuration
$Profiles = @()
if ($IncludeFrontend) {
    $Profiles += "--profile", "frontend"
}

if ($ProductionMode) {
    $Profiles += "--profile", "production"
}

if (-not $GpuSupport) {
    $Profiles += "--profile", "cpu-fallback"
}

Write-Host "📋 Configuration:" -ForegroundColor Blue
Write-Host "  GPU Support: $GpuSupport"
Write-Host "  Include Frontend: $IncludeFrontend"
Write-Host "  Production Mode: $ProductionMode"
Write-Host "  Compose File: $ComposeFile"
Write-Host ""

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f $ComposeFile down --remove-orphans

# Build and start services
Write-Host "🔨 Building and starting services..." -ForegroundColor Yellow
if ($Profiles.Count -gt 0) {
    docker-compose -f $ComposeFile up --build -d @Profiles
} else {
    docker-compose -f $ComposeFile up --build -d
}

# Wait for services to be healthy
Write-Host "⏳ Waiting for services to be healthy..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Blue

# Check Redis
$redisStatus = docker-compose -f $ComposeFile ps redis
if ($redisStatus -match "Up") {
    Write-Host "✅ Redis: Healthy" -ForegroundColor Green
} else {
    Write-Host "❌ Redis: Unhealthy" -ForegroundColor Red
}

# Check Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend: Healthy" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend: Unhealthy" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend: Unhealthy" -ForegroundColor Red
}

# Check Face Recognition Service
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Face Recognition Service: Healthy" -ForegroundColor Green
    } else {
        Write-Host "❌ Face Recognition Service: Unhealthy" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Face Recognition Service: Unhealthy" -ForegroundColor Red
    
    # Check CPU fallback if GPU service failed
    if (-not $GpuSupport) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8002/health" -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "🔄 CPU Fallback Service: Available" -ForegroundColor Yellow
            }
        } catch {
            # Ignore CPU fallback check failure
        }
    }
}

# Check Frontend (if enabled)
if ($IncludeFrontend) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend: Healthy" -ForegroundColor Green
        } else {
            Write-Host "❌ Frontend: Unhealthy" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Frontend: Unhealthy" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "🎉 Microservices startup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📡 Service URLs:" -ForegroundColor Blue
Write-Host "  Backend API: http://localhost:8000"
Write-Host "  Backend Docs: http://localhost:8000/docs"
Write-Host "  Face Recognition: http://localhost:8001"
Write-Host "  Face Recognition Docs: http://localhost:8001/docs"
Write-Host "  Redis: localhost:6379"

if ($IncludeFrontend) {
    Write-Host "  Frontend: http://localhost:3000"
}

if ($ProductionMode) {
    Write-Host "  Load Balancer: http://localhost:80"
}

Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Blue
Write-Host "  View logs: docker-compose -f $ComposeFile logs -f [service]"
Write-Host "  Stop services: docker-compose -f $ComposeFile down"
Write-Host "  Restart service: docker-compose -f $ComposeFile restart [service]"
Write-Host "  Scale service: docker-compose -f $ComposeFile up -d --scale [service]=N"
Write-Host ""
Write-Host "🧪 Test Commands:" -ForegroundColor Blue
Write-Host "  Test backend: Invoke-WebRequest http://localhost:8000/api/health"
Write-Host "  Test face service: Invoke-WebRequest http://localhost:8001/health"