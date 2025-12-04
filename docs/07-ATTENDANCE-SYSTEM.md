# ✅ Attendance System Explanation

## How Attendance Works

### Two Methods

#### 1. **Manual Attendance**
Teacher manually marks students present/absent.

#### 2. **AI Face Recognition** (Optional)
Teacher uploads group photo, AI identifies students.

### Database Structure

**sessions table:**
```sql
- session_id
- subject_id (which class)
- created_by (teacher)
- session_date
- attendance_taken (boolean)
```

**attendance table:**
```sql
- id
- session_id (which session)
- student_id (which student)
- status ('present', 'absent', 'late')
- method ('manual' or 'face_recognition')
- confidence_score (for AI)
```

### Manual Attendance Flow

**File:** `backend/app/routers/attendance.py`

**Step-by-Step:**

1. **Teacher creates session**
   ```
   POST /api/sessions
   { subject_id, name, date }
   ```

2. **Teacher marks attendance**
   ```
   POST /api/attendance/mark
   { session_id, student_id, status: 'present' }
   ```

3. **Backend validates:**
   - Is teacher authorized?
   - Does session exist?
   - Is student enrolled in subject?

4. **Backend saves to database**
   - Inserts into attendance table
   - Updates session.attendance_taken = true

5. **Frontend shows confirmation**
   - Green checkmark for present
   - Red X for absent

### Face Recognition Flow (Optional)

**File:** `backend/app/services/face_recognition.py`

**Requires:**
- OpenCV (computer vision)
- face_recognition library
- Pinecone (vector database)

**How it works:**

1. **Student registers face (one-time)**
   - Uploads photo
   - AI extracts face encoding (128 numbers)
   - Stored in Pinecone with student_id

2. **Teacher takes attendance**
   - Uploads group photo
   - AI detects all faces
   - Extracts encodings for each face
   - Compares with stored encodings
   - Matches faces to students

3. **Automatic marking**
   - Matched students → marked present
   - Unmatched → marked absent
   - Confidence score saved
