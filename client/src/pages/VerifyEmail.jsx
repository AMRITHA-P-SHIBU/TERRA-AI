import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, Leaf, ArrowRight } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setMessage('Missing verification token in request.');
      return;
    }

    async function verify() {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();
        if (res.ok) {
          setSuccess(true);
          setMessage(data.message || 'Email verified successfully!');
        } else {
          setSuccess(false);
          setMessage(data.error || 'Verification link is invalid or expired.');
        }
      } catch (err) {
        setSuccess(false);
        setMessage('Network error verifying email.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <Link to="/" className="inline-flex items-center gap-2.5 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition shadow-lg shadow-emerald-500/10">
            <Leaf className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">TERRA <span className="text-emerald-400">AI</span></span>
        </Link>
        <h1 className="text-2xl font-extrabold text-white">Email Verification</h1>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800 text-center">
          {loading ? (
            <div className="py-8 space-y-4">
              <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-300">Verifying your email token...</p>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-white">Verification Confirmed!</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs shadow-lg transition"
                >
                  <span>Continue to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-white">Verification Failed</h2>
              <p className="text-xs text-rose-300 leading-relaxed">{message}</p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-block px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
