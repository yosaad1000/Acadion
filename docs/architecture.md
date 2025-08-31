---
layout: default
title: Architecture
nav_order: 4
---

# 🏗️ System Architecture

Acadion is built with a modern, scalable architecture that separates concerns and enables independent scaling of different components.

## Overview

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Web App]
        B[React Native Mobile]
        C[Admin Dashboard]
    end
    
    subgraph "API Gateway"
        D[FastAPI Backend]
        E[Authentication Middleware]
        F[CORS Middleware]
    end
    
    subgraph "Services Layer"
        G[Auth Service]
        H[Subject Service]
        I[Attendance Service]
        J[Face Recognition Service]
    end
    
    subgraph "Data Layer"
        K[Supabase PostgreSQL]
        L[Pinecone Vector DB]
        M[Redis Cache]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    G --> K
    H --> K
    I --> K
    J --> L
    D --> M
```

## Core Components

### Frontend Layer

#### React Web Application
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Query for server state
- **Routing**: React Router for client-side navigation
- **Build Tool**: Vite for fast development and building

#### Mobile Application
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **Camera**: Expo Camera for photo capture
- **Storage**: AsyncStorage for local data

### Backend Layer

#### FastAPI Application
- **Framework**: FastAPI for high-performance API
- **Documentation**: Auto-generated OpenAPI/Swagger docs
- **Validation**: Pydantic models for request/response validation
- **Middleware**: CORS, authentication, and logging middleware

#### Authentication System
- **JWT Tokens**: Secure token-based authentication
- **Role-based Access**: Teacher, Student, and Admin roles
- **Password Security**: bcrypt hashing
- **Session Management**: Redis for token blacklisting

### Data Layer

#### Primary Database (Supabase)
- **Type**: PostgreSQL with real-time features
- **Authentication**: Built-in user management
- **Real-time**: WebSocket connections for live updates
- **Storage**: File storage for profile images

#### Vector Database (Pinecone)
- **Purpose**: Store face embeddings for recognition
- **Dimensions**: 128-dimensional face vectors
- **Indexing**: Optimized for similarity search
- **Scaling**: Handles millions of face vectors

#### Caching Layer (Redis)
- **Session Storage**: JWT token management
- **Rate Limiting**: API request throttling
- **Temporary Data**: Face processing results

## Data Flow

### User Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as FastAPI
    participant S as Supabase
    participant R as Redis
    
    C->>A: POST /api/auth/login
    A->>S: Verify credentials
    S-->>A: User data
    A->>A: Generate JWT token
    A->>R: Store token metadata
    A-->>C: Return token + user data
    
    C->>A: API request with token
    A->>A: Validate JWT
    A->>R: Check token status
    R-->>A: Token valid
    A-->>C: Protected resource
```

### Face Recognition Flow

```mermaid
sequenceDiagram
    participant T as Teacher
    participant A as FastAPI
    participant F as Face Service
    participant P as Pinecone
    participant S as Supabase
    
    T->>A: Upload group photo
    A->>F: Process image
    F->>F: Detect faces
    F->>F: Generate embeddings
    F->>P: Search similar faces
    P-->>F: Matching results
    F->>S: Get student details
    S-->>F: Student information
    F-->>A: Recognition results
    A->>S: Save attendance
    A-->>T: Attendance marked
```

## Security Architecture

### Authentication & Authorization

```mermaid
graph LR
    A[Client Request] --> B[JWT Validation]
    B --> C[Role Check]
    C --> D[Resource Access]
    B --> E[Token Blacklist Check]
    E --> F[Redis Cache]
    C --> G[Permission Matrix]
```

#### Security Layers
1. **Transport Security**: HTTPS/TLS encryption
2. **Authentication**: JWT token validation
3. **Authorization**: Role-based access control
4. **Input Validation**: Pydantic model validation
5. **Rate Limiting**: Redis-based request throttling
6. **CORS Protection**: Configurable origin restrictions

### Data Protection

#### Face Data Security
- **No Image Storage**: Only mathematical embeddings stored
- **Vector Encryption**: Embeddings encrypted in Pinecone
- **Access Control**: Strict API access to face data
- **Audit Logging**: All face operations logged

#### Personal Data Protection
- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: TLS for all communications
- **Data Minimization**: Only necessary data collected
- **Right to Deletion**: GDPR-compliant data removal

## Scalability Design

### Horizontal Scaling

#### Application Layer
- **Stateless Design**: No server-side session storage
- **Load Balancing**: Multiple FastAPI instances
- **Container Orchestration**: Docker Swarm or Kubernetes
- **Auto-scaling**: Based on CPU/memory metrics

#### Database Layer
- **Read Replicas**: Supabase read scaling
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries and caching
- **Sharding Strategy**: Future horizontal partitioning

### Performance Optimization

#### Caching Strategy
```mermaid
graph TB
    A[Client Request] --> B[Redis Cache Check]
    B --> C{Cache Hit?}
    C -->|Yes| D[Return Cached Data]
    C -->|No| E[Database Query]
    E --> F[Cache Result]
    F --> G[Return Data]
```

#### Face Recognition Optimization
- **Batch Processing**: Multiple faces in single request
- **Async Processing**: Non-blocking face recognition
- **Result Caching**: Cache recognition results
- **Model Optimization**: Efficient face detection models

## Deployment Architecture

### Development Environment
```
Developer Machine
├── Frontend (Vite Dev Server)
├── Backend (Uvicorn)
├── Database (Local Supabase)
└── Cache (Local Redis)
```

### Production Environment
```
Cloud Infrastructure
├── Load Balancer (Nginx)
├── Application Servers (Docker Containers)
│   ├── Frontend (Nginx + React)
│   └── Backend (FastAPI + Gunicorn)
├── Database (Supabase Cloud)
├── Vector DB (Pinecone Cloud)
├── Cache (Redis Cloud)
└── Monitoring (Logs + Metrics)
```

## API Design

### RESTful Principles
- **Resource-based URLs**: `/api/subjects/{id}`
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Status Codes**: Proper HTTP status codes
- **Content Negotiation**: JSON request/response

### API Versioning
- **URL Versioning**: `/api/v1/`, `/api/v2/`
- **Backward Compatibility**: Maintain old versions
- **Deprecation Strategy**: Gradual migration path

### Error Handling
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

## Monitoring & Observability

### Application Monitoring
- **Health Checks**: `/api/health` endpoint
- **Metrics Collection**: Prometheus-compatible metrics
- **Log Aggregation**: Structured JSON logging
- **Error Tracking**: Sentry integration

### Performance Monitoring
- **Response Times**: API endpoint performance
- **Database Queries**: Query performance tracking
- **Face Recognition**: Processing time metrics
- **User Analytics**: Usage patterns and trends

## Future Architecture Considerations

### Microservices Migration
- **Service Decomposition**: Split by business domain
- **API Gateway**: Centralized routing and auth
- **Service Mesh**: Inter-service communication
- **Event-driven Architecture**: Async communication

### Advanced AI Features
- **ML Pipeline**: Model training and deployment
- **A/B Testing**: Feature flag management
- **Real-time Processing**: Stream processing for live recognition
- **Edge Computing**: Local face processing

This architecture provides a solid foundation for a scalable, secure, and maintainable student management platform while allowing for future growth and feature additions.