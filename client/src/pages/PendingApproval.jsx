import BackButton from "../components/BackButton";
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Clock,
  XCircle,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Mail,
  Building2,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default function PendingApproval() {
  const { user, organization, checkAuth, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const status = organization?.approval_status || user?.status || 'PENDING';
  const orgName = organization?.name || 'Your Organization';
  const rejectionReason = organization?.rejection_reason;

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkAuth();
    setRefreshing(false);

    if (organization?.approval_status === 'APPROVED') {
      navigate('/dashboard/organization', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navbar Header */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <BackButton fallback="/" label="Back to Home" />
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">{orgName}</h1>
            <p className="text-xs text-slate-400">Representative: {user?.full_name} ({user?.email})</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Status Container */}
      <div className="max-w-2xl mx-auto w-full my-auto py-8 relative z-10">
        {/* CASE 1: PENDING APPROVAL */}
        {status === 'PENDING' && (
          <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-6 shadow-xl shadow-amber-500/10 animate-pulse">
              <Clock className="w-10 h-10" />
            </div>

            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wider mb-3">
              Application Under Review
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Organization Approval Pending
            </h2>
            <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              Your organization registration request for <strong className="text-white font-semibold">{orgName}</strong> has been successfully submitted and is currently being reviewed by the Terra AI Platform Super Admin team.
            </p>

            {/* Visual Review Timeline */}
            <div className="mt-8 pt-6 border-t border-slate-800 max-w-md mx-auto">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-emerald-300">Submitted</span>
                  <span className="text-[10px] text-slate-400">Details recorded</span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-1 animate-pulse">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-amber-300">Admin Review</span>
                  <span className="text-[10px] text-slate-400">Verifying documents</span>
                </div>

                <div className="flex flex-col items-center opacity-40">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center mb-1">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-400">Org Activation</span>
                  <span className="text-[10px] text-slate-400">Full access</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Checking Status...' : 'Refresh Approval Status'}</span>
              </button>

              <a
                href="mailto:admin@terra.eco?subject=Organization Registration Inquiry"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>Contact Admin Team</span>
              </a>
            </div>
          </div>
        )}

        {/* CASE 2: REJECTED */}
        {status === 'REJECTED' && (
          <div className="bg-slate-900/90 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-6 shadow-xl shadow-rose-500/10">
              <XCircle className="w-10 h-10" />
            </div>

            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20 uppercase tracking-wider mb-3">
              Registration Not Approved
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Application Rejected
            </h2>
            <p className="mt-3 text-slate-300 text-sm max-w-lg mx-auto">
              The administrator has reviewed your organization registration for <strong className="text-white font-semibold">{orgName}</strong> and declined approval based on the criteria below.
            </p>

            {/* Rejection Reason Card */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-left max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Administrator Remarks / Reason</span>
              </div>
              <p className="text-sm text-rose-100 font-medium leading-relaxed">
                "{rejectionReason || 'The provided verification document could not be authenticated, or official entity registration credentials were incomplete.'}"
              </p>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/signup/organization')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Resubmit Organization Application</span>
              </button>

              <button
                onClick={logout}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition cursor-pointer"
              >
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE 3: SUSPENDED */}
        {status === 'SUSPENDED' && (
          <div className="bg-slate-900/90 backdrop-blur-xl border border-orange-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mx-auto mb-6 shadow-xl shadow-orange-500/10">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-300 border border-orange-500/20 uppercase tracking-wider mb-3">
              Organization Suspended
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Access Temporarily Suspended
            </h2>
            <p className="mt-3 text-slate-300 text-sm max-w-lg mx-auto leading-relaxed">
              Active operations for <strong className="text-white font-semibold">{orgName}</strong> have been suspended by the platform governance board. Organization dashboards and member activities are currently locked.
            </p>

            <div className="mt-8 flex items-center justify-center gap-4">
              <a
                href="mailto:support@terra.eco?subject=Organization Suspension Appeal"
                className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm transition"
              >
                Contact Governance Admin
              </a>
              <button
                onClick={logout}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
              >
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-2xl mx-auto w-full text-center text-xs text-slate-400 relative z-10">
        <p>Terra AI Sustainability Governance Platform • All decisions logged in immutable audit records</p>
      </div>
    </div>
  );
}
