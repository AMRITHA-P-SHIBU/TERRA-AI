import BackButton from "../components/BackButton";
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(location.state?.error || null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await login(email, password, rememberMe, 'INDIVIDUAL');

      const user = res.user;
      if (user.account_type !== 'INDIVIDUAL') {
        throw new Error('Access Denied: This login page is exclusively for Individual Citizens.');
      }

      navigate('/dashboard/individual', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafcf8] flex flex-col justify-between py-8 sm:py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Soft Ambient Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

      {/* Standard Website Top Header Bar */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-5 border-b border-emerald-100/60 mb-6">
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
            to="/signup" 
            className="text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-950 bg-white/80 border border-emerald-200/80 px-4 py-1.5 rounded-full shadow-2xs transition"
          >
            Create Account
          </Link>
        </div>
      </header>

      {/* Main Form Center */}
      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Citizen Portal</span>
          </div>
          <h2 className="text-3xl font-black text-[#133e24] tracking-tight">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to track habits, log eco actions, and earn EcoPoints
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-10 shadow-[0_12px_35px_-8px_rgba(20,83,45,0.12)] rounded-3xl border border-emerald-100">
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
            {/* Username / Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Username / Email
              </label>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your username/email"
                  autoComplete="off"
                  name="terra-login-email"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition"
                >
                  Forgot password? / Reset password
                </Link>
              </div>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  name="terra-login-password"
                  className="block w-full pl-11 pr-11 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 font-medium">Remember me for 30 days</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-600 text-white font-bold text-sm shadow-md shadow-emerald-800/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Sign In as Citizen</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Org Switch */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Are you an Organization Leader?{' '}
              <Link to="/login/organization" className="text-teal-800 hover:text-teal-950 font-bold underline">
                Sign in to Organization Portal
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 pt-6">
        <p>© 2026 Terra AI • Sustainable Living Intelligence</p>
      </footer>
    </div>
  );
}
