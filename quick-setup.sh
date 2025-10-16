#!/bin/bash
# Quick setup using pre-built face recognition image

echo "🚀 Quick setup with pre-built Docker image..."

cd /home/ec2-user/app

# Create Dockerfile using your existing base image
cat > Dockerfile << 'EOF'
# Use the face recognition base image (already has dlib installed!)
FROM animcogn/face_recognition

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Set environment variables
ENV PYTHONPATH=/app

# Expose the port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# Update requirements.txt with your actual backend requirements
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

# Create a simple main.py for testing
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

echo "✅ Files created!"
echo "🐳 Building Docker image (this will be much faster with pre-built base)..."

# Build and run with Docker directly (not docker-compose)
sudo docker build -t acadion-backend .
sudo docker run -d -p 8000:8000 --name acadion-backend \
  -e SUPABASE_URL=https://scijpejtvneuqbhkoxuz.supabase.co \
  -e SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1OTcxNDEsImV4cCI6MjA3MTE3MzE0MX0.Z6Q_DmsuHYOOvCGed5hcKDrT93XPL5hHwCyGDREcmmw \
  -e SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWpwZWp0dm5ldXFiaGtveHV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU5NzE0MSwiZXhwIjoyMDcxMTczMTQxfQ.tpQB8d8iSPpCPV7cHfkxfKlobh64nejIczdt5YaG1fM \
  -e SECRET_KEY=super-secret-jwt-token-with-at-least-32-characters-long \
  -e PINECONE_API_KEY=pcsk_6mKcJ2_8BDyf8mT69ouihdw2wj5cmRU9eqaUoqbz25pmfMWftHiVAox5J3gfi7UaY4ivpn \
  -e PINECONE_ENVIRONMENT=us-east-1 \
  -e PINECONE_INDEX_NAME=student-face-encodings \
  -e ALLOWED_ORIGINS=https://acadion-8rygmefra-yosaad1000s-projects.vercel.app,http://localhost:5173 \
  --restart unless-stopped \
  acadion-backend

echo "🎉 Backend is starting up!"
echo "🔗 API URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
echo "📚 API Docs: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/docs"
echo ""
echo "⏳ Give it 2-3 minutes to fully start, then test the endpoints!"