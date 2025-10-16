export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student extends User {
  studentId: string;
  departmentId: string;
  semester: number;
  batchYear: number;
  enrolledSubjects: string[];
  feeStatus: 'paid' | 'pending' | 'overdue';
  totalFees: number;
  paidFees: number;
}

export interface Teacher extends User {
  teacherId: string;
  departmentId: string;
  subjects: string[];
  qualification: string;
  experience: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hodId?: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  semester: number;
  credits: number;
  isElective: boolean;
  teacherId?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  markedBy: string;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  semester: number;
  examType: 'midterm' | 'final' | 'assignment' | 'quiz';
  marks: number;
  maxMarks: number;
  gradedBy: string;
  gradedAt: string;
}

export interface Fee {
  id: string;
  studentId: string;
  amount: number;
  type: 'tuition' | 'library' | 'lab' | 'exam' | 'other';
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  paymentMethod?: string;
  transactionId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Enhanced error handling types
export interface ApiError {
  message: string;
  type: 'network' | 'permission' | 'notFound' | 'server' | 'validation' | 'unknown';
  statusCode?: number;
  retryable: boolean;
  details?: string;
  field?: string; // For field-specific validation errors
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Network error states for UI components
export interface NetworkErrorState {
  hasError: boolean;
  errorType: 'network' | 'permission' | 'notFound' | 'server' | 'validation' | 'unknown';
  message: string;
  retryable: boolean;
  retryAction?: () => void;
  dismissAction?: () => void;
}

// Form validation state
export interface FormValidationState {
  isValid: boolean;
  isValidating: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
}

// Enhanced session interfaces with validation
export interface SessionFormData {
  name: string;
  description: string;
  session_date: string;
  session_time: string;
}

export interface SessionFormErrors {
  name?: string;
  description?: string;
  session_date?: string;
  session_time?: string;
  general?: string;
  errorType?: 'network' | 'permission' | 'validation' | 'server' | 'unknown';
}

// Notification Types
export enum NotificationType {
  STUDENT_JOINED = 'student_joined',
  ATTENDANCE_MARKED = 'attendance_marked',
  ATTENDANCE_FAILED = 'attendance_failed',
  CLASS_JOINED = 'class_joined',
  JOIN_FAILED = 'join_failed'
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id?: string;
  user_id: string;
  notification_type: NotificationType;
  enabled: boolean;
  created_at?: string;
}

// Notification data structures for different types
export interface StudentJoinedData {
  student_name: string;
  subject_name: string;
  subject_code: string;
  joined_at: string;
}

export interface AttendanceMarkedData {
  subject_name: string;
  session_name: string;
  total_students: number;
  present_count: number;
  marked_at: string;
}

export interface ClassJoinedData {
  subject_name: string;
  teacher_name: string;
  invite_code: string;
}

export interface AttendanceFailedData {
  subject_name: string;
  error_message: string;
  failed_at: string;
}

export interface JoinFailedData {
  subject_name?: string;
  invite_code: string;
  error_message: string;
  failed_at: string;
}

// Session Management Types
export interface Session {
  session_id: string;
  subject_id: string;
  name: string;
  description?: string;
  session_date?: string;
  notes?: string;
  attendance_taken: boolean;
  assignments: Assignment[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  assignment_id: string;
  session_id: string;
  title: string;
  description?: string;
  due_date?: string;
  assignment_type: 'homework' | 'test' | 'project';
  google_drive_link?: string;
  submission_status?: 'pending' | 'submitted' | 'graded';
  created_at: string;
}

export interface SessionCreate {
  name?: string;  // Optional - will be auto-generated if not provided
  description?: string;
  session_date?: string;  // Optional - defaults to current date/time
  // notes removed from creation - can be added after session is created
}

export interface SessionUpdate {
  name?: string;
  description?: string;
  session_date?: string;
  notes?: string;
}

// Assignment Management Types
export interface AssignmentCreate {
  title: string;
  description?: string;
  due_date?: string;
  assignment_type: 'homework' | 'test' | 'project';
  google_drive_link?: string;
}

export interface AssignmentUpdate {
  title?: string;
  description?: string;
  due_date?: string;
  assignment_type?: 'homework' | 'test' | 'project';
  google_drive_link?: string;
}

export interface AssignmentSubmissionUpdate {
  submission_status: 'pending' | 'submitted' | 'graded';
}