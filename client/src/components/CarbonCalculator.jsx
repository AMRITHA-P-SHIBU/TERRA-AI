import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Car, 
  Zap, 
  Utensils, 
  Trash2, 
  TrendingDown, 
  Award, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

export default function CarbonCalculator({ currentUser }) {
  // Input states
  const [dailyKm, setDailyKm] = useState(25);
  const [transportMode, setTransportMode] = useState('petrol_car');
  const [monthlyKwh, setMonthlyKwh] = useState(150);
  const [dietType, setDietType] = useState('vegetarian');
  const [compostsWaste, setCompostsWaste] = useState(true);
  const [recyclesDryWaste, setRecyclesDryWaste] = useState(true);
  const [savedLogs, setSavedLogs] = useState([
    { month: 'Jul', co2: 240 },
    { month: 'Aug', co2: 215 },
    { month: 'Sep', co2: 185 },
  ]);
  const [logSavedNotice, setLogSavedNotice] = useState(false);

  // Standard Emission Factors (GHG Protocol standard averages in kg CO2e)
  const transportFactors = {
    petrol_car: 0.192,
    diesel_car: 0.171,
    ev: 0.053,
    bus: 0.089,
    metro: 0.035,
    bike: 0.0
  };

  const dietMonthlyCo2 = {
    meat_heavy: 275,
    average: 205,
    vegetarian: 140,
    vegan: 115
  };

  // Calculations (Monthly basis = 30 days)
  const results = useMemo(() => {
    const monthlyTransportCo2 = dailyKm * 30 * transportFactors[transportMode];
    const monthlyElectricityCo2 = monthlyKwh * 0.82; // avg grid factor
    const monthlyDietCo2 = dietMonthlyCo2[dietType];
    
    // Waste impact
    let monthlyWasteCo2 = 45;
    if (compostsWaste) monthlyWasteCo2 -= 20;
    if (recyclesDryWaste) monthlyWasteCo2 -= 15;

    const totalCo2 = Math.round(monthlyTransportCo2 + monthlyElectricityCo2 + monthlyDietCo2 + monthlyWasteCo2);

    return {
      total: totalCo2,
      transport: Math.round(monthlyTransportCo2),
      electricity: Math.round(monthlyElectricityCo2),
      diet: Math.round(monthlyDietCo2),
      waste: Math.round(monthlyWasteCo2),
      transportPct: Math.round((monthlyTransportCo2 / totalCo2) * 100) || 0,
      electricityPct: Math.round((monthlyElectricityCo2 / totalCo2) * 100) || 0,
      dietPct: Math.round((monthlyDietCo2 / totalCo2) * 100) || 0,
      wastePct: Math.round((monthlyWasteCo2 / totalCo2) * 100) || 0,
    };
  }, [dailyKm, transportMode, monthlyKwh, dietType, compostsWaste, recyclesDryWaste]);

  // National and sustainable target benchmarks (kg/month)
  const benchmarkIndiaAvg = 170; // ~2.0 tons/year
  const benchmarkGlobalAvg = 380; // ~4.6 tons/year
  const benchmarkEcoTarget = 120; // 1.5-degree compatible budget

  const handleSaveLog = () => {
    setSavedLogs([...savedLogs, { month: 'Oct (Now)', co2: results.total }]);
    setLogSavedNotice(true);
    setTimeout(() => setLogSavedNotice(false), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-emerald-950/10 mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-emerald-400/20">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Lifestyle Carbon Footprint Calculator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Measure your impact. Decarbonize your routine.
          </h1>
          <p className="mt-2 text-emerald-100 text-sm leading-relaxed">
            Estimates your monthly CO₂e emissions based on standard greenhouse gas conversion factors across mobility, residential electricity, dietary habits, and waste diversion.
          </p>
        </div>
      </div>

      {logSavedNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold">Monthly carbon log recorded! +30 EcoPoints earned.</span>
          </div>
          <span className="text-xs font-extrabold px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-lg">
            ⭐ +30 pts
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Inputs (Left Column - 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Mobility & Travel */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 text-emerald-800">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Car className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Mobility & Commuting</h3>
                <p className="text-xs text-slate-500">Daily travel mode and average distance</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Daily Commute Distance</span>
                  <span className="text-emerald-700 font-bold">{dailyKm} km / day</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="5"
                  value={dailyKm}
                  onChange={(e) => setDailyKm(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>0 km (Work from home)</span>
                  <span>60 km</span>
                  <span>120 km</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Primary Transport Mode</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'petrol_car', label: 'Petrol Car', icon: '🚗' },
                    { id: 'diesel_car', label: 'Diesel Car', icon: '🚙' },
                    { id: 'ev', label: 'Electric EV', icon: '⚡' },
                    { id: 'bus', label: 'City Bus', icon: '🚌' },
                    { id: 'metro', label: 'Metro / Train', icon: '🚆' },
                    { id: 'bike', label: 'Bicycle / Walk', icon: '🚲' },
                  ].map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTransportMode(mode.id)}
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                        transportMode === mode.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-base">{mode.icon}</span>
                      <span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Household Electricity */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 text-emerald-800">
              <div className="p-2 rounded-xl bg-amber-100">
                <Zap className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Household Electricity</h3>
                <p className="text-xs text-slate-500">Monthly grid consumption in units (kWh)</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Monthly Electricity Consumption</span>
                <span className="text-emerald-700 font-bold">{monthlyKwh} kWh / month</span>
              </div>
              <input
                type="range"
                min="30"
                max="600"
                step="10"
                value={monthlyKwh}
                onChange={(e) => setMonthlyKwh(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>30 kWh (Minimal)</span>
                <span>250 kWh (Moderate)</span>
                <span>600 kWh (Heavy AC)</span>
              </div>
            </div>
          </div>

          {/* 3. Diet & Food */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 text-emerald-800">
              <div className="p-2 rounded-xl bg-teal-100">
                <Utensils className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Dietary Pattern</h3>
                <p className="text-xs text-slate-500">Food choices greatly influence agricultural emissions</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'vegan', label: '100% Plant (Vegan)', icon: '🥗', co2: '~115 kg' },
                { id: 'vegetarian', label: 'Vegetarian (Dairy)', icon: '🧀', co2: '~140 kg' },
                { id: 'average', label: 'Omnivore (Moderate)', icon: '🍗', co2: '~205 kg' },
                { id: 'meat_heavy', label: 'Daily Meat Heavy', icon: '🥩', co2: '~275 kg' },
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDietType(d.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    dietType === d.id
                      ? 'border-emerald-600 bg-emerald-50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl">{d.icon}</span>
                  <p className="font-bold text-xs text-slate-900 mt-1.5">{d.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{d.co2} / mo</p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Waste Segregation & Composting */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4 text-emerald-800">
              <div className="p-2 rounded-xl bg-emerald-100">
                <Trash2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Waste & Circular Habits</h3>
                <p className="text-xs text-slate-500">Landfill diversion credits</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={compostsWaste}
                  onChange={(e) => setCompostsWaste(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Compost Organic Waste</p>
                  <p className="text-[11px] text-emerald-700">-20 kg CO₂e / month</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={recyclesDryWaste}
                  onChange={(e) => setRecyclesDryWaste(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-800">Recycle Plastics & Paper</p>
                  <p className="text-[11px] text-emerald-700">-15 kg CO₂e / month</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Results & Visual Analytics (Right Column - 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Emission Badge */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />
            
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
              Estimated Monthly Carbon Footprint
            </p>
            
            <div className="my-4">
              <span className="text-5xl font-black text-slate-900 tracking-tight">
                {results.total}
              </span>
              <span className="text-base font-bold text-slate-500 ml-1.5">kg CO₂e</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-4">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>
                {results.total < benchmarkIndiaAvg ? 'Below Indian Average! 🎉' : 'Room for Reduction 📉'}
              </span>
            </div>

            {/* Benchmark Comparative Progress Bars */}
            <div className="space-y-3 pt-4 border-t border-slate-100 text-left text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span className="text-slate-600">Your Current Footprint</span>
                  <span className="font-bold text-emerald-700">{results.total} kg</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (results.total / benchmarkGlobalAvg) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-500 mb-1">
                  <span>India National Avg</span>
                  <span>{benchmarkIndiaAvg} kg</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${(benchmarkIndiaAvg / benchmarkGlobalAvg) * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-500 mb-1">
                  <span>Sustainable Climate Target</span>
                  <span className="text-teal-700 font-semibold">{benchmarkEcoTarget} kg</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(benchmarkEcoTarget / benchmarkGlobalAvg) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Breakdown Stack */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Emission Source Breakdown
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'Transport', val: results.transport, pct: results.transportPct, color: 'bg-emerald-500' },
                  { label: 'Electricity', val: results.electricity, pct: results.electricityPct, color: 'bg-amber-500' },
                  { label: 'Dietary', val: results.diet, pct: results.dietPct, color: 'bg-teal-500' },
                  { label: 'Waste Net', val: results.waste, pct: results.wastePct, color: 'bg-slate-400' },
                ].map(b => (
                  <div key={b.label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                      <span className="font-medium text-slate-700">{b.label}</span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      {b.val} kg <span className="text-slate-400 font-normal">({b.pct}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Log Button */}
            <button
              onClick={handleSaveLog}
              className="mt-6 w-full py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Log Footprint & Earn +30 pts</span>
            </button>
          </div>

          {/* AI Tailored Reduction Tips Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-3xl">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>AI Sustainability Recommendations</span>
            </div>
            <ul className="space-y-2.5 text-xs text-emerald-900">
              {results.transportPct > 40 && (
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Swapping 2 drive days a week with Metro or bus cuts your transit footprint by ~32kg/month.</span>
                </li>
              )}
              {monthlyKwh > 150 && (
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Setting AC thermostat to 24°C rather than 18°C saves up to 18-24% electricity units.</span>
                </li>
              )}
              {!compostsWaste && (
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Starting a balcony terracotta compost bin prevents anaerobic methane release in dump yards.</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">•</span>
                <span>Check out the <strong>Eco Exchange Hub</strong> to pick up low-cost compost bins or plant pots from neighbors!</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
