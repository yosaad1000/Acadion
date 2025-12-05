# Product Overview

Acadion is an AI-powered student management platform designed for educational institutions. The system provides comprehensive student lifecycle management with advanced facial recognition technology for automated attendance tracking.

## Development Scope

**IMPORTANT**: The Python backend should ONLY implement features related to facial attendance and AI processing. All other features (CRUD operations, authentication, user management, organization management) are handled by Supabase and React frontend.

## Core Features

- **Multi-tenant Authentication**: Organization-scoped authentication with Supabase OAuth
- **AI-Powered Attendance**: Facial recognition system using OpenCV and Pinecone vector database for processing group photos
- **Organization Management**: Multi-tenant support with organization-scoped data isolation
- **Cross-platform Access**: Web application with React, mobile app (React Native), and responsive design

## Python Backend Scope (LIMITED)

The Python FastAPI backend should ONLY handle:
- Facial recognition processing (OpenCV)
- Face encoding storage/retrieval (Pinecone)
- Attendance marking via facial recognition
- Face registration for students
- AI-related utilities and services

## Frontend/Supabase Scope

All other features are handled by React frontend + Supabase:
- User authentication and OAuth
- Organization CRUD operations
- Subject/class management
- Student enrollment
- Manual attendance tracking
- User profile management
- Role switching
- Notifications
- Real-time data synchronization

## Target Users

- **Educational Institutions**: Universities, K-12 schools, training centers
- **Corporate Training**: Employee training programs, workshops, certification courses
- **Event Management**: Seminars, conferences with attendance requirements

## Key Value Propositions

- Automated attendance through AI eliminates manual processes
- Real-time data synchronization across all platforms
- Scalable architecture supporting thousands of concurrent users
- Privacy-first design with face data stored as mathematical vectors
- Comprehensive role-based access control for institutional security