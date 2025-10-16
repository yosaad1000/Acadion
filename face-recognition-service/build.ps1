# Face Recognition Microservice Build Script (PowerShell)

param(
    [string]$Version = "latest",
    [bool]$BuildGpu = $true,
    [bool]$BuildCpu = $true
)

# Configuration
$ImageName = "acadion/face-recognition"

Write-Host "Building Face Recognition Microservice Docker Images" -ForegroundColor Green
Write-Host "Version: $Version"
Write-Host "GPU Build: $BuildGpu"
Write-Host "CPU Build: $BuildCpu"
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "Error: Docker is not running" -ForegroundColor Red
    exit 1
}

# Build GPU-optimized image
if ($BuildGpu) {
    Write-Host "Building GPU-optimized image..." -ForegroundColor Yellow
    
    docker build `
        --file Dockerfile `
        --tag "${ImageName}:${Version}-gpu" `
        --tag "${ImageName}:latest-gpu" `
        --build-arg BUILDKIT_INLINE_CACHE=1 `
        .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ GPU image built successfully" -ForegroundColor Green
        Write-Host "Image: ${ImageName}:${Version}-gpu"
        Write-Host ""
    } else {
        Write-Host "❌ GPU image build failed" -ForegroundColor Red
        exit 1
    }
}

# Build CPU-only image
if ($BuildCpu) {
    Write-Host "Building CPU-only image..." -ForegroundColor Yellow
    
    docker build `
        --file Dockerfile.cpu `
        --tag "${ImageName}:${Version}-cpu" `
        --tag "${ImageName}:latest-cpu" `
        --build-arg BUILDKIT_INLINE_CACHE=1 `
        .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CPU image built successfully" -ForegroundColor Green
        Write-Host "Image: ${ImageName}:${Version}-cpu"
        Write-Host ""
    } else {
        Write-Host "❌ CPU image build failed" -ForegroundColor Red
        exit 1
    }
}

# Create multi-arch manifest (optional)
if ($BuildGpu -and $BuildCpu) {
    Write-Host "Creating multi-arch manifest..." -ForegroundColor Yellow
    
    # Tag the GPU version as the default
    docker tag "${ImageName}:${Version}-gpu" "${ImageName}:${Version}"
    docker tag "${ImageName}:${Version}-gpu" "${ImageName}:latest"
    
    Write-Host "✅ Multi-arch manifest created" -ForegroundColor Green
    Write-Host "Default image (GPU): ${ImageName}:${Version}"
}

Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Available images:"
docker images | Select-String $ImageName | Select-Object -First 10

Write-Host ""
Write-Host "To run the service:"
Write-Host "  GPU version: docker run -p 8001:8001 --gpus all ${ImageName}:${Version}-gpu"
Write-Host "  CPU version: docker run -p 8001:8001 ${ImageName}:${Version}-cpu"
Write-Host ""
Write-Host "To push to registry:"
Write-Host "  docker push ${ImageName}:${Version}-gpu"
Write-Host "  docker push ${ImageName}:${Version}-cpu"