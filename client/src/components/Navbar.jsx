import { useState, useRef, useEffect } from 'react';
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
  LayoutDashboard,
  MessageCircle,
} from 'lucide-react';
import AvatarCircle from './AvatarCircle';
import { ecoExchangeService } from '../services/ecoExchangeService';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, role, organization, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  // Dropdown state for individual avatar menu
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!user?.id) {
      ecoExchangeService.clearRealtimeUser();
      return undefined;
    }
    let active = true;
    let channel;
    const refreshUnread = () => ecoExchangeService.getUnreadCount()
      .then(({ count }) => { if (active) setUnreadCount(count); })
      .catch((error) => console.error('[Navbar] Unable to refresh unread messages:', error));
    refreshUnread();
    ecoExchangeService.setRealtimeUser(user.id).then(() => {
      if (active) channel = ecoExchangeService.subscribeToNotifications(user.id, refreshUnread);
    }).catch((error) => console.error('[Navbar] Message notifications are unavailable:', error));
    const timer = window.setInterval(refreshUnread, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
      if (channel) ecoExchangeService.removeChannel(channel);
    };
  }, [user?.id]);

  const getDashboardLink = () => {
    if (role === 'SUPER_ADMIN') return '/dashboard/admin';
    if (role === 'ORG_ADMIN') {
      return organization?.approval_status === 'APPROVED'
        ? '/dashboard/organization'
        : '/pending-approval';
    }
    return '/dashboard/individual';
  };

  // Nav items shown only for non-INDIVIDUAL roles (org admin, super admin, public)
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

  // Is the logged-in user an Individual citizen?
  const isIndividual = role === 'INDIVIDUAL';

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

          {/* Center Nav Items — hidden for Individual citizens */}
          {!isIndividual && (
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
          )}

          {/* User Auth Section */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/messages" className="relative rounded-xl p-2 text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800" aria-label={`Messages${unreadCount ? `, ${unreadCount} unread` : ''}`}>
                  <MessageCircle className="h-5 w-5" />
                  {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </Link>

                <div className="relative" ref={dropdownRef}>
                  <AvatarCircle
                    fullName={user?.full_name}
                    avatarUrl={user?.avatar_url}
                    size="md"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                  />
                  {dropdownOpen && (
                    <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="border-b border-slate-100 bg-emerald-50/60 px-4 py-3">
                        <p className="truncate text-sm font-bold text-slate-900">{user?.full_name || 'Terra member'}</p>
                        <p className="truncate text-xs text-slate-500">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <User className="h-4 w-4" /><span>My Profile</span>
                      </Link>
                      <Link
                        to={getDashboardLink()}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <LayoutDashboard className="h-4 w-4" /><span>Dashboard</span>
                      </Link>
                      <div className="border-t border-slate-100" />
                      <button
                        onClick={() => { setDropdownOpen(false); logout(); }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" /><span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
                {!isIndividual && (
                  <>
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

                  </>
                )}
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

        {/* Mobile Navigation Bar — hidden for Individual citizens */}
        {!isIndividual && (
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
        )}
      </div>
    </header>
  );
}
