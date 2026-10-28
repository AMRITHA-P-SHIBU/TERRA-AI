import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth Components & Pages
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import ChooseAccountType from './pages/ChooseAccountType';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import IndividualSignup from './pages/IndividualSignup';
import OrganizationSignup from './pages/OrganizationSignup';
import PendingApproval from './pages/PendingApproval';
import IndividualDashboard from './pages/IndividualDashboard';
import OrganizationDashboard from './pages/OrganizationDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';

// Platform Modules
import HomePage from './components/HomePage';
import GreenFeed from './components/GreenFeed';
import EcoExchange from './components/EcoExchange';
import CarbonCalculator from './components/CarbonCalculator';
import AIAssistant from './components/AIAssistant';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';

import {
  currentUser as initialUser,
  initialFeedPosts,
  initialMarketplaceItems,
  badgesData,
  leaderboardData,
  initialAiSuggestions,
} from './data/mockData';

function LandingPageWrapper() {
  const { user, role, organization } = useAuth();
  const navigate = useNavigate();

  const handleExplore = () => {
    if (user) {
      if (role === 'SUPER_ADMIN') {
        navigate('/dashboard/admin');
      } else if (role === 'ORG_ADMIN') {
        if (organization?.approval_status === 'APPROVED') {
          navigate('/dashboard/organization');
        } else {
          navigate('/pending-approval');
        }
      } else {
        navigate('/dashboard/individual');
      }
    } else {
      // Directs to authentication account choice first!
      navigate('/signup');
    }
  };

  return (
    <HomePage
      onExplore={handleExplore}
      onNavigate={(tab) => {
        if (tab === 'home') navigate('/');
        else navigate(`/${tab}`);
      }}
    />
  );
}

function ModuleShell({ activeTab, children }) {
  const [currentUser] = useState(initialUser);
  const [connectionStatus, setConnectionStatus] = useState({
    status: 'connected',
    supabase: { status: 'connected' },
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      <Navbar
        activeTab={activeTab}
        currentUser={currentUser}
        connectionStatus={connectionStatus}
      />
      <main className="flex-1 pb-16">{children}</main>
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Terra AI • Sustainable Living & Environmental Intelligence</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <a href="/" className="hover:text-emerald-400">Home</a>
            <a href="/login" className="hover:text-emerald-400">Sign In</a>
            <a href="/signup" className="hover:text-emerald-400">Register</a>
            <a href="/admin/login" className="hover:text-cyan-400">Admin Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const [posts, setPosts] = useState(initialFeedPosts);
  const [marketplaceItems, setMarketplaceItems] = useState(initialMarketplaceItems);
  const [badges] = useState(badgesData);
  const [leaderboard] = useState(leaderboardData);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing & Authentication Flow */}
          <Route path="/" element={<LandingPageWrapper />} />
          <Route path="/signup" element={<ChooseAccountType />} />
          <Route path="/signup/individual" element={<IndividualSignup />} />
          <Route path="/signup/organization" element={<OrganizationSignup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Role-Protected Dashboards */}
          <Route
            path="/dashboard/individual"
            element={
              <ProtectedRoute allowedRoles={['INDIVIDUAL', 'SUPER_ADMIN']}>
                <ModuleShell activeTab="dashboard">
                  <IndividualDashboard />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/organization"
            element={
              <ProtectedRoute allowedRoles={['ORG_ADMIN', 'SUPER_ADMIN']} requireApprovedOrg={true}>
                <ModuleShell activeTab="dashboard">
                  <OrganizationDashboard />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <ModuleShell activeTab="admin">
                  <AdminDashboard />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          {/* Interactive Platform Modules (Authenticated) */}
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <ModuleShell activeTab="feed">
                  <GreenFeed posts={posts} setPosts={setPosts} currentUser={initialUser} />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/exchange"
            element={
              <ProtectedRoute>
                <ModuleShell activeTab="exchange">
                  <EcoExchange items={marketplaceItems} setItems={setMarketplaceItems} currentUser={initialUser} />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/calculator"
            element={
              <ProtectedRoute>
                <ModuleShell activeTab="calculator">
                  <CarbonCalculator currentUser={initialUser} />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <ModuleShell activeTab="ai">
                  <AIAssistant initialSuggestions={initialAiSuggestions} />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <ModuleShell activeTab="leaderboard">
                  <Leaderboard currentUser={initialUser} badges={badges} leaderboard={leaderboard} />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                <ModuleShell activeTab="admin">
                  <AdminDashboard />
                </ModuleShell>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}