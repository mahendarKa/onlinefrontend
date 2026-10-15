import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import AdminUsers from './pages/admin/Users';
import AdminCourses from './pages/admin/Courses';
import AdminBatches from './pages/admin/Batches';
import Batches from './pages/Batches';
import Questions from './pages/Questions';
import Exams from './pages/Exams';
import ExamDetail from './pages/ExamDetail';
import Grading from './pages/Grading';
import Monitoring from './pages/Monitoring';
import StudentDashboard from './pages/student/Dashboard';
import ExamPlayer from './pages/student/ExamPlayer';
import StudentResults from './pages/student/Results';
import AttemptHistory from './pages/student/AttemptHistory';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import AuditLogs from './pages/admin/AuditLogs';

const ADMIN_ROLES = ['admin', 'superadmin'];
const STAFF_ROLES = ['admin', 'superadmin', 'teacher'];
const ALL_ROLES = ['admin', 'superadmin', 'teacher', 'student'];

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'student') return <Navigate to="/dashboard" replace />;
  if (user.role === 'admin' || user.role === 'superadmin') {
    return <Navigate to="/admin/users" replace />;
  }
  return <Navigate to="/exams" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />

        {/* Admin + Superadmin */}
        <Route path="/admin/users" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/courses" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminCourses /></ProtectedRoute>} />
        <Route path="/admin/batches" element={<ProtectedRoute roles={ADMIN_ROLES}><AdminBatches /></ProtectedRoute>} />

        {/* Teacher only */}
        <Route path="/batches" element={<ProtectedRoute roles={['teacher']}><Batches /></ProtectedRoute>} />

        {/* Teacher + Admin + Superadmin */}
        <Route path="/questions" element={<ProtectedRoute roles={STAFF_ROLES}><Questions /></ProtectedRoute>} />
        <Route path="/exams" element={<ProtectedRoute roles={STAFF_ROLES}><Exams /></ProtectedRoute>} />
        <Route path="/exams/:examId" element={<ProtectedRoute roles={STAFF_ROLES}><ExamDetail /></ProtectedRoute>} />
        <Route path="/grading" element={<ProtectedRoute roles={STAFF_ROLES}><Grading /></ProtectedRoute>} />
        <Route path="/monitoring" element={<ProtectedRoute roles={STAFF_ROLES}><Monitoring /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute roles={['student']}><StudentResults /></ProtectedRoute>} />
        <Route path="/attempts" element={<ProtectedRoute roles={['student']}><AttemptHistory /></ProtectedRoute>} />

        {/* Every signed-in user */}
        <Route path="/profile" element={<ProtectedRoute roles={ALL_ROLES}><Profile /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute roles={ALL_ROLES}><Notifications /></ProtectedRoute>} />

        {/* Superadmin only */}
        <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['superadmin']}><AuditLogs /></ProtectedRoute>} />
      </Route>

      {/* Exam player runs full-screen outside the layout */}
      <Route
        path="/exam/:examId/attempt/:attemptId"
        element={
          <ProtectedRoute roles={['student']}>
            <ExamPlayer />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
