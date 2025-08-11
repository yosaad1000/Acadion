# 📊 Database Monitoring Guide

## 🗄️ Supabase Database Monitoring

### **1. Access Your Supabase Dashboard**
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### **2. Database Tables View**
- **Location**: Dashboard → Table Editor
- **What you'll see**: All your tables (students, faculty, attendance, etc.)
- **Actions**: View data, add records, edit records, delete records

### **3. SQL Editor**
- **Location**: Dashboard → SQL Editor
- **Use for**: 
  - Running custom queries
  - Creating tables and indexes
  - Viewing complex data relationships
  - Running the schema setup script

### **4. Real-time Monitoring**
- **Location**: Dashboard → Logs
- **Shows**: 
  - API requests
  - Database queries
  - Errors and warnings
  - Performance metrics

### **5. Authentication Users**
- **Location**: Dashboard → Authentication → Users
- **Shows**: All registered users, their roles, and login activity

## 🔍 Pinecone Vector Database Monitoring

### **1. Access Pinecone Console**
1. Go to [pinecone.io](https://pinecone.io)
2. Sign in to your account
3. Select your project

### **2. Index Management**
- **Location**: Console → Indexes
- **Your Index**: `student-face-encodings` (or your configured name)
- **Shows**: 
  - Number of vectors stored
  - Index statistics
  - Query performance

### **3. Vector Operations**
- **View Vectors**: See stored face encodings
- **Search Vectors**: Test similarity searches
- **Delete Vectors**: Remove face data

### **4. Monitoring Metrics**
- **Query Latency**: How fast face recognition searches are
- **Storage Usage**: How much vector data you're storing
- **API Usage**: Number of requests and operations

## 🔧 How to Set Up Your Databases

### **Step 1: Set Up Supabase Tables**

1. **Go to your Supabase project**
2. **Navigate to**: SQL Editor
3. **Copy and paste** the entire content from `database/supabase_schema.sql`
4. **Click "Run"** to execute the script
5. **Verify**: Go to Table Editor and check that all tables are created

### **Step 2: Configure Pinecone Index**

1. **Go to Pinecone Console**
2. **Create New Index**:
   - Name: `student-face-encodings`
   - Dimensions: `128` (for face recognition)
   - Metric: `euclidean`
   - Environment: `us-east-1` (or your preferred region)

### **Step 3: Update Your Environment Variables**

Make sure your `backend/.env` file has the correct values:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Pinecone Configuration
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=student-face-encodings
```

## 📈 Monitoring Student Registration

### **After Setting Up Tables:**

1. **Try registering a student** in your web app
2. **Check Supabase**: 
   - Go to Table Editor → students
   - You should see the new student record
3. **Check Logs**:
   - Go to Logs → API
   - Look for successful INSERT operations

### **Face Recognition Monitoring:**

1. **Upload a student photo**
2. **Check Pinecone**:
   - Go to your index dashboard
   - Vector count should increase by 1
3. **Check Supabase**:
   - Student record should have `face_encoding_id` populated

## 🚨 Common Issues and Solutions

### **Issue: 307 Redirect Errors**
- **Cause**: Database tables don't exist
- **Solution**: Run the SQL schema script in Supabase

### **Issue: Students Not Appearing**
- **Check**: Supabase Table Editor → students table
- **Look for**: New records after registration

### **Issue: Face Recognition Not Working**
- **Check**: Pinecone index exists and has correct dimensions
- **Verify**: API keys are correct in environment variables

### **Issue: Authentication Errors**
- **Check**: Supabase → Authentication → Users
- **Verify**: RLS policies are set up correctly

## 📊 Useful SQL Queries for Monitoring

### **Check Student Count:**
```sql
SELECT COUNT(*) as total_students FROM students;
```

### **View Recent Registrations:**
```sql
SELECT * FROM students 
ORDER BY created_at DESC 
LIMIT 10;
```

### **Check Attendance Statistics:**
```sql
SELECT 
    s.name,
    COUNT(a.id) as total_classes,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count
FROM students s
LEFT JOIN attendance a ON s.student_id = a.student_id
GROUP BY s.student_id, s.name;
```

### **View Department Statistics:**
```sql
SELECT 
    d.name as department,
    COUNT(s.student_id) as student_count
FROM departments d
LEFT JOIN students s ON d.dept_id = s.department_id
GROUP BY d.dept_id, d.name;
```

## 🔄 Real-time Monitoring Setup

### **Enable Real-time Updates:**
1. Go to Supabase → Database → Replication
2. Enable real-time for tables you want to monitor
3. Use the real-time client in your frontend for live updates

### **Set Up Alerts:**
1. Configure email notifications for database errors
2. Set up monitoring for API usage limits
3. Create alerts for unusual activity patterns

---

**With these monitoring tools, you'll have complete visibility into your student management platform's data! 📊✨**