import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Face Recognition Settings
FACE_THRESHOLD = float(os.getenv("FACE_THRESHOLD", "0.6"))
FACE_ENCODING_DIMENSION = 128
FACE_METRIC = "euclidean"

# Pinecone Configuration
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENVIRONMENT", "aws")
PINECONE_REGION = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")  # Using PINECONE_ENVIRONMENT for region
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "student-face-encodings")

# Face Recognition Microservice Configuration
FACE_RECOGNITION_SERVICE_URL = os.getenv("FACE_RECOGNITION_SERVICE_URL", "http://face-recognition-service:8001")
FACE_RECOGNITION_TIMEOUT = float(os.getenv("FACE_RECOGNITION_TIMEOUT", "30.0"))
FACE_RECOGNITION_FALLBACK_ENABLED = os.getenv("FACE_RECOGNITION_FALLBACK_ENABLED", "true").lower() == "true"

# Validate required Pinecone settings
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY environment variable is required")