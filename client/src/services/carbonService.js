async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    ...options,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || 'The carbon service request failed.');
  }
  return data;
}

/**
 * Get active emission factors with source citations
 */
export async function getEmissionFactors() {
  return api('/carbon/emission-factors');
}

/**
 * Calculate carbon footprint preview without saving
 */
export async function calculateCarbonPreview(inputs) {
  return api('/carbon/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });
}

/**
 * Log official calculation, generate AI recommendations, and save
 */
export async function logCarbonCalculation(inputs) {
  return api('/carbon/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs),
  });
}

/**
 * Retrieve user's previous calculation history
 */
export async function getCarbonHistory() {
  return api('/carbon/history');
}

/**
 * Retrieve detailed calculation report by ID or 'latest'
 */
export async function getCarbonReport(id = 'latest') {
  return api(`/carbon/report/${encodeURIComponent(id)}`);
}

/**
 * Claim EcoPoints for eligible sustainable reduction actions
 */
export async function claimSustainableAction(logId, actionId) {
  return api('/carbon/claim-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ log_id: logId, action_id: actionId }),
  });
}

