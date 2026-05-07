import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Simple Components to test rendering
const TestSidebar = () => <div style={{width: '200px', background: '#111', color: '#fff', height: '100vh', position: 'fixed'}}>Sidebar</div>;
const TestTopBar = () => <div style={{height: '60px', background: '#222', color: '#fff', marginLeft: '200px'}}>TopBar</div>;
const TestLayout = () => (
  <div style={{background: '#000', minHeight: '100vh', color: '#fff'}}>
    <TestSidebar />
    <TestTopBar />
    <div style={{marginLeft: '200px', padding: '20px'}}>
      <Outlet />
    </div>
  </div>
);

const TestDashboard = () => <div><h1>Dashboard Content</h1><p>If you see this, routing is working.</p></div>;
const Login = () => {
  const { login } = useAuth();
  return (
    <div style={{padding: '50px', background: '#111', color: '#fff', height: '100vh'}}>
      <h1>Login Page</h1>
      <button onClick={() => login('admin@nexovgen.com', 'password')}>Login as Admin</button>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading Auth...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={
        <ProtectedRoute>
          <TestLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<TestDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

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
