import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
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
import './App.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4">Loading user profile...</p>
      </div>
    );
  }
  
  // If no user profile but has session, show a profile creation prompt
  if (!user && session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Profile Setup Required</h2>
          <p className="text-gray-600 mb-4">Your account needs a profile to continue.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  // Route based on current role
  if (currentRole === 'teacher') {
    return <TeacherDashboard />;
  } else {
    return <StudentDashboard />;
  }
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
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
        <Route path="create-class" element={<CreateClass />} />
        <Route path="join-class" element={<JoinClass />} />
        <Route path="class/:classId" element={<ClassRoom />} />
        <Route path="take-attendance/:classId" element={<TakeAttendance />} />
        <Route path="attendance-dashboard/:classId" element={<AttendanceDashboard />} />
        <Route path="student-attendance/:classId" element={<StudentAttendance />} />
        <Route path="students" element={<ViewStudents />} />
        <Route path="profile" element={<Profile />} />
        <Route path="register-face" element={<FaceRegistration />} />
        <Route path="" element={<Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;