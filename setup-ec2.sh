#!/bin/bash
# EC2 Setup Script for Acadion Backend

echo "🚀 Setting up Acadion Backend on EC2..."

# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install -y git

# Create app directory
mkdir -p /home/ec2-user/app
cd /home/ec2-user/app

# Create Dockerfile for backend
cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dlib and face_recognition
RUN pip install dlib face_recognition

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
supabase==2.0.2
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
httpx==0.25.2
pillow==10.1.0
numpy==1.24.3
opencv-python-headless==4.8.1.78
pinecone-client==2.2.4
redis==5.0.1
celery==5.3.4
aiofiles==23.2.1
jinja2==3.1.2
EOF

# Create main.py (simplified version)
cat > main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Acadion Backend API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Acadion Backend API is running!", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "backend"}

@app.get("/api/health")
async def api_health_check():
    return {"status": "healthy", "service": "backend-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=https://scijpejtvneuqbhkoxuz.supabase.co
      - SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw
      - SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM
      - SECRET_KEY=super-secret-jwt-token-with-at-least-32-characters-long
      - PINECONE_API_KEY=pcsk_6mKcJ2_8BDyf8mT69ouihdw2wj5cmRU9eqaUoqbz25pmfMWftHiVAox5J3gfi7UaY4ivpn
      - PINECONE_ENVIRONMENT=us-east-1
      - PINECONE_INDEX_NAME=student-face-encodings
      - ALLOWED_ORIGINS=https://acadion-8rygmefra-yosaad1000s-projects.vercel.app,http://localhost:5173
    restart: unless-stopped
EOF

echo "✅ Files created successfully!"
echo "🐳 Building and starting Docker container..."

# Build and start the container
sudo docker-compose up -d --build

echo "🎉 Backend deployment complete!"
echo "🔗 API URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
echo "📚 API Docs: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/docs"