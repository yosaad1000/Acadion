@echo off
REM Build and Push Script for Attendify (Windows)
setlocal enabledelayedexpansion

REM Configuration
if "%DOCKER_USERNAME%"=="" set DOCKER_USERNAME=justs44d
if "%VERSION%"=="" set VERSION=latest
set BACKEND_IMAGE=%DOCKER_USERNAME%/attendify-backend:%VERSION%
set FRONTEND_IMAGE=%DOCKER_USERNAME%/attendify-frontend:%VERSION%

echo 🚀 Building and pushing Attendify Docker images...
echo Backend Image: %BACKEND_IMAGE%
echo Frontend Image: %FRONTEND_IMAGE%

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Login to DockerHub
echo 🔐 Logging into DockerHub...
docker login
if errorlevel 1 (
    echo ❌ Docker login failed
    exit /b 1
)

REM Build backend image
echo 🏗️ Building backend image...
docker build -f Dockerfile.backend -t %BACKEND_IMAGE% .
if errorlevel 1 (
    echo ❌ Backend build failed
    exit /b 1
)

REM Build frontend image
echo 🏗️ Building frontend image...
docker build -f Dockerfile.frontend -t %FRONTEND_IMAGE% .
if errorlevel 1 (
    echo ❌ Frontend build failed
    exit /b 1
)

REM Push images to DockerHub
echo 📤 Pushing backend image to DockerHub...
docker push %BACKEND_IMAGE%
if errorlevel 1 (
    echo ❌ Backend push failed
    exit /b 1
)

echo 📤 Pushing frontend image to DockerHub...
docker push %FRONTEND_IMAGE%
if errorlevel 1 (
    echo ❌ Frontend push failed
    exit /b 1
)

REM Tag as latest if version is not latest
if not "%VERSION%"=="latest" (
    echo 🏷️ Tagging images as latest...
    docker tag %BACKEND_IMAGE% %DOCKER_USERNAME%/attendify-backend:latest
    docker tag %FRONTEND_IMAGE% %DOCKER_USERNAME%/attendify-frontend:latest
    
    docker push %DOCKER_USERNAME%/attendify-backend:latest
    docker push %DOCKER_USERNAME%/attendify-frontend:latest
)

echo ✅ Successfully built and pushed all images!
echo.
echo 📋 Deployment Commands:
echo set DOCKER_USERNAME=%DOCKER_USERNAME%
echo set VERSION=%VERSION%
echo docker-compose -f docker-compose.deploy.yml up -d