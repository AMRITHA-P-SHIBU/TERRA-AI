import BackButton from "../components/BackButton";
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Clock,
  History,
  RefreshCw,
  Search,
  Check,
  X,
  Loader2,
  ExternalLink,
  Mail,
  Trash2,
  MessageSquare,
  TrendingUp,
  Award,
  Activity,
  Layers,
  ArrowUpRight,
  Sparkles,
  Megaphone,
  PlusCircle,
} from 'lucide-react';
import PostRequestsPanel from '../components/PostRequestsPanel';

export default function AdminDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'pending' | 'post-requests' | 'organizations' | 'users' | 'logs'

  // Data states
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('ECO_CAMPAIGN');
  const [annPriority, setAnnPriority] = useState('MEDIUM');
  const [annLoading, setAnnLoading] = useState(false);
  const [annPublishing, setAnnPublishing] = useState(false);
  const [pendingOrgs, setPendingOrgs] = useState([]);
  const [allOrgs, setAllOrgs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [selectedOrgLogs, setSelectedOrgLogs] = useState([]);
  const [activeOrgForLogs, setActiveOrgForLogs] = useState(null);
  const [contactMessages, setContactMessages] = useState([]);
  const [contactUnreadCount, setContactUnreadCount] = useState(0);
  const [contactSearch, setContactSearch] = useState('');

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

  // Load Dashboard Overview Stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await fetch('/api/admin/stats', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Announcements for Super Admin
  const fetchAnnouncements = async () => {
    try {
      setAnnLoading(true);
      const res = await fetch('/api/announcements?manage=true', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setAnnLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    try {
      setAnnPublishing(true);
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          category: annCategory,
          priority: annPriority,
        }),
      });
      if (res.ok) {
        setAnnTitle('');
        setAnnContent('');
        setFeedback({ type: 'success', message: 'Platform announcement broadcast successfully!' });
        await fetchAnnouncements();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to publish announcement.' });
      }
    } catch (err) {
      console.error('Failed to publish announcement:', err);
      setFeedback({ type: 'error', message: 'Failed to publish announcement.' });
    } finally {
      setAnnPublishing(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      const res = await fetch('/api/announcements/' + id, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Announcement deleted.' });
        await fetchAnnouncements();
      }
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

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


  // Load Contact Messages
  const fetchContactMessages = async () => {
    try {
      const res = await fetch('/api/admin/contact-messages', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setContactMessages(data.messages || []);
        setContactUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load contact messages:', err);
    }
  };

  const handleToggleMessageRead = async (msg) => {
    try {
      setActionLoading(msg.id);
      const res = await fetch(`/api/admin/contact-messages/${msg.id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_read: !msg.is_read }),
      });
      if (res.ok) {
        await fetchContactMessages();
      }
    } catch (err) {
      console.error('Failed to update message read status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this contact inquiry?')) return;
    try {
      setActionLoading(msgId);
      const res = await fetch(`/api/admin/contact-messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Inquiry deleted successfully.' });
        await fetchContactMessages();
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Pre-fetch count on mount
  useEffect(() => {
    fetchContactMessages();
    fetchStats();
    fetchPendingOrgs();
  }, []);
  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'pending') fetchPendingOrgs();
    if (activeTab === 'organizations') fetchAllOrgs();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'contact-messages') fetchContactMessages();
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
      <div className="flex items-center justify-start">
        <BackButton fallback="/" label="Back to Home" />
      </div>
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

        <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'announcements'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Announcements</span>
          </button>

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
            onClick={() => setActiveTab('post-requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'post-requests'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Post Requests</span>
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
            onClick={() => setActiveTab('contact-messages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'contact-messages'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Contact Inquiries {contactUnreadCount > 0 ? `(${contactUnreadCount})` : ''}</span>
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
      {/* TAB 0: DASHBOARD OVERVIEW (STATS CARDS & METRICS) */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-cyan-400 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <span>Platform Executive Overview</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Real-time governance telemetry, user adoption, verification pipelines, and EcoPoints circulation.
              </p>
            </div>
            <button
              onClick={fetchStats}
              disabled={statsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Stats</span>
            </button>
          </div>

          {/* Primary Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Users */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl group-hover:bg-cyan-500/10 transition" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Registered Users</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{stats?.users?.total ?? '—'}</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{stats?.users?.newThisWeek || 0} this wk
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>{stats?.users?.individual || 0} Citizens</span>
                <span>•</span>
                <span>{stats?.users?.orgAdmin || 0} Org Admins</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{stats?.users?.active || 0} Active</span>
              </div>
            </div>

            {/* Card 2: Organizations */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-teal-500/40 transition">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Organizations</span>
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{stats?.organizations?.total ?? '—'}</span>
                <span className="text-xs font-semibold text-teal-400">
                  {stats?.organizations?.approved || 0} Approved
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <button
                  onClick={() => setActiveTab('pending')}
                  className="text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  {stats?.organizations?.pending || 0} Pending Review
                </button>
                <span>•</span>
                <span>{stats?.organizations?.rejected || 0} Rejected</span>
              </div>
            </div>

            {/* Card 3: GreenFeed Posts */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">GreenFeed Actions</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{stats?.posts?.total ?? '—'}</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{stats?.posts?.newThisWeek || 0} this wk
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">{stats?.posts?.approved || 0} Published</span>
                <span>•</span>
                <button
                  onClick={() => setActiveTab('post-requests')}
                  className="text-amber-400 hover:underline font-semibold cursor-pointer"
                >
                  {stats?.posts?.pending || 0} Pending
                </button>
              </div>
            </div>

            {/* Card 4: EcoPoints Awarded */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl relative overflow-hidden group hover:border-amber-500/40 transition">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total EcoPoints</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-300">
                  {stats?.ecopoints?.total ? Number(stats.ecopoints.total).toLocaleString() : '—'}
                </span>
                <span className="text-xs font-semibold text-amber-400/80">PTS</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>{stats?.ecopoints?.individual || 0} Citizens</span>
                <span>•</span>
                <span>{stats?.ecopoints?.organization || 0} Org Teams</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: ANNOUNCEMENTS BROADCAST MANAGEMENT */}
      {/* ============================================================ */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-cyan-400 tracking-tight flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-cyan-400" />
                <span>Platform Public Announcements</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Broadcast public announcements, sustainability campaigns, and official system bulletins visible to all Individual Citizens.
              </p>
            </div>
            <button
              onClick={fetchAnnouncements}
              disabled={annLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${annLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Broadcasts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Announcement Card */}
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Platform Broadcast</h3>
              </div>
              <p className="text-xs text-slate-400">
                This notice will appear in the dashboards and feeds of all individual citizens.
              </p>

              <form onSubmit={handleCreateAnnouncement} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Announcement Title
                  </label>
                  <input
                    type="text"
                    required
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    placeholder="e.g. Earth Day 2026 Community Clean-Up Drive"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={annCategory}
                      onChange={(e) => setAnnCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="ECO_CAMPAIGN">Eco Campaign</option>
                      <option value="EVENT">Event</option>
                      <option value="URGENT">Urgent Notice</option>
                      <option value="GENERAL">General Bulletin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Priority Level
                    </label>
                    <select
                      value={annPriority}
                      onChange={(e) => setAnnPriority(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="MEDIUM">Standard</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent Alert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Announcement Body
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                    placeholder="Provide details about the initiative, schedule, eligibility, or platform updates..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={annPublishing || !annTitle.trim() || !annContent.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {annPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Broadcasting...</span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-4 h-4" />
                      <span>Broadcast to Individual Users</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* List of Published Announcements */}
            <div className="lg:col-span-2 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Live Broadcasts ({announcements.length})
                </h3>
                <span className="text-[11px] text-cyan-400 font-medium">Audience: Individual Platform Citizens</span>
              </div>

              {announcements.length === 0 ? (
                <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-8 text-center text-slate-500">
                  <Megaphone className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs">No platform announcements published yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-3 relative group hover:border-cyan-500/30 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            item.category === 'EVENT'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : item.category === 'ECO_CAMPAIGN'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.category === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {item.category?.replace('_', ' ') || 'GENERAL'}
                          </span>
                          {item.priority === 'URGENT' && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                              Priority Notice
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => handleDeleteAnnouncement(item.id)}
                            title="Delete announcement"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{item.content}</p>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Target: All Individual Citizens</span>
                        <span>Author: {item.author_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'post-requests' && (
        <div className="rounded-3xl border border-slate-800 bg-white p-5 shadow-sm sm:p-7">
          <PostRequestsPanel />
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: PENDING ORGANIZATIONS REVIEW QUEUE */}
      {/* ============================================================ */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Organization Verification Queue
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                All Registered Organizations ({allOrgs.length})
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
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
              <h2 className="text-xl font-bold text-cyan-400 tracking-tight">
                Platform Users ({filteredUsers.length} of {usersList.length})
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
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
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
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
      
      {/* ============================================================ */}
      {/* TAB: CONTACT INQUIRIES FROM HOMEPAGE */}
      {/* ============================================================ */}
      {activeTab === 'contact-messages' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-700" />
                <span>Contact Inquiries & Partner Leads</span>
                {contactUnreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {contactUnreadCount} New Unread
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Direct messages submitted via the public Contact section on the Home Page.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search sender, email, query..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <button
                onClick={fetchContactMessages}
                className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
                title="Refresh inquiries"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {contactMessages.filter(m => 
              m.sender_name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
              m.sender_email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
              m.message?.toLowerCase().includes(contactSearch.toLowerCase())
            ).length === 0 ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-12 text-center">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Inquiries Recorded Yet</h3>
                <p className="text-xs text-slate-400">
                  When visitors submit inquiries through the contact form, they will appear here in real time.
                </p>
              </div>
            ) : (
              contactMessages
                .filter(m => 
                  m.sender_name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  m.sender_email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                  m.message?.toLowerCase().includes(contactSearch.toLowerCase())
                )
                .map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-6 rounded-3xl border transition-all duration-300 ${
                      msg.is_read
                        ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                        : 'bg-slate-900/95 border-cyan-500/40 shadow-lg shadow-cyan-500/5 text-white ring-1 ring-cyan-500/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          msg.is_read
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        }`}>
                          {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{msg.sender_name}</h4>
                            {!msg.is_read && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                NEW
                              </span>
                            )}
                          </div>
                          <a
                            href={`mailto:${msg.sender_email}`}
                            className="text-xs text-cyan-400 hover:underline"
                          >
                            {msg.sender_email}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] text-slate-400 mr-2">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>

                        <button
                          onClick={() => handleToggleMessageRead(msg)}
                          disabled={actionLoading === msg.id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                            msg.is_read
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                          }`}
                        >
                          {msg.is_read ? 'Mark Unread' : 'Mark as Read'}
                        </button>

                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={actionLoading === msg.id}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition cursor-pointer"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-line bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

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
