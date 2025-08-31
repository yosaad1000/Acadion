---
layout: default
title: Getting Started
nav_order: 2
---

# 🚀 Getting Started

This guide will help you set up Acadion on your local machine in under 10 minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** and **Docker Compose** (recommended)
- **Node.js 16+** (for local development)
- **Python 3.8+** (for local development)
- **Git** for version control

## Quick Setup with Docker

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/acadion.git
cd acadion
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Face Recognition (Optional - for AI features)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=student-faces

# Security
SECRET_KEY=your-super-secret-jwt-key
FACE_THRESHOLD=0.6

# CORS (adjust for your domain)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Database Setup

Create your Supabase project:

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and API keys to the `.env` file
3. Run the database migrations:

```bash
# Copy the SQL from backend/migrations/001_initial_schema.sql
# Paste and run it in your Supabase SQL editor
```

### 4. Start the Application

```bash
# Start all services
docker-compose up -d

# Check if everything is running
docker-compose ps
```

### 5. Access Your Application

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

## Local Development Setup

If you prefer to run services individually for development:

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Mobile App (Optional)

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

## First Steps

### 1. Create Your First Teacher Account

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click "Sign Up" and select "Teacher"
3. Fill in your details and create your account
4. Verify your email if required

### 2. Create Your First Class

1. Log in to your teacher dashboard
2. Click "Create New Class"
3. Enter class name and description
4. Copy the generated invite code

### 3. Add Students

Students can join your class by:
1. Creating a student account
2. Using your class invite code
3. Registering their face for AI attendance

### 4. Take Attendance

1. Go to your class dashboard
2. Click "Take Attendance"
3. Upload a group photo or mark manually
4. Review and save the attendance

## Configuration Options

### Face Recognition Settings

Adjust recognition sensitivity in your `.env`:

```env
# Lower values = more strict matching
# Higher values = more lenient matching
FACE_THRESHOLD=0.6
```

### CORS Configuration

For production deployment, update allowed origins:

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### Database Configuration

The application uses Supabase PostgreSQL. Key tables:

- `users` - User authentication and profiles
- `subjects` - Class/course information
- `subject_enrollments` - Student-class relationships
- `attendance` - Attendance records
- `face_encodings` - Face recognition data

## Troubleshooting

### Common Issues

**Docker containers won't start:**
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :8000

# Restart Docker
docker-compose down
docker-compose up -d
```

**Supabase connection failed:**
- Verify your URL and API keys in `.env`
- Check if your IP is allowed in Supabase settings
- Ensure database tables are created

**Face recognition not working:**
- Verify Pinecone API key and index name
- Check if students have registered their faces
- Ensure good lighting in uploaded photos

**Frontend build errors:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Ask questions and get community help
- **Documentation**: Check our comprehensive guides
- **API Docs**: Interactive API documentation at `/docs`

## Next Steps

Once you have the basic setup running:

1. **Customize Branding** - Update logos and colors
2. **Configure Email** - Set up email notifications
3. **Add Sample Data** - Create test classes and students
4. **Deploy to Production** - Follow our deployment guide
5. **Set up Monitoring** - Configure logging and alerts

Ready to dive deeper? Check out our [Architecture Guide](architecture.html) to understand how everything works together.