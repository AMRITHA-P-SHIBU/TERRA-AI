import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Leaf,
  Sparkles,
  ShoppingBag,
  Calculator,
  Bot,
  Award,
  ShieldCheck,
  TrendingUp,
  ArrowUpRight,
  UserCheck,
  CheckCircle2,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
} from 'lucide-react';

export default function IndividualDashboard({ onSelectTab }) {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  // Password Change Modal State (auto-opens if must_change_password is true)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [changeError, setChangeError] = useState(null);
  const [changeSuccess, setChangeSuccess] = useState(null);

  useEffect(() => {
    if (user?.must_change_password) {
      setPasswordModalOpen(true);
    }
  }, [user]);

  const handleLaunchModule = (tab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      navigate(`/${tab}`);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);

    if (!newPassword || newPassword.length < 8) {
      setChangeError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match.');
      return;
    }

    try {
      setChangeLoading(true);
      await changePassword(newPassword);
      setChangeSuccess('Password updated successfully! Your account is now fully secured.');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setChangeSuccess(null);
        setPasswordModalOpen(false);
      }, 1800);
    } catch (err) {
      setChangeError(err.message || 'Failed to update password');
    } finally {
      setChangeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
                <p className="text-2xl sm:text-3xl font-black text-emerald-700">140 pts</p>
                <span className="text-[11px] text-emerald-600 font-medium">Level 2 Planet Guardian</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carbon Offset</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-3">28.4 <span className="text-sm font-semibold text-slate-500">kg CO₂e</span></p>
            <p className="text-xs text-emerald-700 mt-1 font-medium">↓ 14% vs monthly target</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GreenFeed Posts</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Leaf className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-3">6 <span className="text-sm font-semibold text-slate-500">Actions</span></p>
            <p className="text-xs text-teal-600 mt-1 font-medium">Compost + Tree Planting</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Eco Exchange</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 mt-3">2 <span className="text-sm font-semibold text-slate-500">Listings</span></p>
            <p className="text-xs text-teal-600 mt-1 font-medium">1 Terracotta Pot bartered</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Community Badges</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-white mt-3">3 <span className="text-sm font-semibold text-slate-400">Badges</span></p>
            <p className="text-xs text-amber-400 mt-1 font-medium">Clean Champion Unlocked</p>
          </div>
        </div>

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

        {/* User Credentials & Security Info */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Authenticated Session Active</p>
              <p className="text-slate-500">Logged in as {user?.email} • Account Type: INDIVIDUAL</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">
              Status: ACTIVE
            </span>
            <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-full">
              Role: Citizen
            </span>
          </div>
        </div>

        {/* Password Change / First Login Prompt Modal */}
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative animate-scaleUp">
              {!user?.must_change_password && (
                <button
                  onClick={() => setPasswordModalOpen(false)}
                  className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {user?.must_change_password ? 'Set Your New Password' : 'Change Password'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {user?.must_change_password
                      ? 'Please update your temporary password to continue.'
                      : 'Choose a new secure password for your account.'}
                  </p>
                </div>
              </div>

              {changeSuccess && (
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              {changeError && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{changeError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    New Password (min 8 chars)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-4 pr-11 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full px-4 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  {!user?.must_change_password && (
                    <button
                      type="button"
                      onClick={() => setPasswordModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={changeLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition"
                  >
                    {changeLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Save New Password</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
