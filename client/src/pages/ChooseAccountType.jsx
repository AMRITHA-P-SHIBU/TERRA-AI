import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Building2, ArrowRight, ShieldCheck, Leaf, Sparkles, CheckCircle2, Globe2, Compass } from 'lucide-react';

export default function ChooseAccountType() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fafcf8] text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Decorative Natural Ambient Background Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-[28rem] h-[28rem] bg-[#edf6dd]/80 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar Bar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2.5 group cursor-pointer">
          <img 
            src="/terra-ai-logo.svg" 
            alt="TERRA AI Logo" 
            className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
          />
        </Link>
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-800 hover:text-emerald-900 bg-white/80 hover:bg-white border border-emerald-200/80 px-4 py-2 rounded-full shadow-xs backdrop-blur-xs transition-all"
        >
          <span>Return Home</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Brand Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Join 14,800+ Eco-Citizens Worldwide</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#133e24] tracking-tight leading-tight">
            How would you like to join <span className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 bg-clip-text text-transparent">TERRA AI</span>?
          </h1>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
            Choose your account type to access personalized tools, measure your environmental footprint, and make a collective global impact.
          </p>
        </div>

        {/* Account Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* 1. Individual Citizen Card */}
          <div 
            onClick={() => navigate('/signup/individual')}
            className="group relative bg-white/90 hover:bg-white rounded-3xl p-7 sm:p-9 border border-emerald-100 hover:border-emerald-400/80 shadow-[0_10px_30px_-8px_rgba(20,83,45,0.08)] hover:shadow-[0_20px_40px_-10px_rgba(20,83,45,0.18)] transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/70 border border-emerald-200 flex items-center justify-center text-emerald-800 group-hover:scale-105 transition-transform shadow-xs">
                <User className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Instant Access
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl font-black text-[#133e24] group-hover:text-emerald-800 transition-colors">
                Individual Citizen
              </h2>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                For eco-conscious citizens, hobbyists, composters, and change-makers looking to log sustainability habits and earn rewards.
              </p>

              {/* Feature Checklist */}
              <ul className="mt-6 space-y-3 text-xs sm:text-[13px] text-slate-700 font-medium">
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Instant registration with zero waiting time</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>GreenFeed Community & photo verifications</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Eco Exchange circular barter marketplace</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>AI Sustainability Assistant with Gemini</span>
                </li>
              </ul>
            </div>

            {/* CTA Button at bottom */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-800/20 group-hover:shadow-lg group-hover:shadow-emerald-800/30 transition-all">
                <span>Continue as Citizen</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* 2. Organization Card */}
          <div 
            onClick={() => navigate('/signup/organization')}
            className="group relative bg-white/90 hover:bg-white rounded-3xl p-7 sm:p-9 border border-teal-100 hover:border-teal-400/80 shadow-[0_10px_30px_-8px_rgba(13,148,136,0.08)] hover:shadow-[0_20px_40px_-10px_rgba(13,148,136,0.18)] transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            {/* Top Badge */}
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-100/70 border border-teal-200 flex items-center justify-center text-teal-800 group-hover:scale-105 transition-transform shadow-xs">
                <Building2 className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#d8f0fa] text-[#16425b] border border-cyan-200">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" /> Admin Verified
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-2xl font-black text-[#133e24] group-hover:text-teal-800 transition-colors">
                Organization / NGO
              </h2>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                For environmental NGOs, universities, enterprises, and community green teams to aggregate emissions and lead initiatives.
              </p>

              {/* Feature Checklist */}
              <ul className="mt-6 space-y-3 text-xs sm:text-[13px] text-slate-700 font-medium">
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Verified Organization profile badge</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Invite & manage unlimited team colleagues</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Aggregated group carbon footprint reporting</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Reviewed & certified by Terra AI Super Admins</span>
                </li>
              </ul>
            </div>

            {/* CTA Button at bottom */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="w-full py-3.5 px-5 rounded-full bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-800/20 group-hover:shadow-lg group-hover:shadow-teal-800/30 transition-all">
                <span>Register Organization</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8 text-center text-xs text-slate-500">
        <p className="text-slate-600 text-sm font-medium">
          Already registered on Terra AI?{' '}
          <Link to="/login" className="text-emerald-800 hover:text-emerald-900 font-bold underline underline-offset-4">
            Sign In to your account
          </Link>
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-slate-400">
          <Link to="/admin/login" className="hover:text-slate-700 transition">Admin Portal</Link>
          <span>•</span>
          <Link to="/" className="hover:text-slate-700 transition">About Terra AI</Link>
          <span>•</span>
          <span>© 2026 Terra AI Platform</span>
        </div>
      </footer>
    </div>
  );
}
