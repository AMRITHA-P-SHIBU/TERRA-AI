import BackButton from "../components/BackButton";
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export default function AdminLogin() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Admin email and password are required.');
      return;
    }

    try {
      setLoading(true);
      const res = await login(cleanEmail, password, rememberMe, 'SUPER_ADMIN');

      if (res.user.account_type !== 'SUPER_ADMIN') {
        // Enforce admin portal restriction: Log out non-admin immediately
        await logout();
        setError('Unauthorized: This portal is strictly restricted to Terra AI Platform Super Administrators.');
        return;
      }

      navigate('/dashboard/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafcf8] flex flex-col justify-between py-8 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Soft Ambient Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Standard Website Top Header Bar */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-5 border-b border-teal-100/60 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BackButton fallback="/" label="Back" />
          <Link to="/" className="inline-flex items-center group cursor-pointer" title="TERRA AI Home">
            <img 
              src="/terra-ai-logo.svg" 
              alt="TERRA AI Logo" 
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
            />
          </Link>
          <Link 
            to="/login" 
            className="text-xs sm:text-sm font-bold text-teal-800 hover:text-teal-950 bg-white/80 border border-teal-200/80 px-4 py-1.5 rounded-full shadow-2xs transition"
          >
            Citizen Sign In
          </Link>
        </div>
      </header>

      {/* Main Form Center */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-3 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Super Admin Console</span>
          </div>
          <h2 className="text-3xl font-black text-[#133e24] tracking-tight">
            Super Admin Sign In
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Platform governance, organization verifications & system oversight
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-[0_12px_35px_-8px_rgba(13,148,136,0.12)] rounded-3xl border border-teal-100">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Hidden dummy fields — trick browsers into targeting these instead of the real inputs */}
          <input type="text" name="username" style={{ display: 'none' }} autoComplete="username" readOnly />
          <input type="password" name="password" style={{ display: 'none' }} autoComplete="current-password" readOnly />

          <form className="space-y-5" onSubmit={handleSubmit} autoComplete="off">
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Super Admin Email
              </label>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@terra.eco"
                  autoComplete="off"
                  name="terra-admin-email"
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-teal-800 hover:text-teal-950 transition"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
                  name="terra-admin-password"
                  className="block w-full pl-10 pr-10 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                />
                <span className="text-xs text-slate-600 font-medium">Remember me for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-600 text-white font-bold text-sm shadow-md shadow-teal-800/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Sign In as Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Seed Info Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Super Admin accounts can be initialized or reset via:
              <br />
              <code className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-teal-800 font-mono text-[11px] mt-1.5 inline-block">
                npm run seed:admin
              </code>
            </p>
          </div>
        </div>

        {/* Portal Cross Links */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-500">
          <Link
            to="/login"
            className="hover:text-emerald-700 font-medium transition"
          >
            Citizen Sign In
          </Link>
          <span>•</span>
          <Link
            to="/login/organization"
            className="hover:text-teal-700 font-medium transition"
          >
            Organization Portal
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 pt-6">
        <p>© 2026 Terra AI • Sustainable Living Intelligence</p>
      </footer>
    </div>
  );
}
