import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Building2, ArrowRight, ShieldCheck, Leaf, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ChooseAccountType() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="max-w-4xl mx-auto w-full text-center mb-10">
        <Link to="/" className="inline-flex items-center gap-3 group mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition shadow-lg shadow-emerald-500/10">
            <Leaf className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">TERRA <span className="text-emerald-400">AI</span></span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2">
          Join the Global Sustainability Network
        </h1>
        <p className="mt-3 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
          Choose the account type that best describes your role. Together, we measure, act, and regenerate our living planet.
        </p>
      </div>

      {/* Account Type Selection Grid */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Individual Account Card */}
        <div 
          onClick={() => navigate('/signup/individual')}
          className="group relative cursor-pointer bg-slate-900/80 hover:bg-slate-850 rounded-3xl p-8 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between"
        >
          <div className="absolute top-6 right-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" /> Instant Access
            </span>
          </div>

          <div>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors duration-300">
              <User className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
              Individual Citizen
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              For eco-conscious citizens, hobbyists, composters, and change-makers looking to log sustainability habits, calculate carbon footprint, and earn EcoPoints.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant signup without review delay</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>GreenFeed community & photo verifications</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Eco Exchange marketplace & barter</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>AI Sustainability Assistant with Gemini</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-emerald-400 font-semibold text-sm group-hover:translate-x-1 transition-transform">
            <span>Create Individual Account</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>

        {/* Organization Account Card */}
        <div 
          onClick={() => navigate('/signup/organization')}
          className="group relative cursor-pointer bg-slate-900/80 hover:bg-slate-850 rounded-3xl p-8 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-cyan-500/10 flex flex-col justify-between"
        >
          <div className="absolute top-6 right-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Admin Verified
            </span>
          </div>

          <div>
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors duration-300">
              <Building2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
              Organization / NGO / Business
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              For environmental NGOs, green startups, universities, corporate sustainability teams, and local housing societies.
            </p>

            <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Verified Organization Profile & Badge</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Organization Member Management & Invitations</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Aggregated group carbon footprint tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Reviewed by Terra AI Super Admins</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-cyan-400 font-semibold text-sm group-hover:translate-x-1 transition-transform">
            <span>Register Organization</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="max-w-md mx-auto text-center mt-10">
        <p className="text-slate-400 text-sm">
          Already registered on Terra AI?{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4">
            Sign In here
          </Link>
        </p>
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
          <Link to="/admin/login" className="hover:text-slate-200 transition">Main Admin Portal</Link>
          <span>•</span>
          <Link to="/" className="hover:text-slate-200 transition">Back to Landing Home</Link>
        </div>
      </div>
    </div>
  );
}
