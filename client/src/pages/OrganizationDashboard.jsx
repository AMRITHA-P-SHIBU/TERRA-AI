import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  MapPin,
  Globe,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  X,
  Send,
  Sparkles,
} from 'lucide-react';

export default function OrganizationDashboard() {
  const { user, organization, membership } = useAuth();

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [membersError, setMembersError] = useState(null);

  // Invite Modal State
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  // Fetch Organization Members
  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch('/api/organizations/my/members', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch organization team members');
      }

      const data = await res.json();
      setMembers(data.members || []);
      setMembersError(null);
    } catch (err) {
      setMembersError(err.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail) {
      setInviteError('Please enter the colleague email address.');
      return;
    }

    try {
      setInviteLoading(true);
      const res = await fetch('/api/organizations/my/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch invitation');
      }

      setInviteSuccess(`Invitation successfully dispatched to ${inviteEmail}!`);
      setInviteEmail('');
      await fetchMembers();

      setTimeout(() => {
        setInviteSuccess(null);
        setInviteModalOpen(false);
      }, 1800);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Organization Verified Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/70 border border-cyan-500/30 p-6 sm:p-10 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> VERIFIED ORGANIZATION
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {organization?.organization_type || 'Eco Organization'}
                </span>
                {organization?.registration_number && (
                  <span className="text-xs text-slate-400">
                    Reg: {organization.registration_number}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {organization?.name || 'Organization Admin Center'}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {organization?.official_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{organization.official_email}</span>
                  </div>
                )}
                {organization?.contact_number && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{organization.contact_number}</span>
                  </div>
                )}
                {organization?.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{organization.address}</span>
                  </div>
                )}
                {organization?.website && (
                  <a
                    href={organization.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-cyan-400 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{organization.website}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Admin Actions */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Team Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* Organization Security & Data Isolation Notice */}
      <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Org-Level Data Isolation:</strong> All member listings and actions are scoped to{' '}
            <strong className="text-white">{organization?.name}</strong> based on your verified membership ID.
          </span>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[11px] font-mono">
          Role: {membership?.role || 'ORG_ADMIN'}
        </span>
      </div>

      {/* Member Management Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Organization Members & Roles
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Supports multiple administrators and collaboration roles within your organization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Total Members: <strong className="text-white font-semibold">{members.length}</strong>
            </span>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          </div>
        </div>

        {/* Member Table */}
        {loadingMembers ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-sm">Loading organization member roster...</p>
          </div>
        ) : membersError ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{membersError}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-300">No additional members found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Invite Team Member" above to add colleagues.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Organization Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
                        {member.full_name ? member.full_name[0] : 'U'}
                      </div>
                      <span>{member.full_name}</span>
                      {member.user_id === user?.id && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
                          You
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                      {member.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          member.role === 'ORG_ADMIN'
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {member.role === 'ORG_ADMIN' ? 'Admin' : 'Member'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : member.status === 'INVITED'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
            <button
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Invite Colleague</h3>
                <p className="text-xs text-slate-400">Add a member to {organization?.name}</p>
              </div>
            </div>

            {inviteSuccess && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{inviteSuccess}</span>
              </div>
            )}

            {inviteError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@domain.com"
                  className="block w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Membership Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="block w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="MEMBER">Standard Member (View & Collaborate)</option>
                  <option value="ORG_ADMIN">Organization Admin (Manage Members & Settings)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  You can grant Organization Admin permissions to multiple leaders.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {inviteLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
