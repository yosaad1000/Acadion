import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
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
  const { user } = useAuth();
  
  if (user?.user_type === 'teacher') {
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