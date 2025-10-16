# Face Recognition Microservice

A dedicated FastAPI microservice for AI-powered face recognition processing, designed for the Acadion platform with GPU optimization and scalable architecture.

## Features

- **GPU-Optimized Processing**: CUDA support for accelerated face detection and recognition
- **Async Processing**: Non-blocking face recognition with queue management
- **Pinecone Integration**: Vector database for efficient face embedding storage and retrieval
- **Health Monitoring**: Built-in health checks and metrics for auto-scaling
- **Docker Support**: Multi-stage builds for both GPU and CPU environments
- **Internal API**: RESTful API designed for microservice communication

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Main Backend  │───▶│ Face Recognition │───▶│   Pinecone DB   │
│    (FastAPI)    │    │   Microservice   │    │ (Vector Store)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ GPU/CPU      │
                       │ Processing   │
                       └──────────────┘
```

## API Endpoints

### Core Endpoints

- `POST /process-image` - Process image for face detection and recognition
- `POST /register-face` - Register a new face for a user
- `DELETE /face/{user_id}` - Delete a user's face encoding
- `PUT /face/{user_id}/subjects` - Update subject associations

### Monitoring Endpoints

- `GET /health` - Health check for load balancers
- `GET /metrics` - Service metrics for auto-scaling

## Quick Start

### Prerequisites

- Docker and Docker Compose
- NVIDIA Docker runtime (for GPU support)
- Pinecone API key and index

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure environment variables:
```bash
# Required
PINECONE_API_KEY=your_api_key_here
PINECONE_INDEX_NAME=acadion-faces

# Optional
FACE_THRESHOLD=0.6
LOG_LEVEL=INFO
```

### Running with Docker Compose

#### GPU Version (Recommended)
```bash
docker-compose up face-recognition-gpu
```

#### CPU Version (Fallback)
```bash
docker-compose up face-recognition-cpu
```

### Building Custom Images

#### Linux/Mac
```bash
./build.sh latest
```

#### Windows PowerShell
```powershell
.\build.ps1 -Version latest
```

## Development

### Local Development Setup

1. Create virtual environment:
```bash
python3.9 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run development server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PINECONE_API_KEY` | Pinecone API key (required) | - |
| `PINECONE_INDEX_NAME` | Pinecone index name | `acadion-faces` |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `us-east-1` |
| `FACE_THRESHOLD` | Face recognition threshold | `0.6` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `MAX_CONCURRENT_REQUESTS` | Max concurrent requests | `10` |
| `CUDA_VISIBLE_DEVICES` | GPU device selection | `0` |

### GPU Configuration

For GPU support, ensure:
- NVIDIA drivers are installed
- NVIDIA Docker runtime is configured
- CUDA 11.8+ is available

## Deployment

### AWS ECS with GPU Instances

The service is designed to run on AWS ECS with G4 instances:

```yaml
# ECS Task Definition (excerpt)
requiresCompatibilities:
  - EC2
cpu: 4096
memory: 16384
placementConstraints:
  - type: memberOf
    expression: 'attribute:ecs.instance-type =~ g4dn.*'
```

### Auto-Scaling Configuration

The service exposes metrics for auto-scaling:
- Queue length
- Processing time
- GPU utilization
- Error rate

## API Usage Examples

### Process Image for Recognition

```python
import httpx

async with httpx.AsyncClient() as client:
    with open("group_photo.jpg", "rb") as f:
        response = await client.post(
            "http://face-service:8001/process-image",
            files={"file": f},
            data={"subject_id": "math-101"}
        )
    
    result = response.json()
    print(f"Recognized {result['faces_recognized']} students")
```

### Register New Face

```python
async with httpx.AsyncClient() as client:
    with open("student_photo.jpg", "rb") as f:
        response = await client.post(
            "http://face-service:8001/register-face",
            files={"file": f},
            data={
                "user_id": "student123",
                "subject_ids": "math-101,physics-201"
            }
        )
    
    result = response.json()
    print(f"Registration: {result['success']}")
```

## Performance Optimization

### GPU Optimization
- Uses CUDA-accelerated OpenCV when available
- CNN model for higher accuracy on GPU
- Batch processing for multiple faces

### Memory Management
- Efficient image processing with PIL
- Numpy array optimization
- Proper cleanup of temporary data

### Caching Strategy
- Face embeddings cached in Pinecone
- Optional Redis integration for temporary caching
- Optimized vector similarity search

## Monitoring and Logging

### Health Checks
- Service health endpoint
- Pinecone connectivity check
- GPU availability verification

### Metrics Collection
- Processing time tracking
- Request count and error rates
- GPU utilization monitoring
- Queue length monitoring

### Logging
- Structured JSON logging
- Configurable log levels
- Request tracing support

## Security Considerations

- Non-root container execution
- Input validation and sanitization
- Rate limiting support
- Internal network communication only

## Troubleshooting

### Common Issues

1. **GPU not detected**
   - Verify NVIDIA drivers and Docker runtime
   - Check CUDA_VISIBLE_DEVICES setting
   - Fall back to CPU version if needed

2. **Pinecone connection errors**
   - Verify API key and index name
   - Check network connectivity
   - Validate index configuration

3. **Memory issues**
   - Reduce MAX_CONCURRENT_REQUESTS
   - Monitor container memory limits
   - Check for memory leaks in processing

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is part of the Acadion platform and follows the same licensing terms.