import React from 'react';
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
} from 'lucide-react';

export default function IndividualDashboard({ onSelectTab }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLaunchModule = (tab) => {
    if (onSelectTab) {
      onSelectTab(tab);
    } else {
      navigate(`/${tab}`);
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

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Account Status</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-3">ACTIVE</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">Self-registered Citizen</p>
          </div>
        </div>

        {/* Terra AI Module Launchpad */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-[#133e24] tracking-tight">
                Terra AI Platform Modules
              </h2>
            </div>
            <span className="text-xs text-slate-500">Explore integrated features</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Module 1: GreenFeed */}
            <div
              onClick={() => handleLaunchModule('feed')}
              className="group cursor-pointer bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-200 rounded-2xl p-6 transition-all shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Leaf className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition text-base">
                    GreenFeed Community
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Share proof of tree planting, zero-waste meal prep, and beach cleanups. Earn verified EcoPoints for each approved activity.
                </p>
              </div>
            </div>

            {/* Module 2: Eco Exchange Hub */}
            <div
              onClick={() => handleLaunchModule('exchange')}
              className="group cursor-pointer bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-200 rounded-2xl p-6 transition-all shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 group-hover:text-teal-700 transition text-base">
                    Eco Exchange Hub
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Circular barter marketplace for pre-loved terracotta pots, coconut planters, compost kits, and organic seeds.
                </p>
              </div>
            </div>

            {/* Module 3: Carbon Calculator */}
            <div
              onClick={() => handleLaunchModule('calculator')}
              className="group cursor-pointer bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-200 rounded-2xl p-6 transition-all shadow-sm flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                <Calculator className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 group-hover:text-teal-700 transition text-base">
                    Carbon Footprint Tracker
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition" />
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
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

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-medium">
              Status: ACTIVE
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
              Role: Citizen
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
