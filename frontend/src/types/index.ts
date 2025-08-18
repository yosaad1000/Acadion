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

// Calendar Integration Types
export interface CalendarConnection {
  id: number;
  user_id: number;
  provider: string;
  calendar_id?: string;
  is_connected: boolean;
  created_at: string;
}

export interface RecurrencePattern {
  type: 'weekly' | 'biweekly' | 'custom';
  interval: number;
  days_of_week: number[]; // 0=Monday, 6=Sunday
  end_date?: string;
  occurrence_count?: number;
}

export interface ClassSchedule {
  id: number;
  teacher_id: number;
  subject_id: number;
  title: string;
  description?: string;
  start_datetime: string;
  duration_minutes: number;
  recurrence_pattern?: RecurrencePattern;
  google_event_id?: string;
  is_active: boolean;
  instances?: ScheduleInstance[];
}

export interface ClassScheduleCreate {
  subject_id: number;
  title: string;
  description?: string;
  start_datetime: string;
  duration_minutes: number;
  recurrence_pattern?: RecurrencePattern;
}

export interface ScheduleInstance {
  id: number;
  schedule_id: number;
  instance_datetime: string;
  google_event_id?: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface StudentScheduleAccess {
  id: number;
  student_id: number;
  schedule_id: number;
  sync_to_personal_calendar: boolean;
  created_at: string;
}