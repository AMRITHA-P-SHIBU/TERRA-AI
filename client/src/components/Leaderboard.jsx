import React from 'react';
import { 
  Trophy, 
  Award, 
  Sparkles, 
  Shield, 
  Star, 
  Flame, 
  CheckCircle2, 
  Lock,
  ArrowUpRight
} from 'lucide-react';

export default function Leaderboard({ currentUser, badges, leaderboard }) {
  const pointsToNext = currentUser.nextLevelPoints - currentUser.ecoPoints;
  const progressPct = Math.round((currentUser.ecoPoints / currentUser.nextLevelPoints) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
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

        {/* Community Leaderboard (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Community Rankings</span>
            </h3>
            <span className="text-xs text-slate-500">This Month</span>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {leaderboard.map((user) => {
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
