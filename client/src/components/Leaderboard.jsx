import BackButton from "./BackButton";
import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/profileService';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  Shield, 
  Star, 
  Flame, 
  CheckCircle2, 
  Lock,
  ArrowUpRight,
  Loader2,
  Building2,
  User,
  Users,
} from 'lucide-react';

export default function Leaderboard({ currentUser, badges, leaderboard: staticLeaderboard }) {
  const { user, role, organization, membership } = useAuth();
  const isOrgUser = role === 'ORG_MEMBER' || role === 'ORG_ADMIN' || Boolean(membership?.organization_id || organization?.id);
  const myOrgId = organization?.id || membership?.organization_id || '';

  const [activeScope, setActiveScope] = useState(isOrgUser ? 'organization' : 'individual');
  const [selectedOrgId, setSelectedOrgId] = useState(myOrgId);
  const [organizations, setOrganizations] = useState([]);
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOrgUser) {
      setActiveScope('organization');
      if (myOrgId && !selectedOrgId) {
        setSelectedOrgId(myOrgId);
      }
    }
  }, [isOrgUser, myOrgId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getLeaderboard({
      scope: activeScope,
      organization_id: activeScope === 'organization' ? selectedOrgId : undefined,
    })
      .then((data) => {
        if (!active) return;
        setLiveLeaderboard(data || []);
        if (data.organizations && data.organizations.length > 0) {
          setOrganizations(data.organizations);
          if (!selectedOrgId && activeScope === 'organization') {
            const defaultId = data.activeOrganization?.id || data.organizations[0].id;
            setSelectedOrgId(defaultId);
          }
        }
      })
      .catch(() => {
        if (active) setLiveLeaderboard([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeScope, selectedOrgId]);

  const ecoPoints = currentUser?.ecoPoints ?? 0;
  const nextLevelPoints = currentUser?.nextLevelPoints ?? 500;
  const pointsToNext = Math.max(0, nextLevelPoints - ecoPoints);
  const progressPct = Math.min(100, Math.round((ecoPoints / (nextLevelPoints || 1)) * 100));

  // Use live leaderboard if available, otherwise fall back to static
  const displayLeaderboard = liveLeaderboard.length > 0 ? liveLeaderboard : staticLeaderboard;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <BackButton fallback="/dashboard/individual" label="Back to Dashboard" />
      </div>
      {/* Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-emerald-800 to-teal-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-950/10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/30 text-amber-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-amber-400/20">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span>Community Gamification & Recognition</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            EcoPoints, Badges & Leaderboard
          </h1>
          <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
            Every sustainable action you log earns EcoPoints. Unlock achievement badges, level up your environmental stewardship, and inspire your neighborhood.
          </p>
        </div>
      </div>

      {/* User Progress Stats Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="w-16 h-16 rounded-2xl object-cover ring-4 ring-emerald-100"
              />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-extrabold text-xs flex items-center justify-center border-2 border-white shadow-xs">
                {currentUser.ecoLevel}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{currentUser.fullName}</h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentUser.levelTitle}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{currentUser.location}</p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-black text-emerald-700">{currentUser.ecoPoints}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">EcoPoints</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-black text-teal-700">{currentUser.carbonSavedKg}kg</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">CO₂ Offset</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-black text-amber-600">{currentUser.actionsCompleted}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Actions</p>
            </div>
          </div>
        </div>

        {/* Level Progression Bar */}
        <div className="pt-6">
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-slate-700">
              Level {currentUser.ecoLevel}: <strong className="text-emerald-700">{currentUser.levelTitle}</strong>
            </span>
            <span className="text-slate-500">
              {pointsToNext} points to Level {currentUser.ecoLevel + 1}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Badges Collection (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Achievement Badges</span>
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              {badges.filter(b => b.unlocked).length} of {badges.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-4 rounded-3xl border transition-all flex items-start gap-3.5 ${
                  badge.unlocked
                    ? 'bg-white border-emerald-200/80 shadow-xs hover:border-emerald-400'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-xs ${
                  badge.unlocked ? 'bg-gradient-to-br from-emerald-100 to-teal-100' : 'bg-slate-200'
                }`}>
                  {badge.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-slate-900">{badge.name}</h4>
                    {badge.unlocked ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Earned
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        {badge.points} pts
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* How to Earn EcoPoints Card */}
          <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 mt-6">
            <h4 className="font-bold text-emerald-950 text-sm mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Ways to Earn EcoPoints Today:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900 font-medium">
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">+25 pts:</span>
                <span>Share tree planting or cleanup on GreenFeed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">+30 pts:</span>
                <span>Log monthly lifestyle carbon emissions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">+20 pts:</span>
                <span>List or exchange item in Eco Exchange Hub</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-700 font-bold">+10 pts:</span>
                <span>Encourage others by liking/commenting</span>
              </div>
            </div>
          </div>
        </div>

        {/* Community / Organization Leaderboard (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>
                  {activeScope === 'individual' ? 'Individual Rankings' : 'Organization Standings'}
                </span>
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {liveLeaderboard.length > 0 ? 'Live Standings' : 'This Month'}
              </span>
            </div>

            {/* Scope Switcher: Individual Citizens vs Users under Organization */}
            <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveScope('individual')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeScope === 'individual'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Individual People</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScope('organization')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeScope === 'organization'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Under Organization</span>
              </button>
            </div>

            {/* Organization Selector Dropdown (when organization scope is active) */}
            {activeScope === 'organization' && organizations.length > 0 && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                <label className="text-xs font-semibold text-slate-500 shrink-0">Organization:</label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="flex-1 p-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.organization_type || 'Org'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
                <span className="text-xs">Loading {activeScope === 'individual' ? 'individual' : 'organization'} leaderboard...</span>
              </div>
            ) : displayLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {activeScope === 'individual'
                  ? 'No individual leaderboard data yet. Start earning EcoPoints!'
                  : 'No users under this organization have earned EcoPoints yet.'}
              </div>
            ) : liveLeaderboard.length > 0 ? (
              /* Live API leaderboard */
              liveLeaderboard.map((user, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div
                    key={user.user_id || idx}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-black text-slate-400">
                        {idx < 3 ? medals[idx] : `#${idx + 1}`}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-2 border-slate-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                        {user.full_name?.[0]?.toUpperCase() || 'T'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
                          {user.role && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {user.role === 'ORG_ADMIN' ? 'Admin' : 'Member'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          Rank #{user.rank || idx + 1}
                          {user.organization_name && activeScope === 'organization' && (
                            <span> • {user.organization_name}</span>
                          )}
                          {user.location && activeScope === 'individual' && (
                            <span> • {user.location}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-700">{user.total_ecopoints}</span>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">pts</p>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Static fallback leaderboard */
              staticLeaderboard.map((user) => {
                const isCurrentUser = user.name.includes('You');
                return (
                  <div
                    key={user.rank}
                    className={`p-4 flex items-center justify-between transition-colors ${
                      isCurrentUser ? 'bg-emerald-50/70 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-black text-slate-400">
                        {user.rank <= 3 ? user.badge : `#${user.rank}`}
                      </span>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{user.name}</span>
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {user.level} • {user.actions} actions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-700">{user.points}</span>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase">pts</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
