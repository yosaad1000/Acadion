# 🎓 Acadion - AI-Powered Student Management Platform

A comprehensive student management system with facial recognition-based attendance tracking, built with modern web technologies.

## ✨ Features

### 🔐 Authentication & User Management
- **Secure Login/Signup** with JWT authentication
- **Role-based Access Control** (Teachers & Students)
- **Profile Management** with face registration

### 👨‍🏫 Teacher Features
- **Create & Manage Classes** with unique invite codes
- **Face Recognition Attendance** - Upload group photos for instant attendance
- **Manual Attendance** - Traditional attendance marking
- **Student Management** - View enrolled students and their face registration status
- **Attendance Dashboard** - Track attendance history and statistics

### 👨‍🎓 Student Features
- **Join Classes** using invite codes
- **Face Registration** - Register face for automatic attendance
- **View Attendance** - Check personal attendance records
- **Profile Management** - Update personal information

### 🤖 AI-Powered Face Recognition
- **Multi-Face Detection** - Detect multiple faces in group photos
- **High Accuracy Recognition** - Advanced face matching algorithms
- **Duplicate Prevention** - Each student recognized only once per session
- **Confidence Scoring** - Reliability metrics for each recognition

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Heroicons** for UI icons
- **Vite** for fast development

### Backend
- **FastAPI** (Python) - High-performance API
- **Supabase** - Database and authentication
- **Pinecone** - Vector database for face embeddings
- **Face Recognition** - Python library for face processing
- **JWT** - Secure token-based authentication

### Infrastructure
- **Docker** - Containerized deployment
- **Nginx** - Frontend web server
- **CORS** - Cross-origin resource sharing

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.8+ (for local development)
- Node.js 16+ (for local development)

### Environment Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/acadion.git
cd acadion
```

2. **Set up environment variables**

Create `backend/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=student-faces
SECRET_KEY=your_jwt_secret_key
FACE_THRESHOLD=0.6
```

3. **Run with Docker**
```bash
docker-compose up -d
```

4. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 📱 How to Use

### For Teachers

1. **Sign Up** as a Teacher
2. **Create a Class** with name and description
3. **Share Invite Code** with students
4. **Take Attendance**:
   - Navigate to your class
   - Click "Take Attendance"
   - Upload a group photo or mark manually
   - View results and save attendance

### For Students

1. **Sign Up** as a Student
2. **Join Class** using teacher's invite code
3. **Register Face** in your profile
4. **Attend Class** - Your face will be automatically recognized in group photos

## 🎯 Face Recognition Workflow

1. **Photo Upload** - Teacher uploads group photo
2. **Face Detection** - System detects all faces in the image
3. **Face Matching** - Each face is compared against registered students
4. **Duplicate Removal** - Same student recognized only once (best match)
5. **Attendance Marking** - Recognized students marked present automatically

## 📊 System Architecture

```
Frontend (React) ←→ Backend (FastAPI) ←→ Supabase (Database)
                                    ↓
                              Pinecone (Face Vectors)
```

## 🔧 Configuration

### Face Recognition Settings
- **FACE_THRESHOLD**: 0.6 (adjustable for recognition sensitivity)
- **Detection Model**: HOG with CNN fallback
- **Vector Dimensions**: 128-dimensional face encodings

### Database Schema
- **Users**: Authentication and profile data
- **Subjects**: Class information and invite codes
- **Subject_Enrollments**: Student-class relationships
- **Attendance**: Attendance records with timestamps

## 🚀 Deployment

### Production Deployment
1. Set up production environment variables
2. Configure domain and SSL certificates
3. Deploy using Docker Compose
4. Set up monitoring and logging

### Scaling Considerations
- Use Redis for session management
- Implement CDN for static assets
- Consider horizontal scaling for high traffic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 API Documentation

The API is fully documented with OpenAPI/Swagger. Access the interactive documentation at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/subjects` - Create new class
- `POST /api/attendance/mark-face` - Face recognition attendance
- `GET /api/attendance/{subject_id}` - Get attendance records

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Password Hashing** using bcrypt
- **CORS Protection** with configurable origins
- **Input Validation** on all API endpoints
- **Face Data Encryption** in vector database

## 📈 Performance

- **Fast Face Recognition** - Optimized algorithms for quick processing
- **Efficient Database Queries** - Indexed for performance
- **Caching Strategy** - Reduced API calls and faster responses
- **Responsive UI** - Optimized for all device sizes

## 🐛 Troubleshooting

### Common Issues

**Face Recognition Not Working**
- Ensure good lighting in photos
- Check if student has registered their face
- Verify Pinecone API connection

**Authentication Errors**
- Check JWT token expiration
- Verify environment variables
- Clear browser cache and cookies

**Database Connection Issues**
- Verify Supabase credentials
- Check network connectivity
- Review database permissions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Face Recognition Library** - Adam Geitgey
- **FastAPI** - Sebastián Ramirez
- **React Team** - Meta
- **Supabase** - Open source Firebase alternative
- **Pinecone** - Vector database platform

---

**Built with ❤️ for modern education**

For support or questions, please open an issue on GitHub.