import BackButton from "../components/BackButton";
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Leaf,
  Sparkles,
  ShoppingBag,
  Calculator,
  Bot,
  Award,
  TrendingUp,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  KeyRound,
  Trophy,
} from 'lucide-react';
import { getAchievementBadges, getDashboardStats, getProfile, getLeaderboard } from '../services/profileService';
import { ecoExchangeService } from '../services/ecoExchangeService';
import AnnouncementsFeed from '../components/AnnouncementsFeed';

export default function IndividualDashboard({ onSelectTab }) {
  const { user, role, organization, membership } = useAuth();
  const navigate = useNavigate();
  const [livePoints, setLivePoints] = useState(null);
  const [topUsers, setTopUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [badgeToast, setBadgeToast] = useState('');
  const [statsRetry, setStatsRetry] = useState(0);
  const previousBadgeIds = useRef(null);

  useEffect(() => {
    let active = true;
    let channel;
    const refresh = async () => {
      try {
        const [stats, profile, badges] = await Promise.all([
          getDashboardStats(),
          getProfile(),
          getAchievementBadges(),
        ]);
        if (!active) return;
        setDashboardStats(stats);
        setLivePoints(profile?.total_ecopoints ?? 0);
        setStatsError('');
        const earnedIds = new Set(badges.filter((badge) => badge.earned).map((badge) => badge.id));
        if (previousBadgeIds.current) {
          const newlyEarned = badges.find((badge) => badge.earned && !previousBadgeIds.current.has(badge.id));
          if (newlyEarned) {
            setBadgeToast(`${newlyEarned.name} badge earned!`);
            window.setTimeout(() => setBadgeToast(''), 4000);
          }
        }
        previousBadgeIds.current = earnedIds;
      } catch (error) {
        if (active) setStatsError(error.message || 'Unable to load your dashboard statistics.');
      } finally {
        if (active) setStatsLoading(false);
      }

      try {
        const leaderboard = await getLeaderboard({ limit: 5, offset: 0 });
        if (active) setTopUsers(leaderboard.leaderboard || []);
      } catch (error) {
        if (active) console.error('[Dashboard] Unable to refresh the leaderboard preview:', error);
      }
    };

    refresh();
    if (user?.id) {
      ecoExchangeService.setRealtimeUser(user.id)
        .then(() => {
          if (active) channel = ecoExchangeService.subscribeToActivityEvents(refresh);
        })
        .catch((error) => {
          if (active) console.error('[Dashboard] Live updates are unavailable:', error);
        });
    }

    return () => {
      active = false;
      if (channel) ecoExchangeService.removeChannel(channel);
    };
  }, [user?.id, statsRetry]);

  const handleLaunchModule = (tab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-start">
          <BackButton fallback="/" label="Back to Home" />
        </div>
        {/* Welcome Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-emerald-200 p-6 sm:p-10 shadow-md overflow-hidden">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-80 h-80 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-3">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Citizen Dashboard • Active Member</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#133e24] tracking-tight">
                Hello, {user?.full_name || 'Eco Champion'}! 🌱
              </h1>
              <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl">
                Track your daily sustainable habits, log zero-waste activities on GreenFeed, and discover pre-loved items in the Eco Exchange Hub.
              </p>
            </div>

            {/* Eco Points Card */}
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shrink-0 flex items-center gap-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Earned EcoPoints</span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-700">{livePoints !== null ? livePoints : '—'} pts</p>
                <span className="text-[11px] text-emerald-600 font-medium">Your current community total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statsError && (
            <div role="alert" className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <span>{statsError}</span>
              <button onClick={() => { setStatsLoading(true); setStatsRetry((value) => value + 1); }} className="ml-auto font-bold underline">Retry</button>
            </div>
          )}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carbon Offset</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            {statsLoading ? (
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="text-2xl font-black text-slate-800 mt-3">{Number(dashboardStats?.carbon_offset_kg || 0).toFixed(1)} <span className="text-sm font-semibold text-slate-500">kg CO₂e</span></p>
                <p className="text-xs text-emerald-700 mt-1 font-medium">{dashboardStats?.carbon_offset_kg ? 'Recorded month-to-month carbon reductions' : 'Log carbon activities to track reductions.'}</p>
              </>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GreenFeed Posts</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
            </div>
            {statsLoading ? (
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="text-2xl font-black text-slate-800 mt-3">{dashboardStats?.approved_posts || 0} <span className="text-sm font-semibold text-slate-500">Posts</span></p>
                <p className="text-xs text-teal-600 mt-1 font-medium">
                  {dashboardStats?.pending_posts ? `${dashboardStats.pending_posts} pending review` : dashboardStats?.approved_posts ? 'Approved GreenFeed posts' : 'Share your first GreenFeed post.'}
                </p>
              </>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eco Exchange</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            {statsLoading ? (
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="text-2xl font-black text-slate-800 mt-3">{dashboardStats?.listings || 0} <span className="text-sm font-semibold text-slate-500">Listings</span></p>
                <p className="text-xs text-teal-600 mt-1 font-medium">
                  {dashboardStats?.completed_exchanges || 0} completed exchanges{!dashboardStats?.listings && !dashboardStats?.completed_exchanges ? ' · List your first item.' : ''}
                </p>
              </>
            )}
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Community Badges</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            {statsLoading ? (
              <div className="mt-3 h-8 w-28 animate-pulse rounded bg-slate-700" />
            ) : (
              <>
                <p className="text-2xl font-black text-white mt-3">{dashboardStats?.earned_badges || 0} <span className="text-sm font-semibold text-slate-400">of {dashboardStats?.total_badges || 0}</span></p>
                <p className="text-xs text-amber-400 mt-1 font-medium">
                  {dashboardStats?.earned_badges ? 'Keep going to earn more badges.' : 'Complete activities to earn your first badge.'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Official Announcements */}
        <AnnouncementsFeed className="mt-2" />

        {/* Main Platform Navigation Modules */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">Explore Sustainability Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Module 1: GreenFeed */}
            <div
              onClick={() => handleLaunchModule('feed')}
              className="group cursor-pointer bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all shadow-lg flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Leaf className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white group-hover:text-emerald-300 transition text-base">
                    GreenFeed Community
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Post proof of green actions like tree planting, beach cleanup, and cycling. Earn verified EcoPoints from moderators.
                </p>
              </div>
            </div>

            {/* Module 2: Eco Exchange Hub */}
            <div
              onClick={() => handleLaunchModule('exchange')}
              className="group cursor-pointer bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all shadow-lg flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white group-hover:text-teal-300 transition text-base">
                    Eco Exchange Hub
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-400 transition" />
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Circular economy marketplace for exchanging, donating, or selling pre-loved sustainable goods and gardening supplies.
                </p>
              </div>
            </div>

            {/* Module 3: Carbon Calculator */}
            <div
              onClick={() => handleLaunchModule('calculator')}
              className="group cursor-pointer bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all shadow-lg flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Calculator className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white group-hover:text-cyan-300 transition text-base">
                    Personal Carbon Tracker
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Log transportation mileage, household electricity kWh, and waste generation. Receive automated emission mitigation recommendations.
                </p>
              </div>
            </div>

            {/* Module 4: AI Eco Assistant */}
            <div
              onClick={() => handleLaunchModule('ai')}
              className="group cursor-pointer bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 rounded-2xl p-6 transition-all shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition text-base">
                    AI Eco Assistant
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Powered by Gemini LLM. Ask instant practical advice about apartment composting, solar feasibility, and coconut upcycling.
                </p>
              </div>
            </div>
          </div>
        </div>

        
        {/* Module 5: Community Eco-Leaderboard */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {(role === 'ORG_MEMBER' || membership?.organization_id || organization?.id)
                    ? (organization?.name ? `${organization.name} Member Standings` : 'Organization Member Leaderboard')
                    : 'Individual Citizens Leaderboard'}
                </h3>
                <p className="text-xs text-slate-400">
                  {(role === 'ORG_MEMBER' || membership?.organization_id || organization?.id)
                    ? 'Top sustainability contributors within your organization'
                    : 'Top individual environmental champions ranked by verified EcoPoints'}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleLaunchModule('leaderboard')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View Full Leaderboard</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topUsers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">No leaderboard data yet. Earn EcoPoints by posting on GreenFeed!</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topUsers.map((u, idx) => {
                const medals = ['🥇', '🥈', '🥉'];
                const isCurrentUser = u.user_id === user?.id;
                return (
                  <div
                    key={u.user_id || idx}
                    className={`flex items-center justify-between py-3 px-2 rounded-xl transition ${
                      isCurrentUser ? 'bg-emerald-50/70 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-sm font-black text-slate-400">
                        {idx < 3 ? medals[idx] : `#${idx + 1}`}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-xs font-bold text-emerald-700 border border-emerald-200">
                        {u.full_name?.[0]?.toUpperCase() || 'T'}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                          {u.full_name}
                          {isCurrentUser && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 font-bold">
                              You
                            </span>
                          )}
                        </span>
                        <p className="text-[11px] text-slate-400">Rank #{u.rank || idx + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-700">{u.total_ecopoints}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 ml-1">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* User Credentials & Security Info */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Authenticated Session Active</p>
              <p className="text-slate-500">Logged in as {user?.email} • Account Type: {role || user?.account_type}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/profile?settings=password')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
              Status: ACTIVE
            </span>
            <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full">
              Role: {role || user?.account_type}
            </span>
          </div>
        </div>

      </div>
      {badgeToast && <div role="status" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-xl"><CheckCircle2 className="h-4 w-4" />{badgeToast}</div>}
    </div>
  );
}
