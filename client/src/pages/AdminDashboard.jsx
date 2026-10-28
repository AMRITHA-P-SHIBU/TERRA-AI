import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  History,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'organizations' | 'users' | 'logs'

  // Data states
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedOrgLogs, setSelectedOrgLogs] = useState([]);
  const [activeOrgForLogs, setActiveOrgForLogs] = useState(null);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectOrg, setRejectOrg] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectRemarks, setRejectRemarks] = useState('');

  // Search/Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Load Pending Organizations
  const fetchPendingOrgs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/organizations/pending', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPendingOrgs(data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to load pending orgs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load All Organizations
  const fetchAllOrgs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/organizations', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAllOrgs(data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to load all orgs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load All Users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Audit Logs for Organization
  const fetchOrgLogs = async (org) => {
    try {
      setActiveOrgForLogs(org);
      const res = await fetch(`/api/admin/organizations/${org.id}/logs`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedOrgLogs(data.logs || []);
        setActiveTab('logs');
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') fetchPendingOrgs();
    if (activeTab === 'organizations') fetchAllOrgs();
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  // Action: Approve Organization
  const handleApprove = async (orgId) => {
    try {
      setActionLoading(orgId);
      const res = await fetch(`/api/admin/organizations/${orgId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ remarks: 'Organization verified and approved by Super Admin.' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');

      setFeedback({ type: 'success', message: data.message });
      await fetchPendingOrgs();
      if (activeTab === 'organizations') await fetchAllOrgs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Open Reject Modal
  const openRejectModal = (org) => {
    setRejectOrg(org);
    setRejectReason('');
    setRejectRemarks('');
    setRejectModalOpen(true);
  };

  // Action: Submit Reject
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('Please provide a specific rejection reason.');
      return;
    }

    try {
      setActionLoading(rejectOrg.id);
      const res = await fetch(`/api/admin/organizations/${rejectOrg.id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason, remarks: rejectRemarks || rejectReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');

      setFeedback({ type: 'success', message: data.message });
      setRejectModalOpen(false);
      await fetchPendingOrgs();
      if (activeTab === 'organizations') await fetchAllOrgs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Suspend Organization
  const handleSuspend = async (orgId) => {
    if (!confirm('Are you sure you want to suspend this organization? Member dashboards will be blocked.')) {
      return;
    }

    try {
      setActionLoading(orgId);
      const res = await fetch(`/api/admin/organizations/${orgId}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ remarks: 'Administrative suspension applied.' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to suspend');

      setFeedback({ type: 'success', message: data.message });
      await fetchAllOrgs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Reactivate Organization
  const handleReactivate = async (orgId) => {
    try {
      setActionLoading(orgId);
      const res = await fetch(`/api/admin/organizations/${orgId}/reactivate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ remarks: 'Organization reactivated by Super Admin.' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reactivate');

      setFeedback({ type: 'success', message: data.message });
      await fetchAllOrgs();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Toggle User Status
  const handleToggleUserStatus = async (targetUser) => {
    const newStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to set status to ${newStatus} for ${targetUser.email}?`)) {
      return;
    }

    try {
      setActionLoading(targetUser.id);
      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      setFeedback({ type: 'success', message: data.message });
      await fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  // Filter users
  const filteredUsers = usersList.filter((u) => {
    const matchSearch =
      u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = userRoleFilter === 'ALL' || u.account_type === userRoleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Super Admin Top Header */}
      <div className="rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PLATFORM SUPER ADMIN
              </span>
              <span className="text-xs text-slate-400">Master Governance Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Terra AI Administration Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingOrgs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('organizations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'organizations'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>All Organizations</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Management</span>
          </button>

          {activeOrgForLogs && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-sm animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: PENDING ORGANIZATIONS REVIEW QUEUE */}
      {/* ============================================================ */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Organization Verification Queue
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Carefully review official entity credentials and verification documents before activation.
              </p>
            </div>
            <button
              onClick={fetchPendingOrgs}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
              <p className="text-sm">Loading pending registration requests...</p>
            </div>
          ) : pendingOrgs.length === 0 ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">All caught up!</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No organizations are currently pending review. New submissions will immediately appear in this queue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {pendingOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-xl transition space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
                        {org.name ? org.name[0] : 'O'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{org.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            PENDING REVIEW
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Type: <strong className="text-slate-200">{org.organization_type}</strong> • Submitted:{' '}
                          {new Date(org.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* View Document Securely */}
                    {org.document_url ? (
                      <a
                        href={`/api/admin/organizations/${org.id}/document`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-slate-700 text-xs font-semibold transition"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Inspect Verification Document</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No document uploaded</span>
                    )}
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Official Email</span>
                      <p className="text-slate-200 font-mono mt-0.5">{org.official_email}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Contact Phone</span>
                      <p className="text-slate-200 mt-0.5">{org.contact_number}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Registration / Tax ID</span>
                      <p className="text-slate-200 mt-0.5">{org.registration_number || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Website</span>
                      <p className="text-slate-200 mt-0.5 truncate">
                        {org.website ? (
                          <a href={org.website} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                            {org.website}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>
                    <div className="sm:col-span-2 md:col-span-4">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Address / Headquarters</span>
                      <p className="text-slate-200 mt-0.5">{org.address}</p>
                    </div>
                  </div>

                  {/* Decision Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <button
                      onClick={() => fetchOrgLogs(org)}
                      className="text-xs text-slate-400 hover:text-cyan-400 transition flex items-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>View audit history</span>
                    </button>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => openRejectModal(org)}
                        disabled={actionLoading === org.id}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-4 h-4 text-rose-400" />
                        <span>Reject with Reason</span>
                      </button>

                      <button
                        onClick={() => handleApprove(org.id)}
                        disabled={actionLoading === org.id}
                        className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {actionLoading === org.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Approve Organization</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ALL ORGANIZATIONS (Approved / Suspended / Rejected) */}
      {/* ============================================================ */}
      {activeTab === 'organizations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                All Registered Organizations ({allOrgs.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage organization lifecycles, apply temporary suspensions, or reactivate compliant entities.
              </p>
            </div>
            <button
              onClick={fetchAllOrgs}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-2 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
                    <th className="py-3.5 px-4 font-semibold">Organization</th>
                    <th className="py-3.5 px-4 font-semibold">Type</th>
                    <th className="py-3.5 px-4 font-semibold">Official Contact</th>
                    <th className="py-3.5 px-4 font-semibold">Approval Status</th>
                    <th className="py-3.5 px-4 font-semibold">Registered</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {allOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400">
                            {org.name ? org.name[0] : 'O'}
                          </div>
                          <div>
                            <p className="font-bold text-white">{org.name}</p>
                            {org.registration_number && (
                              <p className="text-[11px] text-slate-400 font-mono">ID: {org.registration_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 text-xs">
                        {org.organization_type}
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-300">
                        <p>{org.official_email}</p>
                        <p className="text-slate-400 font-sans text-[11px]">{org.contact_number}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            org.approval_status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : org.approval_status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : org.approval_status === 'SUSPENDED'
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {org.approval_status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        {/* Audit Logs */}
                        <button
                          onClick={() => fetchOrgLogs(org)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                          title="View audit logs"
                        >
                          Logs
                        </button>

                        {/* Suspend / Reactivate / Approve Actions */}
                        {org.approval_status === 'APPROVED' && (
                          <button
                            onClick={() => handleSuspend(org.id)}
                            disabled={actionLoading === org.id}
                            className="px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold transition cursor-pointer"
                          >
                            Suspend
                          </button>
                        )}

                        {org.approval_status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleReactivate(org.id)}
                            disabled={actionLoading === org.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
                          >
                            Reactivate
                          </button>
                        )}

                        {org.approval_status === 'PENDING' && (
                          <button
                            onClick={() => handleApprove(org.id)}
                            disabled={actionLoading === org.id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold shadow transition cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: USER MANAGEMENT */}
      {/* ============================================================ */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Platform Users ({filteredUsers.length} of {usersList.length})
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Oversee citizen accounts, organization representatives, and platform access.
              </p>
            </div>

            {/* Search and Role Filter */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="ALL">All Roles</option>
                <option value="INDIVIDUAL">Citizens (INDIVIDUAL)</option>
                <option value="ORG_ADMIN">Org Admins (ORG_ADMIN)</option>
                <option value="SUPER_ADMIN">Super Admins</option>
              </select>

              <button
                onClick={fetchUsers}
                disabled={loading}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-950/40">
                    <th className="py-3.5 px-4 font-semibold">User</th>
                    <th className="py-3.5 px-4 font-semibold">Email</th>
                    <th className="py-3.5 px-4 font-semibold">Account Type</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Email Verified</th>
                    <th className="py-3.5 px-4 font-semibold">Created Date</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-cyan-400">
                          {u.full_name ? u.full_name[0] : 'U'}
                        </div>
                        <span>{u.full_name}</span>
                        {u.id === user?.id && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.account_type === 'SUPER_ADMIN'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : u.account_type === 'ORG_ADMIN'
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {u.account_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : u.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-300'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {u.email_verified ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-slate-400">Unverified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {u.account_type !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={actionLoading === u.id}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              u.status === 'ACTIVE'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: AUDIT LOGS */}
      {/* ============================================================ */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Organization Approval Audit Logs
              </h2>
              {activeOrgForLogs && (
                <p className="text-xs text-cyan-400 mt-1">
                  Filtered for: <strong>{activeOrgForLogs.name}</strong>
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveTab('organizations')}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              ← Back to All Organizations
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            {selectedOrgLogs.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">
                No approval or suspension logs recorded yet for this organization.
              </p>
            ) : (
              <div className="space-y-4">
                {selectedOrgLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            log.action === 'APPROVED' || log.action === 'REACTIVATED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-400">
                          by <strong className="text-slate-200">{log.admin_name}</strong> ({log.admin_email})
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium">
                        Remarks: {log.remarks || 'No remarks provided.'}
                      </p>
                    </div>

                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REJECT WITH REASON MODAL */}
      {/* ============================================================ */}
      {rejectModalOpen && rejectOrg && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setRejectModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Reject Organization Application</h3>
                <p className="text-xs text-slate-400">Organization: {rejectOrg.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Strict Rule: Rejection requires a clear justification that will be recorded in the audit log and emailed to the organization representative.
            </p>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Rejection Reason * (Visible to Org Admin)
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Uploaded certificate is illegible, or tax registration credentials could not be verified with the official registry."
                  className="block w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Internal Governance Remarks (Audit Log)
                </label>
                <input
                  type="text"
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="Optional internal notes for review board"
                  className="block w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === rejectOrg.id}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading === rejectOrg.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span>Confirm & Dispatch Rejection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
