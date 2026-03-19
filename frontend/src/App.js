import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkflowListPage from './pages/WorkflowListPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import ExecutionPage from './pages/ExecutionPage';
import ExecutionLogsPage from './pages/ExecutionLogsPage';
import ExecutionDetailPage from './pages/ExecutionDetailPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LoadingSpinner from './components/common/LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullscreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner fullscreen />;
  return user ? <Navigate to="/" replace /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="workflows"          element={<WorkflowListPage />} />
        <Route path="workflows/new"      element={<WorkflowEditorPage />} />
        <Route path="workflows/:id/edit" element={<WorkflowEditorPage />} />
        <Route path="workflows/:id/execute" element={<ExecutionPage />} />
        <Route path="executions"         element={<ExecutionLogsPage />} />
        <Route path="executions/:id"     element={<ExecutionDetailPage />} />
        <Route path="logs"               element={<AuditLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
          <ToastContainer
            position="top-right"
            autoClose={4000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme="colored"
            toastStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 13.5 }}
          />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
