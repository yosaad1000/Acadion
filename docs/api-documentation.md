---
layout: default
title: API Documentation
nav_order: 3
---

# 📡 API Documentation

Acadion provides a comprehensive REST API built with FastAPI. All endpoints are documented with OpenAPI/Swagger.

## Interactive Documentation

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Base URL

```
Local Development: http://localhost:8000
Production: https://your-api-domain.com
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Get Access Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "role": "teacher",
    "full_name": "John Doe"
  }
}
```

## Core Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "full_name": "John Doe",
  "role": "teacher"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Subjects (Classes)

#### Create Subject
```http
POST /api/subjects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Computer Science 101",
  "description": "Introduction to Programming",
  "department": "Computer Science"
}
```

#### Get User's Subjects
```http
GET /api/subjects
Authorization: Bearer <token>
```

#### Get Subject Details
```http
GET /api/subjects/{subject_id}
Authorization: Bearer <token>
```

#### Join Subject (Students)
```http
POST /api/subjects/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "invite_code": "ABC123"
}
```

### Attendance

#### Mark Attendance (Face Recognition)
```http
POST /api/attendance/mark-face
Authorization: Bearer <token>
Content-Type: multipart/form-data

subject_id: 123
image: <image-file>
```

#### Mark Manual Attendance
```http
POST /api/attendance/mark-manual
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject_id": 123,
  "student_ids": [1, 2, 3],
  "date": "2024-01-15"
}
```

#### Get Attendance Records
```http
GET /api/attendance/{subject_id}
Authorization: Bearer <token>
```

#### Get Student Attendance
```http
GET /api/attendance/student/{student_id}
Authorization: Bearer <token>
```

### Face Registration

#### Register Face
```http
POST /api/auth/register-face
Authorization: Bearer <token>
Content-Type: multipart/form-data

image: <image-file>
```

#### Check Face Registration Status
```http
GET /api/auth/face-status
Authorization: Bearer <token>
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully"
}
```

### Error Response
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

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error |

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication**: 5 requests per minute
- **Face Recognition**: 10 requests per minute
- **General API**: 100 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

Acadion supports webhooks for real-time notifications:

### Attendance Webhook
Triggered when attendance is marked:

```json
{
  "event": "attendance.marked",
  "data": {
    "subject_id": 123,
    "date": "2024-01-15",
    "total_students": 25,
    "present_count": 23,
    "recognition_method": "face"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### User Registration Webhook
Triggered when a new user registers:

```json
{
  "event": "user.registered",
  "data": {
    "user_id": 456,
    "email": "student@example.com",
    "role": "student",
    "full_name": "Jane Smith"
  },
  "timestamp": "2024-01-15T09:15:00Z"
}
```

## SDK and Libraries

### JavaScript/TypeScript
```bash
npm install @acadion/api-client
```

```typescript
import { AcadionClient } from '@acadion/api-client';

const client = new AcadionClient({
  baseURL: 'http://localhost:8000',
  apiKey: 'your-api-key'
});

// Login
const { user, token } = await client.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Create subject
const subject = await client.subjects.create({
  name: 'Math 101',
  description: 'Basic Mathematics'
});
```

### Python
```bash
pip install acadion-client
```

```python
from acadion_client import AcadionClient

client = AcadionClient(
    base_url='http://localhost:8000',
    api_key='your-api-key'
)

# Login
user, token = client.auth.login(
    email='user@example.com',
    password='password'
)

# Create subject
subject = client.subjects.create(
    name='Math 101',
    description='Basic Mathematics'
)
```

## Testing

### Using curl

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Create subject
curl -X POST http://localhost:8000/api/subjects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Subject","description":"Test Description"}'
```

### Using Postman

1. Import the OpenAPI spec from `/docs`
2. Set up environment variables for base URL and token
3. Use the pre-configured requests

## Error Handling

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_REQUIRED` | Missing or invalid token | Include valid JWT token |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | Check user role and permissions |
| `VALIDATION_ERROR` | Invalid input data | Check request format and required fields |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist | Verify resource ID |
| `FACE_RECOGNITION_FAILED` | Face processing error | Ensure good image quality and lighting |
| `DUPLICATE_ENTRY` | Resource already exists | Check for existing records |

### Best Practices

1. **Always handle errors gracefully**
2. **Implement retry logic for transient failures**
3. **Cache tokens and refresh when needed**
4. **Validate input data before sending requests**
5. **Use appropriate HTTP methods**
6. **Include proper headers**

## API Versioning

The API uses URL versioning:
- Current version: `v1` (default)
- Future versions: `v2`, `v3`, etc.

```http
GET /api/v1/subjects
GET /api/v2/subjects  # Future version
```

## Support

For API support:
- **GitHub Issues**: Technical problems and bugs
- **Discussions**: Questions and community help
- **Documentation**: Comprehensive guides
- **Email**: api-support@acadion.com