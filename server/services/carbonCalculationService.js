import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../supabase.js';
import { DEFAULT_EMISSION_FACTORS, EMISSION_FACTORS_MAP } from '../data/emissionFactors.js';

const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// National & International Benchmarks (kg CO2e per person per month)
export const BENCHMARKS = {
  indiaNationalAvg: 170, // ~2.04 tonnes/year
  globalAvg: 380,        // ~4.56 tonnes/year
  parisTarget: 120,      // ~1.44 tonnes/year (1.5°C lifestyle budget)
};

/**
 * Fetch emission factors from database if configured, or return cached/default factors
 */
export async function getActiveEmissionFactors() {
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('emission_factors')
        .select('*')
        .order('category', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // Fallback seamlessly to authoritative registry
    }
  }
  return DEFAULT_EMISSION_FACTORS;
}

/**
 * Helper to retrieve a single factor by ID
 */
export async function getFactorById(factorId) {
  const allFactors = await getActiveEmissionFactors();
  const found = allFactors.find((f) => f.id === factorId);
  return found || EMISSION_FACTORS_MAP.get(factorId) || null;
}

/**
 * Clean & validate numeric input
 */
function sanitizeNumber(val, defaultVal = 0, maxVal = 100000) {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = Number(val);
  if (isNaN(num) || num < 0) return defaultVal;
  return Math.min(num, maxVal);
}

/**
 * Core Formula-Based Calculation Engine
 * Carbon Emissions (kg CO2e) = Activity Amount × Emission Factor
 *
 * Missing or optional categories are defaulted to zero and will NOT fail calculation.
 */
export async function calculateCarbonFootprint(inputs = {}) {
  const allFactors = await getActiveEmissionFactors();
  const factorMap = new Map(allFactors.map((f) => [f.id, f]));
  const getF = (id) => factorMap.get(id) || EMISSION_FACTORS_MAP.get(id);

  const factorSnapshots = {};

  // ── 1. TRANSPORTATION ───────────────────────────────────────────────────
  let transportCo2 = 0;
  const transportDetails = [];

  const rawTransport = inputs.transportation || inputs.transport || {};
  const travelMode = rawTransport.mode || rawTransport.vehicle_type || 'petrol_hatchback';
  const commuteDaysPerMonth = sanitizeNumber(rawTransport.commute_days_per_month, 26, 31);
  const dailyKm = sanitizeNumber(rawTransport.daily_km, 0, 500);
  const monthlyKmDirect = sanitizeNumber(rawTransport.monthly_km, 0, 15000);
  const monthlyCommuteKm = monthlyKmDirect > 0 ? monthlyKmDirect : dailyKm * commuteDaysPerMonth;

  // Map mode to factor
  const transportModeMap = {
    petrol_hatchback: 'trans_petrol_hatchback',
    petrol_car: 'trans_petrol_hatchback',
    petrol_suv: 'trans_petrol_suv',
    diesel_car: 'trans_diesel_car',
    cng_car: 'trans_cng_car',
    electric_car: 'trans_ev_car',
    ev_car: 'trans_ev_car',
    petrol_two_wheeler: 'trans_petrol_two_wheeler',
    two_wheeler: 'trans_petrol_two_wheeler',
    scooter: 'trans_petrol_two_wheeler',
    electric_two_wheeler: 'trans_ev_two_wheeler',
    ev_two_wheeler: 'trans_ev_two_wheeler',
    city_bus: 'trans_city_bus',
    bus: 'trans_city_bus',
    metro_train: 'trans_metro_train',
    metro: 'trans_metro_train',
    train: 'trans_metro_train',
    auto_rickshaw: 'trans_auto_rickshaw',
    auto: 'trans_auto_rickshaw',
    bicycle_walk: 'trans_bicycle_walk',
    bike_walk: 'trans_bicycle_walk',
  };

  const primaryFactorId = transportModeMap[travelMode] || 'trans_petrol_hatchback';
  const primaryFactor = getF(primaryFactorId);

  if (primaryFactor && monthlyCommuteKm > 0) {
    const legCo2 = monthlyCommuteKm * primaryFactor.value;
    transportCo2 += legCo2;
    factorSnapshots[primaryFactorId] = primaryFactor;
    transportDetails.push({
      mode: primaryFactor.activity_name,
      distance_km: monthlyCommuteKm,
      factor_used: primaryFactor.value,
      emissions_kg: Number(legCo2.toFixed(2)),
      is_estimate: primaryFactor.is_estimate,
    });
  }

  // Optional flight travel
  const domesticFlightHours = sanitizeNumber(rawTransport.flight_hours, 0, 100);
  const domesticFlightKm = sanitizeNumber(rawTransport.flight_km, domesticFlightHours * 600, 20000);
  if (domesticFlightKm > 0) {
    const flightFactor = getF('trans_flight_domestic');
    if (flightFactor) {
      const flightCo2 = domesticFlightKm * flightFactor.value;
      transportCo2 += flightCo2;
      factorSnapshots['trans_flight_domestic'] = flightFactor;
      transportDetails.push({
        mode: flightFactor.activity_name,
        distance_km: domesticFlightKm,
        factor_used: flightFactor.value,
        emissions_kg: Number(flightCo2.toFixed(2)),
        is_estimate: flightFactor.is_estimate,
      });
    }
  }

  // ── 2. ELECTRICITY (CEA Factor) ─────────────────────────────────────────
  let electricityCo2 = 0;
  const rawElectricity = inputs.electricity || {};
  const monthlyKwh = sanitizeNumber(rawElectricity.monthly_kwh ?? rawElectricity.kwh, 0, 5000);
  const solarKwh = sanitizeNumber(rawElectricity.solar_generated_kwh ?? rawElectricity.solar_kwh, 0, 5000);
  const netGridKwh = Math.max(0, monthlyKwh - solarKwh);

  const gridFactor = getF('elec_grid_cea');
  if (gridFactor && netGridKwh > 0) {
    electricityCo2 = netGridKwh * gridFactor.value;
    factorSnapshots[gridFactor.id] = gridFactor;
  }
  if (solarKwh > 0) {
    const solarFactor = getF('elec_solar_rooftop');
    if (solarFactor) factorSnapshots[solarFactor.id] = solarFactor;
  }

  // ── 3. COOKING FUEL ─────────────────────────────────────────────────────
  let cookingCo2 = 0;
  const rawCooking = inputs.cooking_fuel || inputs.cooking || {};
  const cookingFuelType = rawCooking.fuel_type || 'lpg_cylinder';

  if (cookingFuelType === 'lpg_cylinder') {
    const cylinders = sanitizeNumber(rawCooking.cylinders_per_month ?? rawCooking.cylinders, 0, 20);
    // If entered as cylinder count
    const lpgCylinderFactor = getF('cook_lpg_cylinder');
    if (lpgCylinderFactor && cylinders > 0) {
      cookingCo2 = cylinders * lpgCylinderFactor.value;
      factorSnapshots[lpgCylinderFactor.id] = lpgCylinderFactor;
    }
  } else if (cookingFuelType === 'lpg_kg') {
    const lpgKg = sanitizeNumber(rawCooking.lpg_kg, 0, 300);
    const lpgKgFactor = getF('cook_lpg_kg');
    if (lpgKgFactor && lpgKg > 0) {
      cookingCo2 = lpgKg * lpgKgFactor.value;
      factorSnapshots[lpgKgFactor.id] = lpgKgFactor;
    }
  } else if (cookingFuelType === 'png') {
    const scm = sanitizeNumber(rawCooking.scm_per_month ?? rawCooking.scm, 0, 250);
    const pngFactor = getF('cook_png');
    if (pngFactor && scm > 0) {
      cookingCo2 = scm * pngFactor.value;
      factorSnapshots[pngFactor.id] = pngFactor;
    }
  } else if (cookingFuelType === 'biogas') {
    const biogasScm = sanitizeNumber(rawCooking.scm, 0, 250);
    const biogasFactor = getF('cook_biogas');
    if (biogasFactor && biogasScm > 0) {
      cookingCo2 = biogasScm * biogasFactor.value;
      factorSnapshots[biogasFactor.id] = biogasFactor;
    }
  } else if (cookingFuelType === 'firewood') {
    const firewoodKg = sanitizeNumber(rawCooking.firewood_kg, 0, 500);
    const firewoodFactor = getF('cook_firewood');
    if (firewoodFactor && firewoodKg > 0) {
      cookingCo2 = firewoodKg * firewoodFactor.value;
      factorSnapshots[firewoodFactor.id] = firewoodFactor;
    }
  }

  // ── 4. WASTE MANAGEMENT ─────────────────────────────────────────────────
  let wasteCo2 = 0;
  const rawWaste = inputs.waste || inputs.waste_management || {};

  // Organic waste
  const organicKg = sanitizeNumber(rawWaste.organic_kg, 0, 500);
  const isComposting = Boolean(rawWaste.composts_organic || rawWaste.is_composting);
  if (organicKg > 0) {
    const organicFactor = getF(isComposting ? 'waste_organic_composted' : 'waste_organic_landfill');
    if (organicFactor) {
      wasteCo2 += organicKg * organicFactor.value;
      factorSnapshots[organicFactor.id] = organicFactor;
    }
  }

  // Plastic waste
  const plasticKg = sanitizeNumber(rawWaste.plastic_kg, 0, 200);
  const isPlasticRecycling = Boolean(rawWaste.recycles_plastic || rawWaste.is_recycling);
  if (plasticKg > 0) {
    const plasticFactor = getF(isPlasticRecycling ? 'waste_plastic_recycled' : 'waste_plastic_landfill');
    if (plasticFactor) {
      wasteCo2 += plasticKg * plasticFactor.value;
      factorSnapshots[plasticFactor.id] = plasticFactor;
    }
  }

  // Paper waste
  const paperKg = sanitizeNumber(rawWaste.paper_kg, 0, 200);
  const isPaperRecycling = Boolean(rawWaste.recycles_paper);
  if (paperKg > 0) {
    const paperFactor = getF(isPaperRecycling ? 'waste_paper_recycled' : 'waste_paper_landfill');
    if (paperFactor) {
      wasteCo2 += paperKg * paperFactor.value;
      factorSnapshots[paperFactor.id] = paperFactor;
    }
  }

  // General unsegregated waste
  const generalWasteKg = sanitizeNumber(rawWaste.general_waste_kg, 0, 500);
  if (generalWasteKg > 0) {
    const mixedFactor = getF('waste_mixed_general');
    if (mixedFactor) {
      wasteCo2 += generalWasteKg * mixedFactor.value;
      factorSnapshots[mixedFactor.id] = mixedFactor;
    }
  }

  // If user only provided a quick monthly waste total without subcategories
  if (organicKg === 0 && plasticKg === 0 && paperKg === 0 && generalWasteKg === 0 && rawWaste.total_waste_kg) {
    const totalWKg = sanitizeNumber(rawWaste.total_waste_kg, 0, 500);
    const mixedFactor = getF('waste_mixed_general');
    if (mixedFactor && totalWKg > 0) {
      wasteCo2 = totalWKg * mixedFactor.value;
      factorSnapshots[mixedFactor.id] = mixedFactor;
    }
  }

  // ── 5. AGGREGATION & NORMALIZATION ──────────────────────────────────────
  const categoryEmissions = {
    transportation: Number(transportCo2.toFixed(2)),
    electricity: Number(electricityCo2.toFixed(2)),
    cooking_fuel: Number(cookingCo2.toFixed(2)),
    waste: Number(wasteCo2.toFixed(2)),
  };

  const totalCo2e = Number((transportCo2 + electricityCo2 + cookingCo2 + wasteCo2).toFixed(2));

  // Category percentages
  const categoryPercentages = {
    transportation: totalCo2e > 0 ? Math.round((transportCo2 / totalCo2e) * 100) : 0,
    electricity: totalCo2e > 0 ? Math.round((electricityCo2 / totalCo2e) * 100) : 0,
    cooking_fuel: totalCo2e > 0 ? Math.round((cookingCo2 / totalCo2e) * 100) : 0,
    waste: totalCo2e > 0 ? Math.round((wasteCo2 / totalCo2e) * 100) : 0,
  };

  // Identify highest emitting category
  let highestCategory = 'transportation';
  let highestVal = -1;
  for (const [cat, val] of Object.entries(categoryEmissions)) {
    if (val > highestVal) {
      highestVal = val;
      highestCategory = cat;
    }
  }

  return {
    total_co2e_kg: totalCo2e,
    annualized_co2e_tonnes: Number(((totalCo2e * 12) / 1000).toFixed(2)),
    category_emissions: categoryEmissions,
    category_percentages: categoryPercentages,
    highest_emission_category: highestCategory,
    highest_emission_value: highestVal,
    activity_details: {
      transport: {
        mode: travelMode,
        monthly_km: monthlyCommuteKm,
        daily_km: dailyKm,
        emissions_kg: categoryEmissions.transportation,
        breakdown: transportDetails,
      },
      electricity: {
        monthly_kwh: monthlyKwh,
        solar_generated_kwh: solarKwh,
        net_grid_kwh: netGridKwh,
        emissions_kg: categoryEmissions.electricity,
      },
      cooking_fuel: {
        fuel_type: cookingFuelType,
        emissions_kg: categoryEmissions.cooking_fuel,
      },
      waste: {
        organic_kg: organicKg,
        composts_organic: isComposting,
        plastic_kg: plasticKg,
        recycles_plastic: isPlasticRecycling,
        paper_kg: paperKg,
        recycles_paper: isPaperRecycling,
        emissions_kg: categoryEmissions.waste,
      },
    },
    emission_factors_used: factorSnapshots,
    benchmarks: BENCHMARKS,
    comparison_with_benchmarks: {
      vs_india_avg_pct: Math.round(((totalCo2e - BENCHMARKS.indiaNationalAvg) / BENCHMARKS.indiaNationalAvg) * 100),
      vs_paris_target_pct: Math.round(((totalCo2e - BENCHMARKS.parisTarget) / BENCHMARKS.parisTarget) * 100),
      status:
        totalCo2e <= BENCHMARKS.parisTarget
          ? 'Climate Hero (Within 1.5°C Budget)'
          : totalCo2e <= BENCHMARKS.indiaNationalAvg
          ? 'Below Indian Average'
          : 'Above Indian Average',
    },
    calculation_period: 'monthly',
  };
}

/**
 * Generate AI-Powered Tailored Recommendations using Google Gemini
 * Strictly based on user's actual calculated results, not generic text.
 */
export async function generateAiRecommendations(calculatedResult) {
  const { total_co2e_kg, category_emissions, highest_emission_category, activity_details } = calculatedResult;

  if (ai) {
    try {
      const prompt = `You are the Terra AI Carbon Footprint Intelligence Engine.
Analyze this user's ACTUAL calculated monthly lifestyle carbon footprint in India and provide 3 to 4 specific, actionable, quantified recommendations to reduce their emissions.

User Footprint Profile:
- Total Monthly Footprint: ${total_co2e_kg} kg CO2e
- Highest Emitting Category: ${highest_emission_category.toUpperCase()}
- Category Breakdown:
  * Transportation: ${category_emissions.transportation} kg CO2e (${activity_details.transport.monthly_km} km/mo via ${activity_details.transport.mode})
  * Electricity: ${category_emissions.electricity} kg CO2e (${activity_details.electricity.monthly_kwh} kWh/mo, Solar: ${activity_details.electricity.solar_generated_kwh} kWh)
  * Cooking Fuel: ${category_emissions.cooking_fuel} kg CO2e (${activity_details.cooking_fuel.fuel_type})
  * Waste: ${category_emissions.waste} kg CO2e (Composting: ${activity_details.waste.composts_organic ? 'Yes' : 'No'}, Plastic recycling: ${activity_details.waste.recycles_plastic ? 'Yes' : 'No'})

RULES:
1. Provide actionable advice tailored specifically to their highest emitting category and actual numbers.
2. Estimate the realistic monthly kg CO2e savings for each suggestion in Indian urban contexts.
3. Keep each recommendation practical, realistic, and inspiring.
4. Respond ONLY with a valid JSON array of objects with keys: "title", "action", "estimated_monthly_saving_kg", "category", "difficulty" (Easy/Medium/Challenging). Do NOT wrap in markdown fences.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const cleanJson = response.text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.warn('[Gemini Carbon Recommendations Fallback]:', err.message);
    }
  }

  // Reliable Rule-Based Fallback using actual numbers
  const recommendations = [];

  if (category_emissions.transportation > 50) {
    if (activity_details.transport.mode.includes('car')) {
      recommendations.push({
        title: 'Adopt Public Transit or E-Commute 2 Days/Week',
        action: `Swapping 2 driving days per week with Metro, city bus, or electric two-wheeler cuts your travel emissions by approximately 35-40%.`,
        estimated_monthly_saving_kg: Math.round(category_emissions.transportation * 0.35),
        category: 'transportation',
        difficulty: 'Easy',
      });
    } else if (activity_details.transport.mode.includes('two_wheeler')) {
      recommendations.push({
        title: 'Switch Commuter Bike to E-Scooter',
        action: 'Transitioning to an electric scooter cuts two-wheeler per-km emissions from 0.038 kg to 0.018 kg CO2e/km.',
        estimated_monthly_saving_kg: Math.round(category_emissions.transportation * 0.5),
        category: 'transportation',
        difficulty: 'Medium',
      });
    }
  }

  if (category_emissions.electricity > 70) {
    recommendations.push({
      title: 'Optimize AC Temperature to 24°C',
      action: `Setting your air conditioner to 24°C instead of 18-20°C reduces compressor load by 18-24%, saving ~${Math.round(activity_details.electricity.monthly_kwh * 0.2)} kWh grid units monthly.`,
      estimated_monthly_saving_kg: Math.round(category_emissions.electricity * 0.2),
      category: 'electricity',
      difficulty: 'Easy',
    });
  }

  if (!activity_details.waste.composts_organic) {
    recommendations.push({
      title: 'Start Balcony Organic Waste Composting',
      action: 'Diverting wet kitchen peels and coffee grounds into a terracotta composter stops anaerobic methane formation at city dump yards.',
      estimated_monthly_saving_kg: 18,
      category: 'waste',
      difficulty: 'Easy',
    });
  }

  if (category_emissions.cooking_fuel > 30) {
    recommendations.push({
      title: 'Use Pressure Cookers & Induction Cooktop Hybrid',
      action: 'Pressure cooking soaked pulses and using high-efficiency induction stoves reduces LPG cylinder depletion by 20%.',
      estimated_monthly_saving_kg: Math.round(category_emissions.cooking_fuel * 0.2),
      category: 'cooking_fuel',
      difficulty: 'Easy',
    });
  }

  // Ensure at least 3 tips
  if (recommendations.length < 3) {
    recommendations.push({
      title: 'Eliminate Phantom Standby Electricity',
      action: 'Unplug chargers, microwave ovens, and TV set-top boxes when not in use. Idle standby draw accounts for 5-8% of Indian household electric bills.',
      estimated_monthly_saving_kg: 12,
      category: 'electricity',
      difficulty: 'Easy',
    });
  }

  return recommendations;
}

/**
 * Compare current footprint calculation with user's previous calculation
 */
export function computeHistoricalComparison(currentResult, previousLog) {
  if (!previousLog || !previousLog.total_co2e_kg) {
    return {
      has_previous: false,
      message: 'This is your baseline carbon calculation. Track again next month to measure progress!',
      change_kg: 0,
      change_pct: 0,
      trend: 'baseline',
    };
  }

  const prevTotal = Number(previousLog.total_co2e_kg);
  const currTotal = Number(currentResult.total_co2e_kg);
  const diffKg = Number((currTotal - prevTotal).toFixed(2));
  const changePct = prevTotal > 0 ? Number((((currTotal - prevTotal) / prevTotal) * 100).toFixed(1)) : 0;

  return {
    has_previous: true,
    previous_total_kg: prevTotal,
    previous_date: previousLog.created_at,
    change_kg: diffKg,
    change_pct: changePct,
    trend: diffKg < 0 ? 'decreased' : diffKg > 0 ? 'increased' : 'unchanged',
    reduced: diffKg < 0,
    reduction_percentage: diffKg < 0 ? Math.abs(changePct) : 0,
  };
}

/**
 * Determine eligible EcoPoints Sustainable Action Challenges
 * Strictly rewards verified sustainable actions & footprint reductions;
 * does NOT award points for calculation alone.
 */
export function evaluateEcoPointEligibility(calculatedResult, previousComparison, existingClaimedActionIds = []) {
  const claimedSet = new Set(existingClaimedActionIds);
  const actions = [];

  // 1. Carbon Cutter: Month-over-Month reduction of at least 5%
  if (previousComparison.has_previous && previousComparison.reduction_percentage >= 5.0) {
    actions.push({
      id: 'action_carbon_reduction_5pct',
      title: 'Carbon Cutter: 5%+ Monthly Footprint Reduction',
      points: 30,
      icon: '📉',
      description: `Verified ${previousComparison.reduction_percentage}% reduction (${Math.abs(previousComparison.change_kg)} kg CO2e saved vs last month).`,
      eligible: !claimedSet.has('action_carbon_reduction_5pct'),
      claimed: claimedSet.has('action_carbon_reduction_5pct'),
    });
  }

  // 2. Organic Waste Composting Diverter
  if (calculatedResult.activity_details.waste.composts_organic) {
    actions.push({
      id: 'action_waste_composting_diverter',
      title: 'Zero-Methane Composting Habit',
      points: 25,
      icon: '🪴',
      description: 'Active home composting prevents methane generation in municipal landfills.',
      eligible: !claimedSet.has('action_waste_composting_diverter'),
      claimed: claimedSet.has('action_waste_composting_diverter'),
    });
  }

  // 3. Green Commute Pioneer (>60% low-carbon transit)
  const mode = calculatedResult.activity_details.transport.mode;
  if (['metro_train', 'city_bus', 'electric_two_wheeler', 'electric_car', 'bicycle_walk'].includes(mode)) {
    actions.push({
      id: 'action_green_commuter',
      title: 'Clean Mobility Commuter',
      points: 20,
      icon: '🚲',
      description: `Daily commute powered by sustainable mode: ${calculatedResult.activity_details.transport.mode.replace(/_/g, ' ')}.`,
      eligible: !claimedSet.has('action_green_commuter'),
      claimed: claimedSet.has('action_green_commuter'),
    });
  }

  // 4. Energy Conservation Benchmark (<100 kWh/month)
  if (calculatedResult.activity_details.electricity.net_grid_kwh > 0 && calculatedResult.activity_details.electricity.net_grid_kwh <= 100) {
    actions.push({
      id: 'action_energy_saver_100kwh',
      title: 'Energy Conservation Vanguard',
      points: 20,
      icon: '⚡',
      description: 'Maintained monthly household grid consumption under 100 kWh units.',
      eligible: !claimedSet.has('action_energy_saver_100kwh'),
      claimed: claimedSet.has('action_energy_saver_100kwh'),
    });
  }

  return actions;
}

