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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center group py-1" title="TERRA AI Home">
            <img 
              src="/terra-ai-logo.svg" 
              alt="TERRA AI Logo" 
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
            />
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
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : item.isSpecial
                      ? 'text-emerald-700 hover:bg-emerald-50 font-bold'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : item.isSpecial ? 'text-emerald-700' : 'text-slate-500'
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
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold text-[#133e24] shadow-xs transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-700" />
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
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : role === 'ORG_ADMIN'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                  className="flex items-center gap-1.5 p-2 rounded-xl text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs hidden md:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 transition"
                >
                  <LogIn className="w-4 h-4 text-emerald-700" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Get Started</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-200 overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
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
