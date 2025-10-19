# Frontend Pages Specification - Student & Teacher Dashboards

## Overview
Complete React frontend page structure to showcase all Lambda API functionalities for both Student and Teacher user roles in the LMS system.

## 🎓 **Student Dashboard Pages**

### 1. **Student Dashboard Home** (`/student/dashboard`)
**Purpose**: Main landing page showing overview and quick actions
**Lambda APIs Used**: 
- User Analytics Lambda
- File Processing Lambda (recent files)
- Progress Tracking Lambda

**Key Features**:
- Welcome message with personalized learning stats
- Recent uploaded documents (last 5)
- Current learning progress overview
- Quick action buttons (Upload, Chat, Quiz, Interview)
- Upcoming assignments and deadlines
- Performance metrics summary

**API Calls**:
```javascript
GET /api/analytics/overview?user_id={id}
GET /api/files?user_id={id}&limit=5
GET /api/progress/summary?user_id={id}
```

### 2. **Document Upload & Management** (`/student/documents`)
**Purpose**: Upload, manage, and process study materials
**Lambda APIs Used**: 
- File Processing Lambda
- RAG Processing Lambda

**Key Features**:
- Drag & drop file upload (PDF, DOCX, TXT)
- File processing status with real-time updates
- Document library with search and filters
- Processing progress indicators
- File preview and metadata
- Delete and re-process options

**API Calls**:
```javascript
POST /api/files (upload request)
POST /api/files/process (RAG processing)
GET /api/files/status?file_id={id}
GET /api/files?user_id={id}
DELETE /api/files/{file_id}
```

### 3. **AI Study Chat** (`/student/chat`)
**Purpose**: Interactive AI chat with uploaded documents
**Lambda APIs Used**: 
- AI Chat Lambda
- RAG Retrieval Lambda

**Key Features**:
- Chat interface with conversation history
- Document-aware AI responses with citations
- Subject-specific chat rooms
- Chat history search and export
- Quick question suggestions
- File context indicators

**API Calls**:
```javascript
POST /api/chat/message
GET /api/chat/conversations?user_id={id}
GET /api/chat/history?conversation_id={id}
POST /api/chat/new-conversation
```

### 4. **Personalized Quizzes** (`/student/quizzes`)
**Purpose**: Take AI-generated quizzes based on study materials
**Lambda APIs Used**: 
- Quiz Generator Lambda
- Quiz Scoring Lambda

**Key Features**:
- Quiz generation from uploaded documents
- Multiple difficulty levels and question types
- Real-time quiz taking interface
- Instant scoring and feedback
- Quiz history and performance tracking
- Retry and practice modes

**API Calls**:
```javascript
POST /api/quiz/generate
GET /api/quiz/{quiz_id}
POST /api/quiz/submit
GET /api/quiz/history?user_id={id}
GET /api/quiz/analytics?user_id={id}
```

### 5. **Voice Interview Practice** (`/student/interview`)
**Purpose**: AI-powered voice interview practice sessions
**Lambda APIs Used**: 
- Voice Interview Lambda
- Transcription Lambda
- Interview Analysis Lambda

**Key Features**:
- Voice recording interface
- Real-time transcription display
- AI interview questions based on subjects
- Performance analysis and feedback
- Interview session history
- Speaking confidence metrics

**API Calls**:
```javascript
POST /api/interview/start
POST /api/interview/submit-audio
GET /api/interview/analysis?session_id={id}
GET /api/interview/history?user_id={id}
```

### 6. **Learning Analytics** (`/student/analytics`)
**Purpose**: Detailed learning progress and performance insights
**Lambda APIs Used**: 
- Analytics Lambda
- Progress Tracking Lambda

**Key Features**:
- Performance dashboards with charts
- Subject-wise progress tracking
- Strengths and weaknesses analysis
- Study time tracking
- Goal setting and achievement tracking
- Personalized recommendations

**API Calls**:
```javascript
GET /api/analytics/detailed?user_id={id}
GET /api/analytics/subjects?user_id={id}
GET /api/analytics/recommendations?user_id={id}
POST /api/analytics/goals
```

### 7. **Study Schedule** (`/student/schedule`)
**Purpose**: AI-recommended study plans and scheduling
**Lambda APIs Used**: 
- Schedule Generator Lambda
- Progress Tracking Lambda

**Key Features**:
- AI-generated study schedules
- Calendar integration
- Task completion tracking
- Schedule optimization suggestions
- Reminder notifications
- Study session logging

**API Calls**:
```javascript
GET /api/schedule/generate?user_id={id}
POST /api/schedule/update
GET /api/schedule/tasks?user_id={id}
POST /api/schedule/complete-task
```

## 👨‍🏫 **Teacher Dashboard Pages**

### 1. **Teacher Dashboard Home** (`/teacher/dashboard`)
**Purpose**: Overview of classes, students, and system analytics
**Lambda APIs Used**: 
- Teacher Analytics Lambda
- Class Management Lambda

**Key Features**:
- Class overview with student counts
- Recent student activity summary
- Assignment and quiz statistics
- System usage analytics
- Quick actions for content creation
- Student performance alerts

**API Calls**:
```javascript
GET /api/teacher/overview?teacher_id={id}
GET /api/teacher/classes?teacher_id={id}
GET /api/teacher/recent-activity?teacher_id={id}
```

### 2. **Class Management** (`/teacher/classes`)
**Purpose**: Manage classes, students, and assignments
**Lambda APIs Used**: 
- Class Management Lambda
- Student Management Lambda

**Key Features**:
- Create and manage classes
- Add/remove students
- Class-specific document libraries
- Assignment creation and distribution
- Class performance overview
- Bulk operations for students

**API Calls**:
```javascript
GET /api/teacher/classes?teacher_id={id}
POST /api/teacher/classes/create
POST /api/teacher/classes/{id}/students/add
GET /api/teacher/classes/{id}/students
POST /api/teacher/assignments/create
```

### 3. **Content Library Management** (`/teacher/content`)
**Purpose**: Manage educational content and resources
**Lambda APIs Used**: 
- File Processing Lambda
- Content Management Lambda

**Key Features**:
- Upload and organize teaching materials
- Share documents with specific classes
- Content categorization and tagging
- Bulk upload and processing
- Content usage analytics
- Version control for documents

**API Calls**:
```javascript
POST /api/teacher/content/upload
GET /api/teacher/content?teacher_id={id}
POST /api/teacher/content/share
GET /api/teacher/content/analytics?content_id={id}
```

### 4. **Quiz & Assessment Builder** (`/teacher/assessments`)
**Purpose**: Create and manage quizzes and assessments
**Lambda APIs Used**: 
- Quiz Generator Lambda
- Assessment Management Lambda

**Key Features**:
- AI-assisted quiz generation from content
- Manual quiz creation and editing
- Question bank management
- Assessment scheduling and distribution
- Automated grading and feedback
- Performance analytics per assessment

**API Calls**:
```javascript
POST /api/teacher/quiz/generate-from-content
POST /api/teacher/quiz/create-manual
GET /api/teacher/assessments?teacher_id={id}
POST /api/teacher/assessments/distribute
GET /api/teacher/assessments/{id}/results
```

### 5. **Student Progress Monitoring** (`/teacher/progress`)
**Purpose**: Monitor and analyze student learning progress
**Lambda APIs Used**: 
- Student Analytics Lambda
- Progress Tracking Lambda

**Key Features**:
- Individual student progress dashboards
- Class-wide performance comparisons
- Learning objective tracking
- Intervention recommendations
- Parent/guardian reporting
- Export capabilities for reports

**API Calls**:
```javascript
GET /api/teacher/students/progress?class_id={id}
GET /api/teacher/student/{id}/detailed-progress
GET /api/teacher/analytics/class-comparison
POST /api/teacher/interventions/recommend
```

### 6. **Interview & Oral Assessment** (`/teacher/interviews`)
**Purpose**: Set up and review voice interview assessments
**Lambda APIs Used**: 
- Voice Interview Lambda
- Interview Management Lambda

**Key Features**:
- Create interview question sets
- Assign voice interviews to students
- Review student interview recordings
- AI-assisted evaluation and scoring
- Feedback generation and delivery
- Interview performance analytics

**API Calls**:
```javascript
POST /api/teacher/interviews/create
POST /api/teacher/interviews/assign
GET /api/teacher/interviews/submissions?teacher_id={id}
GET /api/teacher/interviews/{id}/analysis
POST /api/teacher/interviews/feedback
```

### 7. **System Analytics & Reports** (`/teacher/analytics`)
**Purpose**: Comprehensive system usage and learning analytics
**Lambda APIs Used**: 
- System Analytics Lambda
- Reporting Lambda

**Key Features**:
- Platform usage statistics
- Learning effectiveness metrics
- Student engagement analytics
- Content performance analysis
- Custom report generation
- Data export capabilities

**API Calls**:
```javascript
GET /api/teacher/analytics/system-usage
GET /api/teacher/analytics/learning-effectiveness
GET /api/teacher/reports/generate
GET /api/teacher/analytics/engagement-metrics
```

### 8. **AI Agent Configuration** (`/teacher/ai-config`)
**Purpose**: Configure and customize AI agents for classes
**Lambda APIs Used**: 
- Agent Configuration Lambda
- Bedrock Management Lambda

**Key Features**:
- Customize AI chat personalities per subject
- Configure quiz generation parameters
- Set interview question difficulty levels
- Manage AI response guidelines
- A/B test different AI configurations
- Monitor AI performance metrics

**API Calls**:
```javascript
GET /api/teacher/ai-agents/config?teacher_id={id}
POST /api/teacher/ai-agents/update-config
GET /api/teacher/ai-agents/performance-metrics
POST /api/teacher/ai-agents/test-configuration
```

## 🔐 **Shared Authentication Pages**

### 1. **Login/Register** (`/auth/login`, `/auth/register`)
**Lambda APIs Used**: 
- Auth Lambda
- User Management Lambda

### 2. **Profile Management** (`/profile`)
**Lambda APIs Used**: 
- User Profile Lambda
- Settings Management Lambda

### 3. **Settings & Preferences** (`/settings`)
**Lambda APIs Used**: 
- User Settings Lambda
- Notification Management Lambda

## 📱 **Mobile-Responsive Design**

All pages will be fully responsive with:
- Mobile-first design approach
- Touch-friendly interfaces
- Offline capability for key features
- Progressive Web App (PWA) support
- Voice interface optimization for mobile

## 🎨 **UI/UX Showcase Features**

### Interactive Demos
- **Live API Testing**: Built-in API testing interface
- **Real-time Updates**: WebSocket connections for live data
- **Voice Recognition**: Browser-based speech recognition
- **File Processing**: Visual progress indicators
- **AI Responses**: Typing animations and citations

### Performance Indicators
- **Lambda Cold Start Metrics**: Display function execution times
- **API Response Times**: Real-time performance monitoring
- **Success/Error Rates**: Live system health indicators
- **Cost Tracking**: AWS usage and cost visualization

This comprehensive page structure showcases all Lambda APIs while providing a complete, production-ready LMS experience for both students and teachers!