import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Building2, CheckCircle2, Loader2, Lock, Trophy } from 'lucide-react';
import BackButton from './BackButton';
import { useAuth } from '../context/AuthContext';
import AvatarCircle from './AvatarCircle';
import { ecoExchangeService } from '../services/ecoExchangeService';
import {
  getAchievementBadges,
  getLeaderboard,
  getProfile,
} from '../services/profileService';

function Metric({ label, value, suffix = '' }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/75 p-3 text-center">
      <p className="text-xl font-black text-emerald-900">{value ?? 0}{suffix}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

function BadgeIcons({ badges = [] }) {
  if (!badges.length) return <span className="text-xs text-slate-400">No badges yet</span>;
  return (
    <span className="inline-flex items-center gap-1" aria-label={`${badges.length} earned badges`}>
      {badges.slice(0, 4).map((badge) => (
        <span key={badge.id} title={badge.name} className="text-base leading-none">{badge.icon || '🌱'}</span>
      ))}
      {badges.length > 4 && <span className="text-[10px] font-bold text-slate-500">+{badges.length - 4}</span>}
    </span>
  );
}

export default function Leaderboard() {
  const { user, role } = useAuth();
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const earnedBeforeRefresh = useRef(null);
  const activeRef = useRef(true);
  const entryCount = useRef(0);

  const loadLeaderboard = useCallback(async (append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError('');
    try {
      const offset = append ? entryCount.current : 0;
      const [nextData, nextBadges, nextProfile] = await Promise.all([
        getLeaderboard({ limit: 10, offset }),
        getAchievementBadges(),
        getProfile(),
      ]);
      if (!activeRef.current) return;
      setData((current) => append && current
        ? { ...nextData, leaderboard: [...current.leaderboard, ...(nextData.leaderboard || [])] }
        : nextData);
      entryCount.current = append
        ? entryCount.current + (nextData.leaderboard || []).length
        : (nextData.leaderboard || []).length;
      setProfile(nextProfile);
      setBadges(nextBadges);
      const earned = nextBadges.filter((badge) => badge.earned);
      const earnedIds = new Set(earned.map((badge) => badge.id));
      if (earnedBeforeRefresh.current) {
        const newlyEarned = earned.find((badge) => !earnedBeforeRefresh.current.has(badge.id));
        if (newlyEarned) {
          setToast(`${newlyEarned.name} badge earned!`);
          window.setTimeout(() => setToast(''), 4000);
        }
      }
      earnedBeforeRefresh.current = earnedIds;
    } catch (loadError) {
      if (activeRef.current) setError(loadError.message || 'Unable to load the leaderboard.');
    } finally {
      if (activeRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    const initialLoad = window.setTimeout(() => loadLeaderboard(), 0);
    let channel;
    ecoExchangeService.setRealtimeUser(user?.id)
      .then(() => {
        if (activeRef.current) {
          channel = ecoExchangeService.subscribeToActivityEvents(() => loadLeaderboard());
        }
      })
      .catch((realtimeError) => {
        if (activeRef.current) setError(realtimeError.message || 'Live updates are unavailable.');
      });
    return () => {
      activeRef.current = false;
      window.clearTimeout(initialLoad);
      if (channel) ecoExchangeService.removeChannel(channel);
    };
  }, [user?.id, loadLeaderboard]);

  const entries = data?.leaderboard || [];
  const viewerInPage = entries.some((entry) => entry.user_id === user?.id);
  const viewerRank = data?.viewer_rank;
  const leader = data?.leader;
  const isOrg = data?.scope === 'organization';
  const dashboardPath = role === 'ORG_ADMIN' || role === 'ORG_MEMBER'
    ? '/dashboard/organization'
    : '/dashboard/individual';
  const myRow = !viewerInPage && viewerRank ? {
    user_id: user?.id,
    full_name: profile?.full_name || user?.full_name,
    avatar_url: profile?.avatar_url,
    total_ecopoints: data?.viewer_points ?? profile?.total_ecopoints ?? 0,
    rank: viewerRank,
    badge_icons: [],
  } : null;

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-6 sm:px-6 sm:py-9">
      <BackButton fallback={dashboardPath} label="Back to Dashboard" />
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-100">
          <Trophy className="h-5 w-5 text-amber-300" />
          {isOrg ? 'Organization community' : 'Individual community'}
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">EcoPoints Leaderboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-100">
          {isOrg
            ? `Rankings are limited to active members of ${data?.organization_name || 'your organization'}.`
            : 'Rankings include individual citizens only. Earn EcoPoints through approved community activities.'}
        </p>
      </section>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>{error}</span>
          <button onClick={() => loadLeaderboard()} className="ml-auto font-bold underline">Retry</button>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-lime-50 via-emerald-50 to-teal-50 p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-800">
          <Trophy className="h-4 w-4 text-amber-500" /> Eco Warrior spotlight
        </div>
        {loading && !data ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-emerald-100" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-16 rounded-xl bg-emerald-100" />)}</div>
          </div>
        ) : leader ? (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-4">
              <AvatarCircle fullName={leader.full_name} avatarUrl={leader.avatar_url} size="lg" className="ring-4 ring-emerald-200 shadow-[0_0_24px_rgba(16,185,129,0.3)]" />
              <div className="min-w-0 flex-1">
                <h2 className="flex flex-wrap items-center gap-2 text-xl font-black text-slate-900 sm:text-2xl">
                  {leader.full_name || 'Terra member'}
                  <span title="Eco Warrior" className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-base">🏆</span>
                </h2>
                {isOrg && <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-600"><Building2 className="h-4 w-4" />{leader.organization_name || data?.organization_name}</p>}
                <p className="mt-1 text-sm font-bold text-emerald-800">Rank #1 · {leader.total_ecopoints} EcoPoints</p>
              </div>
              <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900">Eco Warrior</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Total EcoPoints" value={leader.total_ecopoints} />
              <Metric label="Approved posts" value={leader.approved_posts} />
              <Metric label="Exchange activities" value={(leader.listings || 0) + (leader.completed_exchanges || 0)} />
              <Metric label="Carbon reduction" value={leader.carbon_offset_kg} suffix=" kg" />
              <Metric label="Badges earned" value={leader.badges_earned} />
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/40 bg-white/75 p-3">
                <BadgeIcons badges={leader.badge_icons} />
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Badges</p>
              </div>
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-emerald-300 bg-white/60 p-6 text-center text-sm font-semibold text-emerald-900">
            No one on the leaderboard yet. Earn EcoPoints to take the lead!
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Trophy className="h-5 w-5 text-amber-500" />Ranked members</h2>
            <p className="mt-1 text-xs text-slate-500">{data?.total || 0} member{data?.total === 1 ? '' : 's'} in this community</p>
          </div>
          {viewerRank && <p className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-800">Your rank: #{viewerRank}</p>}
        </div>
        {loading && !data ? (
          <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : entries.length === 0 ? (
          <div>
            <p className="p-8 text-center text-sm text-slate-500">No one on the leaderboard yet. Earn EcoPoints to take the lead!</p>
            {myRow && (
              <div className="flex items-center gap-3 border-t-2 border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3.5 sm:px-6">
                <span className="w-10 shrink-0 text-center text-sm font-black text-slate-500">#{myRow.rank}</span>
                <AvatarCircle fullName={myRow.full_name} avatarUrl={myRow.avatar_url} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{myRow.full_name || 'You'} <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">You</span></p>
                <p className="shrink-0 text-right text-sm font-black text-emerald-800">{myRow.total_ecopoints} <span className="text-[10px] font-bold uppercase text-slate-400">pts</span></p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map((entry) => {
              const isViewer = entry.user_id === user?.id;
              return (
                <div key={entry.user_id} className={`flex items-center gap-3 px-4 py-3.5 sm:px-6 ${isViewer ? 'bg-emerald-50/80' : 'hover:bg-slate-50'}`}>
                  <span className="w-10 shrink-0 text-center text-sm font-black text-slate-500">#{entry.rank}</span>
                  <AvatarCircle fullName={entry.full_name} avatarUrl={entry.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{entry.full_name || 'Terra member'}{isViewer && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">You</span>}</p>
                    <div className="mt-1"><BadgeIcons badges={entry.badge_icons} /></div>
                  </div>
                  <p className="shrink-0 text-right text-sm font-black text-emerald-800">{entry.total_ecopoints} <span className="text-[10px] font-bold uppercase text-slate-400">pts</span></p>
                </div>
              );
            })}
            {myRow && (
              <div className="flex items-center gap-3 border-t-2 border-dashed border-emerald-200 bg-emerald-50/70 px-4 py-3.5 sm:px-6">
                <span className="w-10 shrink-0 text-center text-sm font-black text-slate-500">#{myRow.rank}</span>
                <AvatarCircle fullName={myRow.full_name} avatarUrl={myRow.avatar_url} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-900">{myRow.full_name || 'You'} <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">You</span></p>
                <p className="shrink-0 text-right text-sm font-black text-emerald-800">{myRow.total_ecopoints} <span className="text-[10px] font-bold uppercase text-slate-400">pts</span></p>
              </div>
            )}
          </div>
        )}
        {entries.length < (data?.total || 0) && (
          <div className="border-t border-slate-100 p-4 text-center">
            <button disabled={loadingMore} onClick={() => loadLeaderboard(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
              {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}Load more
            </button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-extrabold text-slate-900"><Award className="h-5 w-5 text-amber-500" />Achievement Badges</h2>
          <p className="mt-1 text-sm text-slate-600">Badges are awarded automatically by the platform as you reach each milestone.</p>
        </div>
        <article className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-3xl">🏆</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900">Eco Warrior</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Awarded to the member with the highest EcoPoints in their community. Overtake the leader to claim it.</p>
              <p className="mt-3 text-sm font-bold text-emerald-800">
                Current holder: {leader?.full_name || 'No holder yet'}
                {leader && viewerRank !== 1 && ` · ${Math.max(0, Number(leader.total_ecopoints) - Number(data?.viewer_points || 0) + 1)} points needed to take the lead`}
              </p>
            </div>
          </div>
        </article>
        {loading && !badges.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.filter((badge) => badge.code !== 'eco_warrior').map((badge) => {
              const value = Number(badge.criteria_value) || 1;
              const progress = Math.min(100, Math.round((Number(badge.progress || 0) / value) * 100));
              return (
                <article key={badge.id} className={`rounded-2xl border p-4 ${badge.earned ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${badge.earned ? 'bg-emerald-100' : 'bg-slate-200 grayscale'}`}>{badge.icon || '🌱'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-extrabold text-slate-900">{badge.name}</h3>
                        {badge.earned ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Lock className="h-4 w-4 shrink-0 text-slate-400" />}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{badge.description}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-slate-500">
                      <span>{badge.earned ? 'Earned' : `${Number(badge.progress || 0)} / ${value}`}</span><span>{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${badge.earned ? 'bg-emerald-500' : 'bg-teal-500'}`} style={{ width: `${progress}%` }} /></div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white shadow-xl"><CheckCircle2 className="h-4 w-4" />{toast}</div>}
    </main>
  );
}
