import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Leaf,
  Home,
  ShoppingBag,
  Flame,
  Bot,
  Trophy,
  ShieldCheck,
  Building2,
  User,
  LogOut,
  LogIn,
  UserPlus,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, connectionStatus }) {
  const { user, role, organization, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getDashboardLink = () => {
    if (role === 'SUPER_ADMIN') return '/dashboard/admin';
    if (role === 'ORG_ADMIN') {
      return organization?.approval_status === 'APPROVED'
        ? '/dashboard/organization'
        : '/pending-approval';
    }
    return '/dashboard/individual';
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, route: '/' },
    { id: 'feed', label: 'GreenFeed', icon: Leaf },
    { id: 'exchange', label: 'Eco Exchange', icon: ShoppingBag },
    { id: 'calculator', label: 'Carbon Tracker', icon: Flame },
    { id: 'ai', label: 'AI Assistant', icon: Bot, isSpecial: true },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const handleNavClick = (item) => {
    if (item.route) {
      navigate(item.route);
    }
    if (setActiveTab) {
      setActiveTab(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group py-1" title="TERRA AI Home">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition shadow-sm">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              TERRA <span className="text-emerald-400">AI</span>
            </span>
          </Link>

          {/* Center Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : item.isSpecial
                      ? 'text-emerald-400 hover:bg-slate-800 font-bold'
                      : 'text-slate-300 hover:text-emerald-300 hover:bg-slate-800/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : item.isSpecial ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Auth Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {/* Role-based Dashboard button */}
                <Link
                  to={getDashboardLink()}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-white shadow-xs transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">
                    {role === 'SUPER_ADMIN'
                      ? 'Admin Console'
                      : role === 'ORG_ADMIN'
                      ? 'Org Dashboard'
                      : 'My Dashboard'}
                  </span>
                </Link>

                {/* Role Pill */}
                <span
                  className={`hidden lg:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    role === 'SUPER_ADMIN'
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                      : role === 'ORG_ADMIN'
                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {role === 'SUPER_ADMIN' && <ShieldCheck className="w-3 h-3" />}
                  {role === 'ORG_ADMIN' && <Building2 className="w-3 h-3" />}
                  {role === 'INDIVIDUAL' && <User className="w-3 h-3" />}
                  <span>{role}</span>
                </span>

                {/* User Name & Logout */}
                <button
                  onClick={logout}
                  title="Sign out of Terra AI"
                  className="flex items-center gap-1.5 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-xs font-medium ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'
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
