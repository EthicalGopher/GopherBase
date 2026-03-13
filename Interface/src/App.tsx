import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout';
import Dashboard from './pages/Dashboard';
import Tables from './pages/Tables';
import Auth from './pages/Auth';
import Storage from './pages/Storage';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import SQLEditor from './pages/SQLEditor';
import AIQuery from './pages/AIQuery';
import APIDocs from './pages/APIDocs';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-spin text-primary">
          <span className="material-symbols-outlined text-4xl">progress_activity</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <DatabaseProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tables" element={<Tables />} />
          <Route path="tables/:tableName" element={<Tables />} />
          <Route path="sql-editor" element={<SQLEditor />} />
          <Route path="ai-assistant" element={<AIQuery />} />
          <Route path="auth" element={<Auth />} />
          <Route path="storage" element={<Storage />} />
          <Route path="logs" element={<Logs />} />
          <Route path="api-docs" element={<APIDocs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DatabaseProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
