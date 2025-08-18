#!/bin/bash

echo "Starting Integration Tests in Docker..."

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "Error: backend/.env file not found. Please create it from backend/.env.example"
    exit 1
fi

# Clean up any existing test containers
echo "Cleaning up existing test containers..."
docker-compose -f docker-compose.test.yml down -v

# Build and start test environment
echo "Building and starting test environment..."
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Capture exit code
EXIT_CODE=$?

# Clean up
echo "Cleaning up test containers..."
docker-compose -f docker-compose.test.yml down -v

# Copy test reports if they exist
if [ -f "test_reports/integration_test_report.txt" ]; then
    echo "Test report available at: test_reports/integration_test_report.txt"
    cat test_reports/integration_test_report.txt
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "Integration tests completed successfully!"
else
    echo "Integration tests failed!"
fi

exit $EXIT_CODE