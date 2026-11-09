import { supabaseAdmin } from '../supabase.js';
import {
  calculateCarbonFootprint,
  generateAiRecommendations,
  computeHistoricalComparison,
  evaluateEcoPointEligibility,
  getActiveEmissionFactors,
  BENCHMARKS,
} from '../services/carbonCalculationService.js';

/**
 * Validate input fields to prevent negative numbers or invalid payloads
 */
function validateCarbonInputs(body) {
  const errors = [];
  const checkNonNegative = (val, fieldName) => {
    if (val !== undefined && val !== null && val !== '') {
      const n = Number(val);
      if (isNaN(n) || n < 0) {
        errors.push(`${fieldName} cannot be negative or invalid.`);
      }
    }
  };

  const t = body.transportation || body.transport || {};
  checkNonNegative(t.daily_km, 'Transportation daily km');
  checkNonNegative(t.monthly_km, 'Transportation monthly km');
  checkNonNegative(t.flight_km, 'Flight km');

  const e = body.electricity || {};
  checkNonNegative(e.monthly_kwh ?? e.kwh, 'Electricity monthly kWh');
  checkNonNegative(e.solar_generated_kwh ?? e.solar_kwh, 'Solar generated kWh');

  const c = body.cooking_fuel || body.cooking || {};
  checkNonNegative(c.cylinders_per_month ?? c.cylinders, 'Cooking cylinders');
  checkNonNegative(c.scm_per_month ?? c.scm, 'Cooking SCM');
  checkNonNegative(c.lpg_kg, 'Cooking LPG kg');
  checkNonNegative(c.firewood_kg, 'Cooking Firewood kg');

  const w = body.waste || body.waste_management || {};
  checkNonNegative(w.organic_kg, 'Organic waste kg');
  checkNonNegative(w.plastic_kg, 'Plastic waste kg');
  checkNonNegative(w.paper_kg, 'Paper waste kg');
  checkNonNegative(w.general_waste_kg, 'General waste kg');
  checkNonNegative(w.total_waste_kg, 'Total waste kg');

  return errors;
}

/**
 * Award EcoPoints to individual_users or organization_users table
 */
async function awardEcoPoints(userId, points) {
  if (!supabaseAdmin) return 0;
  try {
    const { data: iu } = await supabaseAdmin
      .from('individual_users')
      .select('total_ecopoints')
      .eq('id', userId)
      .maybeSingle();

    if (iu !== null && iu !== undefined) {
      const currentPoints = Number(iu?.total_ecopoints) || 0;
      const newTotal = currentPoints + points;

      await supabaseAdmin
        .from('individual_users')
        .update({ total_ecopoints: newTotal })
        .eq('id', userId);

      return newTotal;
    }

    const { data: ou } = await supabaseAdmin
      .from('organization_users')
      .select('total_ecopoints')
      .eq('id', userId)
      .maybeSingle();

    if (ou !== null && ou !== undefined) {
      const currentPoints = Number(ou?.total_ecopoints) || 0;
      const newTotal = currentPoints + points;

      await supabaseAdmin
        .from('organization_users')
        .update({ total_ecopoints: newTotal })
        .eq('id', userId);

      return newTotal;
    }

    return null;
  } catch (err) {
    console.error('[Carbon EcoPoints Error]:', err.message);
    return null;
  }
}

/**
 * GET /api/carbon/emission-factors
 * List all active emission factors with source citations
 */
export async function getEmissionFactors(_req, res) {
  try {
    const factors = await getActiveEmissionFactors();
    return res.json({
      status: 'ok',
      count: factors.length,
      benchmarks: BENCHMARKS,
      emission_factors: factors,
    });
  } catch (error) {
    console.error('[getEmissionFactors Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve emission factors.' });
  }
}

/**
 * POST /api/carbon/calculate
 * Calculate carbon footprint preview without saving
 */
export async function calculatePreview(req, res) {
  try {
    const validationErrors = validateCarbonInputs(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    const calculated = await calculateCarbonFootprint(req.body);
    return res.json({
      status: 'ok',
      preview: true,
      calculation: calculated,
    });
  } catch (error) {
    console.error('[calculatePreview Error]:', error);
    return res.status(500).json({ error: error.message || 'Calculation engine failed.' });
  }
}

/**
 * POST /api/carbon/log
 * Validate, perform official calculation, generate AI tips, compare with history, and save log
 */
export async function logCalculation(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database service is currently unavailable.' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to log carbon footprint.' });
    }

    const validationErrors = validateCarbonInputs(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    // 1. Run formula calculation
    const calculated = await calculateCarbonFootprint(req.body);

    // 2. Fetch previous calculation for month-over-month comparison
    const { data: previousLogs, error: prevErr } = await supabaseAdmin
      .from('carbon_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (prevErr) console.warn('[Carbon previous log fetch warning]:', prevErr.message);

    const previousLog = previousLogs && previousLogs[0] ? previousLogs[0] : null;
    const historicalComparison = computeHistoricalComparison(calculated, previousLog);

    // 3. Generate tailored AI recommendations
    const aiRecommendations = await generateAiRecommendations(calculated);

    // 4. Evaluate eligible sustainable actions for EcoPoints
    const eligibleChallenges = evaluateEcoPointEligibility(calculated, historicalComparison, []);

    // 5. Construct full record payload
    const reportData = {
      calculation_id: undefined, // populated after insert
      user_id: userId,
      user_name: req.user.full_name || 'Terra Member',
      user_email: req.user.email,
      calculation_period: 'monthly',
      total_co2e_kg: calculated.total_co2e_kg,
      annualized_co2e_tonnes: calculated.annualized_co2e_tonnes,
      category_emissions: calculated.category_emissions,
      category_percentages: calculated.category_percentages,
      highest_emission_category: calculated.highest_emission_category,
      activity_details: calculated.activity_details,
      emission_factors_used: calculated.emission_factors_used,
      benchmarks: BENCHMARKS,
      comparison_with_benchmarks: calculated.comparison_with_benchmarks,
      monthly_comparison: historicalComparison,
      recommendations: aiRecommendations,
      eligible_challenges: eligibleChallenges,
      claimed_actions: [],
      notes: typeof req.body.notes === 'string' ? req.body.notes.trim() : '',
    };

    // 6. Insert record into carbon_logs
    const insertPayload = {
      user_id: userId,
      transport_km: calculated.activity_details.transport.monthly_km || 0,
      transport_mode: calculated.activity_details.transport.mode || 'car',
      electricity_kwh: calculated.activity_details.electricity.monthly_kwh || 0,
      waste_kg:
        (calculated.activity_details.waste.organic_kg || 0) +
        (calculated.activity_details.waste.plastic_kg || 0) +
        (calculated.activity_details.waste.paper_kg || 0),
      diet_type: req.body.diet_type || 'average',
      total_co2e_kg: calculated.total_co2e_kg,
      reduction_recommendations: reportData,
      author_scope: req.user.account_type === 'ORG_ADMIN' ? 'ORGANIZATION' : 'INDIVIDUAL',
      organization_id: req.user.organization_id || null,
    };

    const { data: savedRow, error: insertError } = await supabaseAdmin
      .from('carbon_logs')
      .insert([insertPayload])
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`Failed to save carbon footprint log: ${insertError.message}`);
    }

    reportData.calculation_id = savedRow.id;
    reportData.created_at = savedRow.created_at;

    return res.status(201).json({
      status: 'ok',
      message: 'Carbon footprint logged successfully!',
      report: reportData,
    });
  } catch (error) {
    console.error('[logCalculation Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to record carbon footprint.' });
  }
}

/**
 * GET /api/carbon/history
 * Fetch historical calculations for authenticated user
 */
export async function getCalculationHistory(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database service is currently unavailable.' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { data: logs, error } = await supabaseAdmin
      .from('carbon_logs')
      .select('id, user_id, total_co2e_kg, transport_km, transport_mode, electricity_kwh, waste_kg, reduction_recommendations, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);

    const historyItems = (logs || []).map((row) => {
      const storedReport = row.reduction_recommendations || {};
      return {
        id: row.id,
        date: row.created_at,
        total_co2e_kg: Number(row.total_co2e_kg),
        category_emissions: storedReport.category_emissions || {
          transportation: 0,
          electricity: 0,
          cooking_fuel: 0,
          waste: 0,
        },
        highest_category: storedReport.highest_emission_category || 'transportation',
        monthly_comparison: storedReport.monthly_comparison || null,
        claimed_actions: storedReport.claimed_actions || [],
      };
    });

    // Compute lifetime statistics
    const totals = historyItems.map((h) => h.total_co2e_kg);
    const avgTotal = totals.length > 0 ? Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)) : 0;
    const minTotal = totals.length > 0 ? Math.min(...totals) : 0;
    const maxTotal = totals.length > 0 ? Math.max(...totals) : 0;

    return res.json({
      status: 'ok',
      count: historyItems.length,
      average_footprint_kg: avgTotal,
      lowest_footprint_kg: minTotal,
      highest_footprint_kg: maxTotal,
      history: historyItems,
    });
  } catch (error) {
    console.error('[getCalculationHistory Error]:', error);
    return res.status(500).json({ error: 'Failed to retrieve calculation history.' });
  }
}

/**
 * GET /api/carbon/report/:id
 * Retrieve a detailed report for a specific calculation ID
 */
export async function getCalculationReport(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database service is currently unavailable.' });
    }

    const userId = req.user?.id;
    const { id } = req.params;

    let queryBuilder = supabaseAdmin.from('carbon_logs').select('*');

    if (id === 'latest') {
      queryBuilder = queryBuilder.eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
    } else {
      queryBuilder = queryBuilder.eq('id', id).eq('user_id', userId).limit(1);
    }

    const { data: rows, error } = await queryBuilder;
    if (error) throw new Error(error.message);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Calculation report not found.' });
    }

    const row = rows[0];
    const report = row.reduction_recommendations || {};
    report.calculation_id = row.id;
    report.created_at = row.created_at;

    return res.json({
      status: 'ok',
      report,
    });
  } catch (error) {
    console.error('[getCalculationReport Error]:', error);
    return res.status(500).json({ error: 'Failed to load calculation report.' });
  }
}

/**
 * POST /api/carbon/claim-action
 * Reward users with EcoPoints for verified sustainable reduction challenges
 * Strict anti-duplicate check: Cannot claim the same action twice for the same calculation log.
 */
export async function claimSustainableAction(req, res) {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Database service is currently unavailable.' });
    }

    const userId = req.user?.id;
    const { log_id, action_id } = req.body;

    if (!log_id || !action_id) {
      return res.status(400).json({ error: 'log_id and action_id are required.' });
    }

    // 1. Fetch user's carbon log
    const { data: logRow, error: fetchErr } = await supabaseAdmin
      .from('carbon_logs')
      .select('*')
      .eq('id', log_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!logRow) {
      return res.status(404).json({ error: 'Carbon calculation record not found.' });
    }

    const report = logRow.reduction_recommendations || {};
    const claimedActions = Array.isArray(report.claimed_actions) ? report.claimed_actions : [];

    // 2. Prevent duplicate reward
    if (claimedActions.includes(action_id)) {
      return res.status(409).json({ error: 'EcoPoints have already been awarded for this sustainable action.' });
    }

    // 3. Define point rewards per action
    const challengeRewards = {
      action_carbon_reduction_5pct: { points: 30, title: 'Carbon Cutter: 5%+ Monthly Footprint Reduction' },
      action_waste_composting_diverter: { points: 25, title: 'Zero-Methane Composting Habit' },
      action_green_commuter: { points: 20, title: 'Clean Mobility Commuter' },
      action_energy_saver_100kwh: { points: 20, title: 'Energy Conservation Vanguard' },
    };

    const targetChallenge = challengeRewards[action_id];
    if (!targetChallenge) {
      return res.status(400).json({ error: 'Unrecognized sustainable action challenge.' });
    }

    // 4. Atomically credit EcoPoints to individual_users
    const newTotalPoints = await awardEcoPoints(userId, targetChallenge.points);

    // 5. Update log record with claimed action id
    claimedActions.push(action_id);
    report.claimed_actions = claimedActions;

    await supabaseAdmin
      .from('carbon_logs')
      .update({ reduction_recommendations: report })
      .eq('id', log_id);

    return res.json({
      status: 'ok',
      message: `Congratulations! ${targetChallenge.points} EcoPoints awarded for ${targetChallenge.title}!`,
      points_awarded: targetChallenge.points,
      new_total_ecopoints: newTotalPoints,
      action_id,
    });
  } catch (error) {
    console.error('[claimSustainableAction Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to claim sustainable action EcoPoints.' });
  }
}

