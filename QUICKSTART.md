# 🚀 Quick Start Guide

Get your AI-Powered Student Management Platform running in 5 minutes!

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Supabase** account (free tier works)

## Step 1: Clone and Setup

```bash
git clone <your-repository-url>
cd student-management-platform
```

## Step 2: Database Setup (Already Done! ✅)

Great news! You already have a local Supabase instance running with these credentials:

- **Supabase Studio**: http://127.0.0.1:54323
- **API URL**: http://127.0.0.1:54321
- **Database**: postgresql://postgres:postgres@127.0.0.1:54322/postgres

Your `backend/.env` file has been automatically configured with the local Supabase credentials.

## Step 3: Set Up Database Schema

1. **Open Supabase Studio**: http://127.0.0.1:54323
2. **Go to SQL Editor** (left sidebar)
3. **Copy and paste** the contents of `backend/migrations/001_initial_schema.sql`
4. **Click "Run"** to create all tables and sample data

## Step 4: Start the Platform

### Option A: Automated Setup (Recommended)
```bash
# Linux/Mac
chmod +x setup-local.sh && ./setup-local.sh

# Windows
setup-local.bat
```

### Option B: Manual Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Mobile (optional, new terminal)
cd mobile
npm install
npx expo start
```

## Step 5: Access Your Platform

- **🌐 Web Application**: http://localhost:5173
- **📚 API Documentation**: http://localhost:8000/docs
- **🔍 Health Check**: http://localhost:8000/api/health
- **🗄️ Supabase Studio**: http://127.0.0.1:54323

## Step 6: Test with Sample Data

Your database now includes sample data:

- **4 Departments**: Computer Science, Electrical Engineering, etc.
- **3 Faculty Members**: Dr. John Smith, Dr. Jane Doe, Dr. Bob Wilson
- **6 Subjects**: CS101, CS102, CS201, CS301, EE101, EE201
- **4 Students**: Alice Johnson, Bob Brown, Charlie Davis, Diana Wilson
- **Sample Attendance**: Recent attendance records
- **Sample Grades**: Midterm and quiz grades
- **Sample Fees**: Tuition and other fee records

You can view and modify this data through the Supabase Studio interface.

## Step 7: Mobile App (Optional)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go app on your phone.

## 🎉 You're Ready!

Your platform is now running with:
- ✅ Modern React web interface
- ✅ FastAPI backend with automatic documentation
- ✅ Supabase database integration
- ✅ Docker containerization
- ✅ Mobile app ready for development

## Next Steps

1. **Add Sample Data**: Create test students and faculty
2. **Configure Face Recognition**: Set up Pinecone for AI attendance
3. **Customize Branding**: Update colors and logos
4. **Deploy to Production**: Use `docker-compose.prod.yml`

## Need Help?

- 📖 **Full Setup Guide**: [docs/SETUP.md](docs/SETUP.md)
- 🛠️ **Development Guide**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- 🐛 **Issues**: Check Docker logs with `docker-compose logs`

## Common Issues

**Port already in use?**
```bash
# Change ports in docker-compose.yml or kill existing processes
lsof -i :3000  # Check what's using port 3000
```

**Supabase connection failed?**
- Verify your URL and API keys in `backend/.env`
- Check if your IP is allowed in Supabase settings

**Docker permission denied?**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Then log out and back in
```

---

**Happy coding! 🎓✨**