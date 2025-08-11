# Setup Guide

This guide will help you set up the AI-Powered Student Management Platform on your local machine.

## Prerequisites

### Required Software
- **Docker** (recommended) or **Podman**
- **Node.js 18+** (for local development)
- **Python 3.9+** (for local development)

### Supabase Account
1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and API keys from Settings > API

### Optional Services
- **Pinecone** account for face recognition (free tier available)
- **Stripe** account for payment processing
- **SendGrid** account for email notifications

## Quick Start (Docker - Recommended)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd student-management-platform
```

### 2. Configure Environment
```bash
# Copy environment template
cp backend/.env.example backend/.env

# Edit with your configuration
nano backend/.env  # or use your preferred editor
```

### 3. Run Setup Script
```bash
# On Linux/Mac
chmod +x scripts/setup.sh
./scripts/setup.sh

# On Windows
scripts\setup.bat
```

### 4. Access Applications
- **Web App**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/api/health

## Manual Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start the server
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Mobile Setup
```bash
cd mobile
npm install
npx expo start
```

## Environment Configuration

Edit `backend/.env` with your settings:

```env
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Security (Required)
SECRET_KEY=your-super-secret-key-change-this

# Face Recognition (Optional but recommended)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=student-faces

# External Services (Optional)
STRIPE_SECRET_KEY=your-stripe-key
SENDGRID_API_KEY=your-sendgrid-key
```

## Supabase Database Setup

### 1. Create Tables
Run the following SQL in your Supabase SQL editor:

```sql
-- Students table
CREATE TABLE students (
    student_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    department_id VARCHAR,
    batch_year INTEGER,
    current_semester INTEGER,
    course_enrolled_ids TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Departments table
CREATE TABLE departments (
    dept_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    hod VARCHAR
);

-- Faculty table
CREATE TABLE faculty (
    faculty_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE,
    departments VARCHAR,
    subjects TEXT[]
);

-- Subjects table
CREATE TABLE subjects (
    subject_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    department_id VARCHAR,
    credits INTEGER,
    semester INTEGER,
    is_elective BOOLEAN DEFAULT FALSE,
    enrolled_students TEXT[],
    faculty_ids TEXT[]
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR REFERENCES students(student_id),
    subject_id VARCHAR REFERENCES subjects(subject_id),
    date DATE NOT NULL,
    status VARCHAR NOT NULL,
    marked_by VARCHAR,
    confidence_score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Set up Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Create policies (example for students table)
CREATE POLICY "Students can view their own data" ON students
    FOR SELECT USING (auth.uid()::text = student_id);

CREATE POLICY "Faculty can view all students" ON students
    FOR SELECT USING (auth.role() = 'faculty');
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using the port
   lsof -i :8000  # or :3000
   
   # Kill the process or change ports in docker-compose.yml
   ```

2. **Docker permission denied**
   ```bash
   # Add user to docker group (Linux)
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

3. **Face recognition not working**
   - Ensure Pinecone API key is correct
   - Check if the index exists in Pinecone
   - Verify camera permissions for mobile app

4. **Supabase connection issues**
   - Verify URL and API keys
   - Check if your IP is allowed (if using IP restrictions)
   - Ensure RLS policies are set up correctly

### Getting Help

1. Check the logs:
   ```bash
   # Docker logs
   docker-compose logs backend
   docker-compose logs frontend
   
   # Local development
   # Check terminal output for errors
   ```

2. Verify services are running:
   ```bash
   docker-compose ps
   ```

3. Test API endpoints:
   ```bash
   curl http://localhost:8000/api/health
   ```

## Next Steps

1. **Configure Supabase**: Set up your database schema and authentication
2. **Add Sample Data**: Create test students, faculty, and subjects
3. **Test Face Recognition**: Upload student photos and test attendance
4. **Customize UI**: Modify the frontend to match your institution's branding
5. **Deploy**: Use the production docker-compose file for deployment

For more detailed information, check the other documentation files in the `/docs` directory.