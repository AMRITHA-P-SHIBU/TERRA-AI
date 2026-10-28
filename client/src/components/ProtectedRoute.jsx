import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

/**
 * Role-Based and Organization-Approval Protected Route
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string[]} [props.allowedRoles] - Allowed account types
 * @param {boolean} [props.requireApprovedOrg] - Whether organization must be APPROVED
 */
export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requireApprovedOrg = false,
}) {
  const { user, role, organization, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-200">
        <div className="flex flex-col items-center gap-4 p-8 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-md">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-sm font-medium tracking-wide text-slate-300">
            Verifying Terra AI permissions...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    const isSuperAdminRoute =
      allowedRoles.length === 1 && allowedRoles.includes('SUPER_ADMIN');
    const redirectTarget = isSuperAdminRoute ? '/admin/login' : '/login';
    return <Navigate to={redirectTarget} state={{ from: location }} replace />;
  }

  // Suspended account check
  if (user?.status === 'SUSPENDED') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-rose-500/30 rounded-2xl p-8 text-center text-white shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-rose-400 mb-2">Account Suspended</h2>
          <p className="text-slate-300 text-sm mb-6">
            Your account has been suspended by the platform administrator. Access to dashboards and interactive modules is currently restricted.
          </p>
          <a
            href="mailto:support@terra.eco"
            className="inline-block px-5 py-2.5 bg-rose-600 hover:bg-rose-500 rounded-xl text-sm font-semibold transition"
          >
            Contact Terra AI Support
          </a>
        </div>
      </div>
    );
  }

  // Check if role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to their respective authorized dashboard
    if (role === 'SUPER_ADMIN') {
      return <Navigate to="/dashboard/admin" replace />;
    }
    if (role === 'ORG_ADMIN') {
      return organization?.approval_status === 'APPROVED' ? (
        <Navigate to="/dashboard/organization" replace />
      ) : (
        <Navigate to="/pending-approval" replace />
      );
    }
    return <Navigate to="/dashboard/individual" replace />;
  }

  // If Organization Admin & route requires approved organization
  if (role === 'ORG_ADMIN' && requireApprovedOrg) {
    const approvalStatus = organization?.approval_status;
    if (approvalStatus !== 'APPROVED') {
      return <Navigate to="/pending-approval" replace />;
    }
  }

  return children;
}
