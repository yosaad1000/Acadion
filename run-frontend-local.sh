#!/bin/bash

echo "Starting Student Management System - Frontend Only (Local)"
echo "========================================================"

echo ""
echo "Step 1: Starting backend services (Docker)..."
docker-compose -f docker-compose.backend-only.yml up -d

echo ""
echo "Step 2: Waiting for backend to be ready..."
sleep 5

echo ""
echo "Step 3: Installing frontend dependencies..."
cd frontend
npm install

echo ""
echo "Step 4: Starting frontend development server..."
echo "Frontend will be available at: http://localhost:5173"
echo "Backend API will be available at: http://localhost:8000"
echo ""
npm run dev

echo ""
echo "Frontend stopped. To stop backend services, run:"
echo "docker-compose -f docker-compose.backend-only.yml down"