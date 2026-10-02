import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './features/auth/ProtectedRoute';

// Layouts
import { DashboardLayout } from './layouts/DashboardLayout';

// Public Pages
import { LoginPage } from './pages/LoginPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { TeacherManagementPage } from './pages/admin/TeacherManagementPage';
import { AdminExamsPage } from './pages/admin/AdminExamsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';

// Teacher Pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { CreateExamPage } from './pages/teacher/CreateExamPage';
import { TeacherReportsPage } from './pages/teacher/TeacherReportsPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { ExamInfoPage } from './pages/student/ExamInfoPage';

// Exam Interface
import { ExamInterfacePage } from './pages/exam/ExamInterfacePage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="teachers" element={<TeacherManagementPage />} />
            <Route path="exams" element={<AdminExamsPage />} />
            <Route path="exams/new" element={<CreateExamPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>

          {/* Teacher Protected Routes */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['TEACHER']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="exams/new" element={<CreateExamPage />} />
            <Route path="reports" element={<TeacherReportsPage />} />
          </Route>

          {/* Student Protected Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="enter-qp" element={<StudentDashboard />} />
            <Route path="exam-info" element={<ExamInfoPage />} />
          </Route>

          {/* Secure Exam Mode (Full screen interface - token-authenticated launch from browser) */}
          <Route path="/exam/:examId" element={<ExamInterfacePage />} />

          {/* Default Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
