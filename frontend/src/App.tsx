import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './contexts/ToastContext';
import { ViewProvider } from './contexts/ViewContext';
import Layout from './components/Layout/Layout';
import AppErrorBoundary from './components/AppErrorBoundary';
import OfflineDetector from './components/OfflineDetector';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateClass from './pages/CreateClass';
import JoinClass from './pages/JoinClass';
import ClassRoom from './pages/ClassRoom';
import TakeAttendance from './pages/TakeAttendance';
import AttendanceDashboard from './pages/AttendanceDashboard';
import StudentAttendance from './pages/StudentAttendance';
import ViewStudents from './pages/ViewStudents';
import Profile from './pages/Profile';
import FaceRegistration from './pages/FaceRegistration';
import Notifications from './pages/Notifications';
import SessionDetail from './pages/SessionDetail';

// Additional pages
import Dashboard from './pages/Dashboard';
import AttendanceReports from './pages/AttendanceReports';
import AttendanceUpload from './pages/AttendanceUpload';
import StudentRegister from './pages/StudentRegister';
import Students from './pages/Students';

// LMS Feature Pages
import DocumentManager from './pages/DocumentManager';
import StudyChat from './pages/StudyChat';
import QuizCenter from './pages/QuizCenter';
import InterviewPractice from './pages/InterviewPractice';
import LearningAnalytics from './pages/LearningAnalytics';
import StudySchedule from './pages/StudySchedule';
import ContentLibrary from './pages/ContentLibrary';

// Role-specific pages from subdirectories
import StudentAnalytics from './pages/student/StudentAnalytics';
import StudentChat from './pages/student/StudentChat';
import StudentDocuments from './pages/student/StudentDocuments';
import StudentInterview from './pages/student/StudentInterview';
import StudentQuizzes from './pages/student/StudentQuizzes';
import StudentSchedule from './pages/student/StudentSchedule';

import TeacherAIConfig from './pages/teacher/TeacherAIConfig';
import TeacherAnalytics from './pages/teacher/TeacherAnalytics';
import TeacherAssessments from './pages/teacher/TeacherAssessments';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherContent from './pages/teacher/TeacherContent';
import TeacherInterviews from './pages/teacher/TeacherInterviews';
import TeacherProgress from './pages/teacher/TeacherProgress';

// Shared pages
import Settings from './pages/shared/Settings';
import Help from './pages/shared/Help';

import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 safe-area-padding">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm sm:text-base text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const DashboardRoute: React.FC = () => {
  const { user, loading, session, currentRole, userRoles } = useAuth();
  
  console.log('DashboardRoute - loading:', loading, 'user:', user, 'currentRole:', currentRole, 'userRoles:', userRoles);
  
  // If still loading, show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 safe-area-padding">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-sm sm:text-base text-gray-600">Loading user profile...</p>
        </div>
      </div>
    );
  }
  
  // If no user profile but has session, show a profile creation prompt
  if (!user && session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 safe-area-padding px-4">
        <div className="text-center max-w-md w-full">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Profile Setup Required</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Your account needs a profile to continue.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-mobile bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            <span className="text-sm sm:text-base">Refresh Page</span>
          </button>
        </div>
      </div>
    );
  }
  
  // Route based on current role
  console.log('🎯 DashboardRoute decision - currentRole:', currentRole, 'typeof:', typeof currentRole);
  
  if (currentRole === 'teacher') {
    console.log('✅ Rendering TeacherDashboard');
    return <TeacherDashboard />;
  } else {
    console.log('✅ Rendering StudentDashboard for role:', currentRole);
    return <StudentDashboard />;
  }
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Landing />} 
      />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Signup />} 
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardRoute />} />

        {/* Class & Subject Management */}
        <Route path="create-class" element={<CreateClass />} />
        <Route path="join-class" element={<JoinClass />} />
        <Route path="class/:classId" element={<ClassRoom />} />
        <Route path="class/:classId/session/:sessionId" element={<SessionDetail />} />

        {/* Attendance Routes */}
        <Route path="take-attendance/:classId" element={<TakeAttendance />} />
        <Route path="attendance-dashboard/:classId" element={<AttendanceDashboard />} />
        <Route path="attendance-reports" element={<AttendanceReports />} />
        <Route path="attendance-upload" element={<AttendanceUpload />} />
        <Route path="student-attendance/:classId" element={<StudentAttendance />} />

        {/* Student Management */}
        <Route path="students" element={<ViewStudents />} />
        <Route path="student-register" element={<StudentRegister />} />
        <Route path="all-students" element={<Students />} />
        <Route path="register-face" element={<FaceRegistration />} />

        {/* Student-specific Features */}
        <Route path="student/analytics" element={<StudentAnalytics />} />
        <Route path="student/chat" element={<StudentChat />} />
        <Route path="student/documents" element={<StudentDocuments />} />
        <Route path="student/interview" element={<StudentInterview />} />
        <Route path="student/quizzes" element={<StudentQuizzes />} />
        <Route path="student/schedule" element={<StudentSchedule />} />

        {/* Teacher-specific Features */}
        <Route path="teacher/ai-config" element={<TeacherAIConfig />} />
        <Route path="teacher/analytics" element={<TeacherAnalytics />} />
        <Route path="teacher/assessments" element={<TeacherAssessments />} />
        <Route path="teacher/classes" element={<TeacherClasses />} />
        <Route path="teacher/content" element={<TeacherContent />} />
        <Route path="teacher/interviews" element={<TeacherInterviews />} />
        <Route path="teacher/progress" element={<TeacherProgress />} />

        {/* Shared LMS Features */}
        <Route path="documents" element={<DocumentManager />} />
        <Route path="chat" element={<StudyChat />} />
        <Route path="quizzes" element={<QuizCenter />} />
        <Route path="interview" element={<InterviewPractice />} />
        <Route path="analytics" element={<LearningAnalytics />} />
        <Route path="schedule" element={<StudySchedule />} />
        <Route path="content" element={<ContentLibrary />} />

        {/* User Settings & Support */}
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
        <Route path="notifications" element={<Notifications />} />
        
        <Route path="" element={<Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AppErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <ViewProvider>
                <Router>
                  <OfflineDetector />
                  <AppRoutes />
                </Router>
              </ViewProvider>
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}

export default App;