import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import FuturisticBackground from './components/Common/FuturisticBackground';
import DashboardLayout from './components/Layout/DashboardLayout';
import EmployeeLayout from './components/Layout/EmployeeLayout';
import { Toaster } from 'react-hot-toast';
import Unauthorized from './pages/Unauthorized';

// Admin Pages
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import VideoModule from './pages/VideoModule';
import WebModule from './pages/WebModule';
import AIModule from './pages/AIModule';
import CyberModule from './pages/CyberModule';
import Team from './pages/Team';
import Finance from './pages/Finance';
import InvoiceGenerator from './pages/InvoiceGenerator';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AdminPayroll from './pages/AdminPayroll';
import AdminHR from './pages/AdminHR';
import SecurityShield from './pages/SecurityShield';
import AdminAttendance from './pages/AdminAttendance';
import AdminLeaves from './pages/AdminLeaves';
import AIAuditEngine from './pages/AIAuditEngine';
import NexovTechMail from './pages/NexovTechMail';
import CommunicationAnalytics from './pages/CommunicationAnalytics';
import AdminTimesheets from './pages/AdminTimesheets';
import TeamAccess from './pages/TeamAccess';
import AdminTasks from './pages/AdminTasks';
import AdminLearning from './pages/AdminLearning';

// Employee Pages
import EmployeeDashboard from './pages/employee/Dashboard';
import MyTasks from './pages/employee/MyTasks';
import MyProjects from './pages/employee/MyProjects';
import Timesheet from './pages/employee/Timesheet';
import Earnings from './pages/employee/Earnings';
import MySalary from './pages/employee/MySalary';
import MyAttendance from './pages/employee/MyAttendance';
import MyLeaves from './pages/employee/MyLeaves';
import AdminIDCards from './pages/AdminIDCards';
import MyIDCard from './pages/employee/MyIDCard';
import VerifyID from './pages/VerifyID';
import EmployeeSecurity from './pages/employee/Security';
import Learning from './pages/Learning';
import AIAssistant from './components/AI/AIAssistant';

import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen theme-bg flex flex-col items-center justify-center gap-4">
      <Loader2 size={48} className="text-brand-500 animate-spin" />
      <p className="text-surface-500 font-black uppercase tracking-widest text-xs">Synchronizing Identity...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  
  const userRole = user.role?.toLowerCase() || '';
  if (allowedRoles && !allowedRoles.some(r => r.toLowerCase() === userRole)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to={(user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager') ? '/' : '/employee/dashboard'} />} />

      {/* Admin/Manager Routes */}
      <Route element={
        <ProtectedRoute allowedRoles={['Admin', 'Manager', 'Super Admin']}>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/video" element={<VideoModule />} />
        <Route path="/web" element={<WebModule />} />
        <Route path="/ai" element={<AIModule />} />
        <Route path="/cyber" element={<CyberModule />} />
        <Route path="/team" element={<Team />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/invoice-forge" element={<InvoiceGenerator />} />
        <Route path="/payroll" element={<AdminPayroll />} />
        <Route path="/hr" element={<AdminHR />} />
        <Route path="/tasks" element={<AdminTasks />} />
        <Route path="/attendance" element={<AdminAttendance />} />
        
        {/* EXCLUSIVE: SUPER ADMIN INFRASTRUCTURE */}
        <Route element={<ProtectedRoute allowedRoles={['Admin', 'Super Admin']} />}>
          <Route path="/security-shield" element={<SecurityShield />} />
        </Route>
        <Route path="/timesheets" element={<AdminTimesheets />} />
        <Route path="/leaves" element={<AdminLeaves />} />
        <Route path="/audit" element={<AIAuditEngine />} />
        <Route path="/id-cards" element={<AdminIDCards />} />
        <Route path="/nexus-mail" element={<NexovTechMail />} />
        <Route path="/comm-intelligence" element={<CommunicationAnalytics />} />
        <Route path="/admin-learning" element={<AdminLearning />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Employee Routes */}
      <Route element={
        <ProtectedRoute allowedRoles={['Employee', 'Specialist', 'Developer', 'Editor', 'AI Specialist', 'Security Analyst']}>
          <EmployeeLayout />
        </ProtectedRoute>
      }>
        <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
        <Route path="/employee/tasks" element={<MyTasks />} />
        <Route path="/employee/projects" element={<MyProjects />} />
        <Route path="/employee/timesheet" element={<Timesheet />} />
        <Route path="/employee/earnings" element={<Earnings />} />
        <Route path="/employee/salary" element={<MySalary />} />
        <Route path="/employee/attendance" element={<MyAttendance />} />
        <Route path="/employee/leaves" element={<MyLeaves />} />
        <Route path="/employee/id-card" element={<MyIDCard />} />
        <Route path="/employee/mail" element={<NexovTechMail />} />
        <Route path="/employee/security" element={<EmployeeSecurity />} />
        <Route path="/employee/learning" element={<Learning />} />
        <Route path="/employee/settings" element={<Settings />} />
      </Route>

      <Route path="/verify/:qrToken" element={<VerifyID />} />
      <Route path="/team-access" element={<TeamAccess />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="*" element={<Navigate to={user ? (user.role === 'Admin' || user.role === 'Super Admin' || user.role === 'Manager' ? '/' : '/employee/dashboard') : '/login'} />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster />
          <ChatProvider>
            {/* <FuturisticBackground /> */}
            <AIAssistant />
            <AppRoutes />
          </ChatProvider>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
