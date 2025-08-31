---
layout: default
title: Home
---

<div style="text-align: center; margin: 2rem 0;">
  <div style="display: inline-flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; justify-content: center;">
    <span class="badge"><i class="fab fa-python"></i> Python 3.8+</span>
    <span class="badge"><i class="fab fa-react"></i> React 18</span>
    <span class="badge"><i class="fas fa-robot"></i> AI-Powered</span>
    <span class="badge success"><i class="fas fa-docker"></i> Docker Ready</span>
    <span class="badge"><i class="fas fa-shield-alt"></i> Secure</span>
  </div>
  
  <div style="margin: 2rem 0;">
    <a href="{{ '/getting-started' | relative_url }}" class="btn">
      <i class="fas fa-rocket"></i> Get Started
    </a>
    <a href="https://github.com/yosaad1000/Acadion" class="btn btn-secondary" target="_blank">
      <i class="fab fa-github"></i> View on GitHub
    </a>
    <a href="{{ '/api-documentation' | relative_url }}" class="btn btn-secondary">
      <i class="fas fa-code"></i> API Docs
    </a>
  </div>
</div>

## ✨ Why Choose Acadion?

A modern, comprehensive student management system that revolutionizes how educational institutions handle attendance tracking through cutting-edge AI technology.

## ✨ Key Features

<div class="feature-grid">
  <div class="feature-card">
    <h3><i class="fas fa-shield-alt"></i> Authentication & Security</h3>
    <ul>
      <li><strong>JWT-based Authentication</strong> with secure token handling</li>
      <li><strong>Role-based Access Control</strong> (Teachers & Students)</li>
      <li><strong>Supabase Integration</strong> for scalable user management</li>
      <li><strong>Data Encryption</strong> at rest and in transit</li>
    </ul>
  </div>

  <div class="feature-card">
    <h3><i class="fas fa-chalkboard-teacher"></i> Teacher Dashboard</h3>
    <ul>
      <li><strong>Class Management</strong> - Create and manage classes with unique invite codes</li>
      <li><strong>AI-Powered Attendance</strong> - Upload group photos for instant face recognition</li>
      <li><strong>Student Analytics</strong> - Track attendance patterns and performance</li>
      <li><strong>Manual Override</strong> - Traditional attendance marking when needed</li>
    </ul>
  </div>

  <div class="feature-card">
    <h3><i class="fas fa-user-graduate"></i> Student Portal</h3>
    <ul>
      <li><strong>Easy Class Enrollment</strong> using teacher-provided invite codes</li>
      <li><strong>Face Registration</strong> - One-time setup for automatic attendance</li>
      <li><strong>Attendance History</strong> - View personal attendance records</li>
      <li><strong>Profile Management</strong> - Update personal information and preferences</li>
    </ul>
  </div>

  <div class="feature-card">
    <h3><i class="fas fa-robot"></i> Advanced AI Features</h3>
    <ul>
      <li><strong>Multi-Face Detection</strong> - Process multiple students in single photo</li>
      <li><strong>High Accuracy Recognition</strong> - Advanced face matching algorithms</li>
      <li><strong>Duplicate Prevention</strong> - Smart detection prevents double-counting</li>
      <li><strong>Confidence Scoring</strong> - Reliability metrics for each recognition</li>
    </ul>
  </div>
</div>

## 🛠️ Technology Stack

<div class="feature-grid">
  <div class="feature-card">
    <h3><i class="fab fa-react"></i> Frontend</h3>
    <ul>
      <li><strong>React 18</strong> with TypeScript for type safety</li>
      <li><strong>Tailwind CSS</strong> for modern, responsive design</li>
      <li><strong>Vite</strong> for lightning-fast development</li>
      <li><strong>React Query</strong> for efficient state management</li>
    </ul>
  </div>

  <div class="feature-card">
    <h3><i class="fab fa-python"></i> Backend</h3>
    <ul>
      <li><strong>FastAPI</strong> - High-performance Python API framework</li>
      <li><strong>Supabase</strong> - PostgreSQL database with real-time features</li>
      <li><strong>Pinecone</strong> - Vector database for face embeddings</li>
      <li><strong>OpenCV</strong> - Computer vision for face processing</li>
    </ul>
  </div>

  <div class="feature-card">
    <h3><i class="fas fa-cloud"></i> Infrastructure</h3>
    <ul>
      <li><strong>Docker</strong> - Containerized deployment</li>
      <li><strong>Nginx</strong> - Production web server</li>
      <li><strong>GitHub Actions</strong> - CI/CD pipeline</li>
      <li><strong>Redis</strong> - Caching and session management</li>
    </ul>
  </div>

  <div class="feature-card">
    <h3><i class="fas fa-mobile-alt"></i> Mobile & More</h3>
    <ul>
      <li><strong>React Native</strong> - Cross-platform mobile app</li>
      <li><strong>Expo</strong> - Mobile development platform</li>
      <li><strong>Progressive Web App</strong> - Offline capabilities</li>
      <li><strong>Responsive Design</strong> - Works on all devices</li>
    </ul>
  </div>
</div>

## 🚀 Quick Start

Get up and running in under 5 minutes:

```bash
# Clone the repository
git clone https://github.com/yosaad1000/Acadion.git
cd Acadion

# Set up environment
cp backend/.env.example backend/.env
# Edit .env with your Supabase credentials

# Start with Docker
docker-compose up -d

# Access the application
# Web: http://localhost:3000
# API: http://localhost:8000/docs
```

## 📚 Documentation

- [Getting Started Guide](getting-started.html) - Complete setup instructions
- [API Documentation](api-documentation.html) - Comprehensive API reference
- [Architecture Overview](architecture.html) - System design and components
- [Deployment Guide](deployment.html) - Production deployment instructions
- [Contributing](contributing.html) - How to contribute to the project

## 🎯 Use Cases

<div class="feature-grid">
  <div class="feature-card">
    <h3><i class="fas fa-university"></i> Educational Institutions</h3>
    <ul>
      <li><strong>Universities</strong> - Manage large student populations efficiently</li>
      <li><strong>K-12 Schools</strong> - Streamline daily attendance tracking</li>
      <li><strong>Training Centers</strong> - Monitor student engagement and participation</li>
      <li><strong>Online Academies</strong> - Hybrid learning attendance management</li>
    </ul>
  </div>

  <div class="feature-card">
    <h3><i class="fas fa-building"></i> Corporate Training</h3>
    <ul>
      <li><strong>Employee Training</strong> - Track attendance for compliance requirements</li>
      <li><strong>Workshops & Seminars</strong> - Automated attendance for events</li>
      <li><strong>Certification Programs</strong> - Maintain accurate attendance records</li>
      <li><strong>Professional Development</strong> - Monitor learning progress</li>
    </ul>
  </div>
</div>

## 🔒 Security & Privacy

- **Data Encryption** - All sensitive data encrypted at rest and in transit
- **GDPR Compliant** - Privacy-first design with data protection
- **Secure Face Storage** - Face embeddings stored as mathematical vectors
- **Access Controls** - Granular permissions and role-based access

## 📈 Performance

- **Fast Recognition** - Process group photos in under 3 seconds
- **Scalable Architecture** - Handle thousands of concurrent users
- **Efficient Database** - Optimized queries for quick response times
- **Mobile Responsive** - Works seamlessly on all devices

## 🤝 Community

Join our growing community of educators and developers:

- **GitHub Discussions** - Ask questions and share ideas
- **Issue Tracker** - Report bugs and request features
- **Contributing Guide** - Help improve the platform
- **Documentation** - Comprehensive guides and tutorials

---

**Ready to revolutionize student management?** [Get Started](getting-started.html) today!