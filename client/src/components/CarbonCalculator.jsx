import BackButton from "./BackButton";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Flame, 
  Car, 
  Zap, 
  Utensils, 
  Trash2, 
  TrendingDown, 
  TrendingUp,
  Award, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Info,
  History,
  FileText,
  BookOpen,
  Printer,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Check,
  ShieldCheck,
  Leaf
} from 'lucide-react';
import {
  getEmissionFactors,
  calculateCarbonPreview,
  logCarbonCalculation,
  getCarbonHistory,
  getCarbonReport,
  claimSustainableAction
} from '../services/carbonService';

export default function CarbonCalculator({ currentUser }) {
  // Navigation tabs within Carbon Module
  const [activeTab, setActiveTab] = useState('calculator'); // 'calculator', 'report', 'history', 'factors'
  const [activeCategory, setActiveCategory] = useState('transport'); // 'transport', 'electricity', 'cooking', 'waste'

  // Loading & notification states
  const [calculating, setCalculating] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [claimingActionId, setClaimingActionId] = useState(null);
  const [statusNotice, setStatusNotice] = useState(null); // { type: 'success'|'error'|'info', text: string }

  // ── 1. FORM INPUT STATES ──────────────────────────────────────────────
  // Transportation
  const [transportMode, setTransportMode] = useState('petrol_hatchback');
  const [dailyKm, setDailyKm] = useState(20);
  const [commuteDays, setCommuteDays] = useState(26);
  const [monthlyKmManual, setMonthlyKmManual] = useState('');
  const [flightKm, setFlightKm] = useState(0);

  // Electricity
  const [monthlyKwh, setMonthlyKwh] = useState(140);
  const [solarGeneratedKwh, setSolarGeneratedKwh] = useState(0);

  // Cooking Fuel
  const [cookingFuelType, setCookingFuelType] = useState('lpg_cylinder');
  const [lpgCylinders, setLpgCylinders] = useState(1);
  const [lpgKg, setLpgKg] = useState(14.2);
  const [pngScm, setPngScm] = useState(20);
  const [firewoodKg, setFirewoodKg] = useState(0);

  // Waste Management
  const [organicKg, setOrganicKg] = useState(15);
  const [compostsOrganic, setCompostsOrganic] = useState(true);
  const [plasticKg, setPlasticKg] = useState(4);
  const [recyclesPlastic, setRecyclesPlastic] = useState(true);
  const [paperKg, setPaperKg] = useState(3);
  const [recyclesPaper, setRecyclesPaper] = useState(true);
  const [generalWasteKg, setGeneralWasteKg] = useState(5);

  // Notes
  const [calculationNotes, setCalculationNotes] = useState('');

  // ── 2. DATA STATES FROM BACKEND ───────────────────────────────────────
  const [emissionFactorsList, setEmissionFactorsList] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyStats, setHistoryStats] = useState({ count: 0, average: 0, lowest: 0, highest: 0 });
  const [currentReport, setCurrentReport] = useState(null);
  const [activeReportId, setActiveReportId] = useState(null);

  // Calculated Preview Result
  const [previewResult, setPreviewResult] = useState({
    total_co2e_kg: 215,
    annualized_co2e_tonnes: 2.58,
    category_emissions: { transportation: 73.8, electricity: 100.2, cooking_fuel: 42.4, waste: -1.4 },
    category_percentages: { transportation: 34, electricity: 47, cooking_fuel: 20, waste: 0 },
    highest_emission_category: 'electricity',
    activity_details: {},
    benchmarks: { indiaNationalAvg: 170, globalAvg: 380, parisTarget: 120 },
    comparison_with_benchmarks: { status: 'Room for Reduction' }
  });

  // Assemble full payload for calculation
  const currentPayload = useMemo(() => {
    const monthlyTransportKm = monthlyKmManual !== '' ? Number(monthlyKmManual) : dailyKm * commuteDays;
    return {
      transportation: {
        mode: transportMode,
        daily_km: dailyKm,
        commute_days_per_month: commuteDays,
        monthly_km: monthlyTransportKm,
        flight_km: flightKm,
      },
      electricity: {
        monthly_kwh: monthlyKwh,
        solar_generated_kwh: solarGeneratedKwh,
      },
      cooking_fuel: {
        fuel_type: cookingFuelType,
        cylinders_per_month: lpgCylinders,
        lpg_kg: lpgKg,
        scm_per_month: pngScm,
        firewood_kg: firewoodKg,
      },
      waste: {
        organic_kg: organicKg,
        composts_organic: compostsOrganic,
        plastic_kg: plasticKg,
        recycles_plastic: recyclesPlastic,
        paper_kg: paperKg,
        recycles_paper: recyclesPaper,
        general_waste_kg: generalWasteKg,
      },
      notes: calculationNotes,
    };
  }, [
    transportMode, dailyKm, commuteDays, monthlyKmManual, flightKm,
    monthlyKwh, solarGeneratedKwh,
    cookingFuelType, lpgCylinders, lpgKg, pngScm, firewoodKg,
    organicKg, compostsOrganic, plasticKg, recyclesPlastic, paperKg, recyclesPaper, generalWasteKg,
    calculationNotes
  ]);

  // Load initial data from backend: Emission Factors, History, Latest Report
  const loadInitialData = useCallback(async () => {
    try {
      const [factorsData, historyData] = await Promise.all([
        getEmissionFactors().catch(() => ({ emission_factors: [] })),
        getCarbonHistory().catch(() => ({ history: [], average_footprint_kg: 0 })),
      ]);

      if (factorsData && factorsData.emission_factors) {
        setEmissionFactorsList(factorsData.emission_factors);
      }

      if (historyData && historyData.history) {
        setHistoryLogs(historyData.history);
        setHistoryStats({
          count: historyData.count || historyData.history.length,
          average: historyData.average_footprint_kg || 0,
          lowest: historyData.lowest_footprint_kg || 0,
          highest: historyData.highest_footprint_kg || 0,
        });

        // If history exists, fetch latest report
        if (historyData.history.length > 0) {
          getCarbonReport('latest')
            .then(res => {
              if (res?.report) setCurrentReport(res.report);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[CarbonCalculator init warning]:', err.message);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Run backend calculation preview whenever inputs change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateCarbonPreview(currentPayload)
        .then(res => {
          if (res?.calculation) {
            setPreviewResult(res.calculation);
          }
        })
        .catch(err => {
          console.warn('[Calculation preview notice]:', err.message);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [currentPayload]);

  // ── 3. SAVE / LOG CALCULATION (OFFICIAL SUBMISSION) ────────────────────
  const handleSaveCalculation = async () => {
    setSavingLog(true);
    setStatusNotice(null);

    try {
      const res = await logCarbonCalculation(currentPayload);
      if (res?.report) {
        setCurrentReport(res.report);
        setActiveReportId(res.report.calculation_id);
        setStatusNotice({
          type: 'success',
          text: 'Monthly footprint saved! Detailed audit report & AI recommendations generated.',
        });

        // Refresh history
        const refreshedHistory = await getCarbonHistory().catch(() => null);
        if (refreshedHistory?.history) {
          setHistoryLogs(refreshedHistory.history);
          setHistoryStats({
            count: refreshedHistory.count || refreshedHistory.history.length,
            average: refreshedHistory.average_footprint_kg || 0,
            lowest: refreshedHistory.lowest_footprint_kg || 0,
            highest: refreshedHistory.highest_footprint_kg || 0,
          });
        }

        // Switch to Report view to show comprehensive report
        setActiveTab('report');
      }
    } catch (err) {
      setStatusNotice({
        type: 'error',
        text: err.message || 'Failed to save calculation. Please check your inputs.',
      });
    } finally {
      setSavingLog(false);
    }
  };

  // ── 4. CLAIM SUSTAINABLE ACTION CHALLENGE (ECOPOINTS) ──────────────────
  const handleClaimAction = async (actionId, logId) => {
    if (!logId) {
      setStatusNotice({ type: 'error', text: 'Please save your calculation first before claiming action rewards.' });
      return;
    }

    setClaimingActionId(actionId);
    try {
      const res = await claimSustainableAction(logId, actionId);
      setStatusNotice({
        type: 'success',
        text: res.message || `+${res.points_awarded} EcoPoints added to your profile!`,
      });

      // Update current report's claimed actions locally
      if (currentReport) {
        const updatedClaimed = [...(currentReport.claimed_actions || []), actionId];
        setCurrentReport({ ...currentReport, claimed_actions: updatedClaimed });
      }
    } catch (err) {
      setStatusNotice({
        type: 'error',
        text: err.message || 'Unable to claim EcoPoints for this challenge.',
      });
    } finally {
      setClaimingActionId(null);
    }
  };

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <BackButton fallback="/dashboard/individual" label="Back to Dashboard" />
        
        {/* Module Nav Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'calculator' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Calculator</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'report' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Detailed Report</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'history' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-cyan-600" />
            <span>History & Tracking ({historyLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('factors')}
            className={`px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'factors' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            <span>Emission Factors (CEA)</span>
          </button>
        </div>
      </div>

      {/* Main Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-400/20 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>GHG Protocol & CEA India (v19) Baseline Standards</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Activity-Based Personal Carbon Footprint Tracker
          </h1>
          <p className="mt-2 text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
            Measure and audit your greenhouse gas impact across Transportation, Residential Electricity, Cooking Fuel, and Solid Waste. Backed by Central Electricity Authority metrics and AI decarbonization recommendations.
          </p>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between transition-all ${
            statusNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : statusNotice.type === 'error'
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-cyan-50 border-cyan-300 text-cyan-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusNotice.text}</span>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: INTERACTIVE CALCULATOR                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Side: Activity Input Categories (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Category Navigation Pills */}
            <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
              {[
                { id: 'transport', label: '1. Transport', icon: Car },
                { id: 'electricity', label: '2. Electricity', icon: Zap },
                { id: 'cooking', label: '3. Cooking Fuel', icon: Utensils },
                { id: 'waste', label: '4. Waste', icon: Trash2 },
              ].map((c) => {
                const IconComponent = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(c.id)}
                    className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition text-center cursor-pointer ${
                      activeCategory === c.id
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{c.label}</span>
                    <span className="sm:hidden">{c.label.split(' ')[1]}</span>
                  </button>
                );
              })}
            </div>

            {/* ── CATEGORY 1: TRANSPORTATION ──────────────────────────────── */}
            {activeCategory === 'transport' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Car className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Transportation & Mobility</h3>
                    <p className="text-xs text-slate-500">
                      Indian driving cycle emission factors (ARAI & India GHG Protocol)
                    </p>
                  </div>
                </div>

                {/* Primary Mode Grid */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Primary Commute Mode & Fuel Type
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'petrol_hatchback', label: 'Petrol Car (Small)', factor: '0.142 kg/km', icon: '🚗' },
                      { id: 'petrol_suv', label: 'Petrol Sedan / SUV', factor: '0.185 kg/km', icon: '🚙' },
                      { id: 'diesel_car', label: 'Diesel Car / SUV', factor: '0.168 kg/km', icon: '🚘' },
                      { id: 'cng_car', label: 'CNG Passenger Car', factor: '0.108 kg/km', icon: '⛽' },
                      { id: 'electric_car', label: 'Electric Car (EV)', factor: '0.065 kg/km', icon: '⚡' },
                      { id: 'petrol_two_wheeler', label: 'Petrol Scooter / Bike', factor: '0.038 kg/km', icon: '🛵' },
                      { id: 'electric_two_wheeler', label: 'Electric E-Scooter', factor: '0.018 kg/km', icon: '🔋' },
                      { id: 'city_bus', label: 'City Bus (Transit)', factor: '0.054 kg/p-km', icon: '🚌' },
                      { id: 'metro_train', label: 'Metro / Local Train', factor: '0.028 kg/p-km', icon: '🚆' },
                      { id: 'auto_rickshaw', label: 'Auto Rickshaw (CNG)', factor: '0.062 kg/p-km', icon: '🛺' },
                      { id: 'bicycle_walk', label: 'Bicycle / Walk', factor: '0.000 kg/km', icon: '🚲' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTransportMode(m.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          transportMode === m.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{m.icon}</span>
                          <span className="text-[10px] text-emerald-700 font-mono">{m.factor}</span>
                        </div>
                        <p className="font-semibold text-xs mt-1">{m.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commute Distance Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Daily Commute Distance</span>
                      <span className="text-emerald-700 font-bold">{dailyKm} km / day</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="120"
                      step="2"
                      value={dailyKm}
                      onChange={(e) => {
                        setDailyKm(Number(e.target.value));
                        setMonthlyKmManual('');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>0 km (WFH)</span>
                      <span>50 km</span>
                      <span>120 km</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Commute Days Per Month</span>
                      <span className="text-emerald-700 font-bold">{commuteDays} days</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="31"
                      step="1"
                      value={commuteDays}
                      onChange={(e) => {
                        setCommuteDays(Number(e.target.value));
                        setMonthlyKmManual('');
                      }}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>0 days</span>
                      <span>20 days</span>
                      <span>31 days</span>
                    </div>
                  </div>
                </div>

                {/* Direct Monthly Travel Override */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Monthly Distance (Optional Direct Override)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        placeholder={`${dailyKm * commuteDays} km`}
                        value={monthlyKmManual}
                        onChange={(e) => setMonthlyKmManual(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">km/mo</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Domestic Air Travel (Flights this month)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="15000"
                        placeholder="0 km (e.g. 1200 km for BLR-DEL)"
                        value={flightKm || ''}
                        onChange={(e) => setFlightKm(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400">km</span>
                    </div>
                  </div>
                </div>

                {/* Calculated Transportation Subtotal Pill */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-950">Transport Emissions Subtotal:</span>
                  <span className="text-sm font-black text-emerald-800">
                    {previewResult.category_emissions.transportation} kg CO₂e / month
                  </span>
                </div>
              </div>
            )}

            {/* ── CATEGORY 2: RESIDENTIAL ELECTRICITY ────────────────────── */}
            {activeCategory === 'electricity' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Residential Electricity Consumption</h3>
                    <p className="text-xs text-slate-500">
                      Central Electricity Authority (CEA) Baseline v19: <strong>0.716 kg CO₂e / kWh</strong>
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Monthly Grid Electricity Consumption</span>
                    <span className="text-amber-700 font-bold">{monthlyKwh} kWh (Units) / month</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="800"
                    step="10"
                    value={monthlyKwh}
                    onChange={(e) => setMonthlyKwh(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 kWh</span>
                    <span>150 kWh (Avg 2BHK)</span>
                    <span>400 kWh (Heavy AC)</span>
                    <span>800 kWh</span>
                  </div>
                </div>

                {/* Rooftop Solar Offset */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Rooftop Solar PV Generation (Clean Energy Offset)</span>
                    <span className="text-emerald-700 font-bold">{solarGeneratedKwh} kWh / month</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="10"
                    value={solarGeneratedKwh}
                    onChange={(e) => setSolarGeneratedKwh(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>0 kWh (No Solar)</span>
                    <span>150 kWh (1.5 kW Rooftop)</span>
                    <span>500 kWh</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-amber-950">Net Grid Draw: </span>
                    <span className="font-bold text-slate-800">{Math.max(0, monthlyKwh - solarGeneratedKwh)} kWh</span>
                  </div>
                  <span className="text-sm font-black text-amber-800">
                    {previewResult.category_emissions.electricity} kg CO₂e / month
                  </span>
                </div>
              </div>
            )}

            {/* ── CATEGORY 3: COOKING FUEL ────────────────────────────────── */}
            {activeCategory === 'cooking' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Cooking Fuel Emissions</h3>
                    <p className="text-xs text-slate-500">
                      MoPNG & IPCC Factors: LPG (42.37 kg CO₂e / 14.2kg cylinder), PNG (2.02 kg CO₂e / SCM)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Cooking Fuel Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'lpg_cylinder', label: 'LPG Cylinder (14.2kg)', factor: '42.37 kg/cyl', icon: '🛢️' },
                      { id: 'png', label: 'PNG (Piped Gas)', factor: '2.02 kg/SCM', icon: '🔥' },
                      { id: 'biogas', label: 'Home Biogas', factor: '0.05 kg/SCM', icon: '♻️' },
                      { id: 'firewood', label: 'Biomass / Firewood', factor: '1.75 kg/kg', icon: '🪵' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCookingFuelType(f.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          cookingFuelType === f.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg">{f.icon}</span>
                        <p className="font-semibold text-xs mt-1">{f.label}</p>
                        <p className="text-[10px] text-emerald-700 mt-0.5">{f.factor}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {cookingFuelType === 'lpg_cylinder' && (
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Cylinders Consumed Per Month</span>
                      <span className="text-emerald-700 font-bold">{lpgCylinders} cylinder(s) (~{lpgCylinders * 14.2} kg)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      step="0.5"
                      value={lpgCylinders}
                      onChange={(e) => setLpgCylinders(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>0 (Induction only)</span>
                      <span>1 cylinder (Avg family of 4)</span>
                      <span>4 cylinders</span>
                    </div>
                  </div>
                )}

                {cookingFuelType === 'png' && (
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Monthly Piped Gas Units</span>
                      <span className="text-emerald-700 font-bold">{pngScm} SCM / month</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="2"
                      value={pngScm}
                      onChange={(e) => setPngScm(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>0 SCM</span>
                      <span>20 SCM (Moderate)</span>
                      <span>60 SCM</span>
                    </div>
                  </div>
                )}

                {cookingFuelType === 'firewood' && (
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Firewood / Dry Biomass Quantity</span>
                      <span className="text-emerald-700 font-bold">{firewoodKg} kg / month</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="150"
                      step="5"
                      value={firewoodKg}
                      onChange={(e) => setFirewoodKg(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-teal-950">Cooking Emissions Subtotal:</span>
                  <span className="text-sm font-black text-teal-800">
                    {previewResult.category_emissions.cooking_fuel} kg CO₂e / month
                  </span>
                </div>
              </div>
            )}

            {/* ── CATEGORY 4: SOLID WASTE MANAGEMENT ──────────────────────── */}
            {activeCategory === 'waste' && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-cyan-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Waste Generation & Circular Diversion</h3>
                    <p className="text-xs text-slate-500">
                      Central Pollution Control Board (CPCB) India Municipal Waste Factors
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Organic Waste */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">Organic Kitchen Waste Generated:</span>
                      <span className="font-bold text-emerald-700">{organicKg} kg / month</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="2"
                      value={organicKg}
                      onChange={(e) => setOrganicKg(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <label className="flex items-center gap-2 pt-1 text-xs text-emerald-950 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={compostsOrganic}
                        onChange={(e) => setCompostsOrganic(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded"
                      />
                      <span>Active Home / Community Composting (cuts methane emissions by ~91%)</span>
                    </label>
                  </div>

                  {/* Plastic Waste */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">Plastic Waste Generated:</span>
                      <span className="font-bold text-cyan-700">{plasticKg} kg / month</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="1"
                      value={plasticKg}
                      onChange={(e) => setPlasticKg(Number(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer"
                    />
                    <label className="flex items-center gap-2 pt-1 text-xs text-cyan-950 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={recyclesPlastic}
                        onChange={(e) => setRecyclesPlastic(e.target.checked)}
                        className="w-4 h-4 accent-cyan-600 rounded"
                      />
                      <span>Segregated & Handed to Authorized Recycler (EPR compliant)</span>
                    </label>
                  </div>

                  {/* Paper Waste */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800">Paper & Cardboard:</span>
                      <span className="font-bold text-amber-700">{paperKg} kg / month</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="1"
                      value={paperKg}
                      onChange={(e) => setPaperKg(Number(e.target.value))}
                      className="w-full accent-amber-600 cursor-pointer"
                    />
                    <label className="flex items-center gap-2 pt-1 text-xs text-amber-950 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={recyclesPaper}
                        onChange={(e) => setRecyclesPaper(e.target.checked)}
                        className="w-4 h-4 accent-amber-600 rounded"
                      />
                      <span>Recycled via Kabadiwala / Scrap paper channel</span>
                    </label>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cyan-50/80 border border-cyan-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-950">Net Waste Emissions:</span>
                  <span className="text-sm font-black text-cyan-800">
                    {previewResult.category_emissions.waste} kg CO₂e / month
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Live Analytics, Benchmark & Action Box (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Calculation Metric Card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

              <div className="flex items-center justify-between mt-1 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Calculated Monthly Footprint
                </span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Monthly CO₂e
                </span>
              </div>

              {/* Big Footprint Counter */}
              <div className="my-3">
                <span className="text-5xl font-black text-slate-900 tracking-tight">
                  {previewResult.total_co2e_kg}
                </span>
                <span className="text-base font-bold text-slate-500 ml-1.5">kg CO₂e</span>
              </div>

              <p className="text-xs text-slate-400">
                Annualized Impact: <strong className="text-slate-800">{previewResult.annualized_co2e_tonnes} Metric Tonnes</strong> / year
              </p>

              {/* Benchmark Status Pill */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {previewResult.total_co2e_kg <= 170 ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Below Indian Average (~170 kg) 🎉</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    <span>Above Indian Average (Room for Reduction)</span>
                  </>
                )}
              </div>

              {/* Category Emission Breakdown Stack */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-left">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Category Breakdown
                  </h4>
                  <span className="text-[11px] text-amber-700 font-bold capitalize">
                    Highest: {previewResult.highest_emission_category.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: 'Transportation', val: previewResult.category_emissions.transportation, pct: previewResult.category_percentages.transportation, color: 'bg-emerald-600' },
                    { label: 'Electricity (CEA)', val: previewResult.category_emissions.electricity, pct: previewResult.category_percentages.electricity, color: 'bg-amber-500' },
                    { label: 'Cooking Fuel', val: previewResult.category_emissions.cooking_fuel, pct: previewResult.category_percentages.cooking_fuel, color: 'bg-teal-600' },
                    { label: 'Waste Management', val: previewResult.category_emissions.waste, pct: previewResult.category_percentages.waste, color: 'bg-cyan-600' },
                  ].map((b) => (
                    <div key={b.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                          <span className="font-semibold text-slate-700">{b.label}</span>
                        </div>
                        <span className="font-mono text-slate-800 font-bold">
                          {b.val} kg <span className="text-slate-400 text-[10px] font-normal">({b.pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`${b.color} h-full rounded-full transition-all duration-300`} style={{ width: `${Math.min(100, b.pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benchmark Reference Bars */}
              <div className="mt-6 pt-5 border-t border-slate-100 text-left text-xs space-y-2">
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Your Current Footprint</span>
                  <span className="font-bold text-slate-800">{previewResult.total_co2e_kg} kg</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-700 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (previewResult.total_co2e_kg / 380) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-0.5">
                  <span>Paris Target: 120 kg</span>
                  <span>India Avg: 170 kg</span>
                  <span>Global Avg: 380 kg</span>
                </div>
              </div>

              {/* Official Save & Log Button */}
              <button
                type="button"
                onClick={handleSaveCalculation}
                disabled={savingLog}
                className="mt-6 w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingLog ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing & Saving Record...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Save Calculation & Generate Audit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: DETAILED CALCULATION REPORT & RECOMMENDATIONS                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Top Actions: Print & Switch Back */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Carbon Audit Report</h2>
              <p className="text-xs text-slate-500">
                Official lifestyle greenhouse gas footprint record and personalized AI suggestions
              </p>
            </div>
            <button
              onClick={handlePrintReport}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          {!currentReport ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="font-bold text-slate-700">No calculation record saved yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Fill out the activity inputs in the Calculator tab and click "Save Calculation" to generate an official verified report.
              </p>
              <button
                onClick={() => setActiveTab('calculator')}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
              >
                Go to Calculator
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Calculation Period: {currentReport.calculation_period || 'Monthly'}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">
                      {currentReport.total_co2e_kg} kg CO₂e
                    </h3>
                    <p className="text-xs text-slate-500">
                      Logged on: {new Date(currentReport.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Highest Category Badge */}
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-right">
                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                      Highest Emission Source
                    </span>
                    <p className="text-base font-black text-amber-900 capitalize mt-0.5">
                      {currentReport.highest_emission_category?.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-amber-700 font-semibold">
                      {currentReport.category_emissions?.[currentReport.highest_emission_category]} kg CO₂e ({currentReport.category_percentages?.[currentReport.highest_emission_category]}%)
                    </p>
                  </div>
                </div>

                {/* Month-over-Month Comparative Progress */}
                {currentReport.monthly_comparison && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      {currentReport.monthly_comparison.trend === 'decreased' ? (
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <TrendingDown className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-slate-900">
                          Month-over-Month Tracking:
                        </span>
                        <p className="text-slate-500">
                          {currentReport.monthly_comparison.has_previous
                            ? `Previous Month: ${currentReport.monthly_comparison.previous_total_kg} kg CO₂e`
                            : currentReport.monthly_comparison.message}
                        </p>
                      </div>
                    </div>

                    {currentReport.monthly_comparison.has_previous && (
                      <div className="text-right">
                        <span
                          className={`text-sm font-black px-2.5 py-1 rounded-xl ${
                            currentReport.monthly_comparison.reduced
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {currentReport.monthly_comparison.change_pct > 0 ? '+' : ''}
                          {currentReport.monthly_comparison.change_pct}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Category Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 font-semibold">Activity Category</th>
                        <th className="py-2.5 font-semibold">Calculated Emissions</th>
                        <th className="py-2.5 font-semibold">Share (%)</th>
                        <th className="py-2.5 font-semibold">Primary Factor Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-3 font-semibold flex items-center gap-2 text-slate-900">
                          <Car className="w-4 h-4 text-emerald-600" />
                          <span>Transportation</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900">
                          {currentReport.category_emissions?.transportation || 0} kg CO₂e
                        </td>
                        <td className="py-3 font-semibold text-slate-500">
                          {currentReport.category_percentages?.transportation || 0}%
                        </td>
                        <td className="py-3 text-xs text-slate-400">
                          ARAI / India Driving Cycle standards
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold flex items-center gap-2 text-slate-900">
                          <Zap className="w-4 h-4 text-amber-600" />
                          <span>Residential Electricity</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900">
                          {currentReport.category_emissions?.electricity || 0} kg CO₂e
                        </td>
                        <td className="py-3 font-semibold text-slate-500">
                          {currentReport.category_percentages?.electricity || 0}%
                        </td>
                        <td className="py-3 text-xs text-slate-400">
                          CEA Baseline v19 (0.716 kg/kWh)
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold flex items-center gap-2 text-slate-900">
                          <Utensils className="w-4 h-4 text-teal-600" />
                          <span>Cooking Fuel</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900">
                          {currentReport.category_emissions?.cooking_fuel || 0} kg CO₂e
                        </td>
                        <td className="py-3 font-semibold text-slate-500">
                          {currentReport.category_percentages?.cooking_fuel || 0}%
                        </td>
                        <td className="py-3 text-xs text-slate-400">
                          MoPNG / IPCC 2006 Fuel factor
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold flex items-center gap-2 text-slate-900">
                          <Trash2 className="w-4 h-4 text-cyan-600" />
                          <span>Solid Waste Net Impact</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900">
                          {currentReport.category_emissions?.waste || 0} kg CO₂e
                        </td>
                        <td className="py-3 font-semibold text-slate-500">
                          {currentReport.category_percentages?.waste || 0}%
                        </td>
                        <td className="py-3 text-xs text-slate-400">
                          CPCB Municipal Solid Waste India
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── AI PERSONALIZED RECOMMENDATIONS SECTION ────────────────── */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-6 sm:p-8 rounded-3xl border border-emerald-200 space-y-4">
                <div className="flex items-center gap-2 text-emerald-900">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-bold">
                    AI Decarbonization Roadmap (Tailored to Your Numbers)
                  </h3>
                </div>
                <p className="text-xs text-slate-600">
                  Targeted mitigation steps generated based on your highest emission category (<strong>{currentReport.highest_emission_category}</strong>):
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {(currentReport.recommendations || []).map((tip, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800">
                          {tip.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                          Save ~{tip.estimated_monthly_saving_kg} kg/mo
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {tip.action}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold uppercase">
                        <span>Category: {tip.category}</span>
                        <span>•</span>
                        <span>Effort: {tip.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ECOPOINTS SUSTAINABLE ACTION CHALLENGES ─────────────────── */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-base font-bold text-slate-900">
                      Eligible EcoPoints Sustainable Action Rewards
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Verified achievements based on your activity data
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {(currentReport.eligible_challenges || []).map((action) => {
                    const isClaimed = (currentReport.claimed_actions || []).includes(action.id);
                    return (
                      <div
                        key={action.id}
                        className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
                          isClaimed
                            ? 'bg-slate-50 border-slate-200 opacity-80'
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{action.icon}</span>
                            <span className="font-bold text-xs text-slate-900">{action.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {action.description}
                          </p>
                          <span className="inline-block text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            +{action.points} EcoPoints Reward
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isClaimed || claimingActionId === action.id}
                          onClick={() => handleClaimAction(action.id, currentReport.calculation_id)}
                          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isClaimed
                              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          {claimingActionId === action.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isClaimed ? (
                            '✓ Claimed'
                          ) : (
                            'Claim Points'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: CALCULATION HISTORY & TRENDS                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Historical Footprint Records</h2>
            <p className="text-xs text-slate-500">
              Audit trail of all your completed carbon calculations over time
            </p>
          </div>

          {/* Aggregate Lifetime Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-slate-900">{historyStats.count}</span>
              <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Calculations Logged</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-emerald-700">{historyStats.average} kg</span>
              <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Historical Average</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-teal-700">{historyStats.lowest} kg</span>
              <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Lowest Footprint</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-2xl font-black text-amber-700">{historyStats.highest} kg</span>
              <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Peak Footprint</p>
            </div>
          </div>

          {/* Timeline of Previous Calculations */}
          {historyLogs.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 text-xs">
              No historical calculations found. Save your first calculation to begin tracking your climate journey!
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {historyLogs.map((item, idx) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center border border-emerald-200 shrink-0">
                      #{historyLogs.length - idx}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold capitalize">
                          Peak: {item.highest_category?.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Transport: {item.category_emissions?.transportation || 0} kg • Electricity: {item.category_emissions?.electricity || 0} kg • Cooking: {item.category_emissions?.cooking_fuel || 0} kg
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">{item.total_co2e_kg}</span>
                      <span className="text-xs font-semibold text-slate-400 ml-1">kg CO₂e</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        getCarbonReport(item.id).then(res => {
                          if (res?.report) {
                            setCurrentReport(res.report);
                            setActiveTab('report');
                          }
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-500 text-xs font-bold text-slate-700 hover:text-emerald-700 transition cursor-pointer"
                    >
                      View Report →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: EMISSION FACTOR REGISTRY (CEA & GHG PROTOCOL)                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'factors' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">India-Specific Emission Factors Registry</h2>
            <p className="text-xs text-slate-500">
              Transparent, verifiable factors used by the Terra AI calculation engine. Zero arbitrary values.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Activity Name</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Factor Value</th>
                    <th className="py-3 px-4 font-semibold">Unit</th>
                    <th className="py-3 px-4 font-semibold">Data Nature</th>
                    <th className="py-3 px-4 font-semibold">Official Source Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {emissionFactorsList.map((factor) => (
                    <tr key={factor.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {factor.activity_name}
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                        {factor.category}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {factor.value}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {factor.unit}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            factor.is_estimate
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {factor.is_estimate ? 'Estimated Model' : 'Actual Measured'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 leading-snug max-w-xs">
                        {factor.source} ({factor.applicable_year})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
