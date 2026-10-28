import React from 'react';
import { 
  Home,
  Leaf, 
  Sparkles, 
  Flame, 
  ShoppingBag, 
  Bot, 
  Trophy, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, connectionStatus }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'feed', label: 'GreenFeed', icon: Leaf },
    { id: 'exchange', label: 'Eco Exchange', icon: ShoppingBag },
    { id: 'calculator', label: 'Carbon Tracker', icon: Flame },
    { id: 'ai', label: 'AI Eco Assistant', icon: Bot, isSpecial: true },
    { id: 'leaderboard', label: 'Leaderboard & Badges', icon: Trophy },
    { id: 'admin', label: 'Admin Portal', icon: ShieldCheck, roleRequired: 'admin' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('home')} 
            className="flex items-center cursor-pointer group py-1"
            title="TERRA AI Home"
          >
            <img 
              src="/terra-ai-logo.svg" 
              alt="TERRA AI" 
              className="h-11 sm:h-12 w-auto object-contain rounded-lg group-hover:scale-102 transition-transform" 
            />
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : item.isSpecial
                        ? 'text-emerald-700 hover:bg-emerald-50 font-bold'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.isSpecial ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                  {item.isSpecial && !isActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Points Widget */}
          <div className="flex items-center gap-3">
            {/* EcoPoints Pill */}
            <div 
              onClick={() => setActiveTab('leaderboard')}
              title="Click to view EcoPoints & Badges"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 cursor-pointer hover:border-emerald-400 transition-all hover:shadow-xs"
            >
              <div className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-600 flex items-center justify-center font-bold text-xs">
                ⭐
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-emerald-900">{currentUser.ecoPoints}</span>
                <span className="text-[10px] text-emerald-700 ml-1 font-medium hidden sm:inline">EcoPoints</span>
              </div>
            </div>

            {/* Supabase Status Indicator */}
            <div 
              title={`Supabase: ${connectionStatus.supabase?.status || 'checking'}`} 
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-600"
            >
              <span className={`w-2 h-2 rounded-full ${
                connectionStatus.supabase?.status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
              <span className="capitalize">{connectionStatus.supabase?.status === 'connected' ? 'Supabase Live' : 'Connecting'}</span>
            </div>

            {/* Profile Avatar */}
            <div 
              onClick={() => setActiveTab('leaderboard')}
              className="flex items-center gap-2 pl-1 cursor-pointer"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.fullName}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/30"
              />
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-100 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-xs font-medium ${
                  isActive ? 'text-emerald-700 font-bold' : 'text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[10px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
