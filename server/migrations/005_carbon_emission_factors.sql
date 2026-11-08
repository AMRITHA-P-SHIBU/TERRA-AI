-- ====================================================================
-- Migration 005: Emission Factors & Enhanced Carbon Footprint Tracking
-- Terra AI / EcoSphere AI
-- ====================================================================

-- 1. Create emission_factors table
CREATE TABLE IF NOT EXISTS public.emission_factors (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('transportation', 'electricity', 'cooking_fuel', 'waste')),
  activity_name TEXT NOT NULL,
  vehicle_type TEXT DEFAULT NULL,
  fuel_type TEXT DEFAULT NULL,
  value NUMERIC(10, 4) NOT NULL,
  unit TEXT NOT NULL,
  source TEXT NOT NULL,
  applicable_year INTEGER NOT NULL DEFAULT 2024,
  is_estimate BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_emission_factors_category ON public.emission_factors (category);

-- Enable RLS
ALTER TABLE public.emission_factors ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated and anon users to read emission factors
DROP POLICY IF EXISTS "Emission factors are viewable by everyone" ON public.emission_factors;
CREATE POLICY "Emission factors are viewable by everyone"
  ON public.emission_factors FOR SELECT
  USING (true);

-- 2. Seed CEA, ARAI, MoPNG, and CPCB standard factors
INSERT INTO public.emission_factors (id, category, activity_name, vehicle_type, fuel_type, value, unit, source, applicable_year, is_estimate, description)
VALUES
  ('elec_grid_cea', 'electricity', 'Grid Electricity (CEA National Grid Average)', NULL, NULL, 0.7160, 'kg CO2e / kWh', 'Central Electricity Authority (CEA) CO2 Baseline Database v19 (2024)', 2024, false, 'National weighted average grid emission factor for Indian electricity sector'),
  ('elec_grid_lifecycle', 'electricity', 'Grid Electricity (Combined Margin with T&D Losses)', NULL, NULL, 0.8200, 'kg CO2e / kWh', 'CEA India & GHG Protocol Scope 2 Guidance (2024)', 2024, true, 'Lifecycle grid factor accounting for transmission and distribution losses in Indian states'),
  ('elec_solar_rooftop', 'electricity', 'Rooftop Solar PV (Net Metered)', NULL, NULL, 0.0000, 'kg CO2e / kWh', 'Ministry of New and Renewable Energy (MNRE) India (2024)', 2024, false, 'Zero operational emission factor for on-site clean solar energy generation'),
  ('trans_petrol_hatchback', 'transportation', 'Petrol Small Car / Hatchback', 'car', 'petrol', 0.1420, 'kg CO2e / km', 'ARAI / Bureau of Energy Efficiency (BEE) India Average (18-20 km/L)', 2023, false, 'Standard petrol compact passenger car in urban and mixed Indian driving cycles'),
  ('trans_petrol_suv', 'transportation', 'Petrol Midsize Car / Sedan / SUV', 'car', 'petrol', 0.1850, 'kg CO2e / km', 'ARAI / BEE India Fuel Economy Standards (12-14 km/L)', 2023, false, 'Mid-to-large petrol SUV or sedan vehicle emissions in India'),
  ('trans_diesel_car', 'transportation', 'Diesel Car / SUV', 'car', 'diesel', 0.1680, 'kg CO2e / km', 'ARAI / MoEFCC India Emissions Factors (15-18 km/L)', 2023, false, 'Average diesel passenger vehicle in Indian traffic conditions'),
  ('trans_cng_car', 'transportation', 'CNG Passenger Car', 'car', 'cng', 0.1080, 'kg CO2e / km', 'ARAI / BEE CNG Vehicle Certification Guidelines', 2023, false, 'Compressed Natural Gas (CNG) dual-fuel passenger car'),
  ('trans_ev_car', 'transportation', 'Electric Car (EV)', 'car', 'electric', 0.0650, 'kg CO2e / km', 'CEA 2024 Grid Intensity x Indian EV Efficiency (~0.09 kWh/km)', 2024, true, 'Electric four-wheeler charged using standard Indian grid mix'),
  ('trans_petrol_two_wheeler', 'transportation', 'Petrol Two-Wheeler (Scooter / Motorcycle)', 'two_wheeler', 'petrol', 0.0380, 'kg CO2e / km', 'ARAI Indian Driving Cycle (100-150cc BS-VI standard, ~48-52 km/L)', 2023, false, 'Standard petrol scooter (Activa, Access, Jupiter) or commuter motorcycle in India'),
  ('trans_ev_two_wheeler', 'transportation', 'Electric Two-Wheeler (E-Scooter)', 'two_wheeler', 'electric', 0.0180, 'kg CO2e / km', 'CEA 2024 Grid Intensity x E-Scooter Efficiency (~0.025 kWh/km)', 2024, true, 'Electric scooter (Ather, Ola, TVS iQube) charged on Indian grid'),
  ('trans_city_bus', 'transportation', 'City Bus / Public Transit Bus', 'bus', 'diesel_cng', 0.0540, 'kg CO2e / passenger-km', 'Association of State Road Transport Undertakings (ASRTU) & India GHG Protocol', 2023, false, 'Average per-passenger emissions for Indian urban state transport buses'),
  ('trans_metro_train', 'transportation', 'Metro / Local Suburban Train', 'metro_train', 'electric', 0.0280, 'kg CO2e / passenger-km', 'Delhi Metro Rail Corporation (DMRC) Clean Development Mechanism (CDM) Data', 2023, false, 'Electric rapid transit rail per passenger-kilometer in Indian cities'),
  ('trans_auto_rickshaw', 'transportation', 'Auto Rickshaw (CNG / LPG)', 'auto_rickshaw', 'cng', 0.0620, 'kg CO2e / passenger-km', 'MoEFCC / CSE India Clean Air Study', 2023, true, 'Three-wheeler CNG/LPG auto-rickshaw shared urban transit'),
  ('trans_bicycle_walk', 'transportation', 'Bicycle / Walking', 'active_travel', 'human', 0.0000, 'kg CO2e / km', 'GHG Protocol Global Standard for Active Transport', 2024, false, 'Zero direct greenhouse gas emissions for non-motorized transport'),
  ('trans_flight_domestic', 'transportation', 'Domestic Flight (Economy Class)', 'flight', 'atf', 0.2450, 'kg CO2e / passenger-km', 'DGCA India & ICAO Carbon Calculator (including radiative forcing)', 2023, true, 'Short-to-medium haul domestic passenger air travel in India'),
  ('cook_lpg_cylinder', 'cooking_fuel', 'LPG Domestic Cylinder (14.2 kg standard)', NULL, NULL, 42.3700, 'kg CO2e / cylinder', 'Ministry of Petroleum & Natural Gas (MoPNG) & IPCC 2006 (2.984 kg CO2e / kg LPG)', 2023, false, 'Standard 14.2 kg domestic LPG cylinder used across Indian households'),
  ('cook_lpg_kg', 'cooking_fuel', 'LPG Gas (by weight)', NULL, NULL, 2.9840, 'kg CO2e / kg LPG', 'IPCC 2006 Guidelines for National Greenhouse Gas Inventories - Volume 2 Energy', 2023, false, 'Direct emission factor per kilogram of Liquefied Petroleum Gas combusted'),
  ('cook_png', 'cooking_fuel', 'PNG (Piped Natural Gas)', NULL, NULL, 2.0200, 'kg CO2e / SCM', 'Petroleum and Natural Gas Regulatory Board (PNGRB) / IGL & MGL India', 2023, false, 'Piped natural gas measured per Standard Cubic Meter (SCM)'),
  ('cook_biogas', 'cooking_fuel', 'Home / Community Biogas', NULL, NULL, 0.0500, 'kg CO2e / SCM', 'MNRE National Biogas and Manure Management Programme (NBMMP)', 2024, true, 'Anaerobic bio-digestion of kitchen waste; closed biological cycle'),
  ('cook_firewood', 'cooking_fuel', 'Firewood / Biomass (Traditional Chulha)', NULL, NULL, 1.7500, 'kg CO2e / kg', 'IPCC 2006 & Forest Survey of India (FSI) Biomass Combustion Factor', 2023, true, 'Non-sustainable biomass / firewood combustion with incomplete burning emissions'),
  ('waste_organic_landfill', 'waste', 'Organic / Wet Kitchen Waste (Sent to Landfill)', NULL, NULL, 0.5200, 'kg CO2e / kg waste', 'Central Pollution Control Board (CPCB) India Municipal Solid Waste Guidelines', 2023, false, 'Methane (CH4) release factor from anaerobic decomposition of wet food waste in dump sites'),
  ('waste_organic_composted', 'waste', 'Organic Waste Composted (Home / Community)', NULL, NULL, 0.0480, 'kg CO2e / kg waste', 'CPCB & IPCC Aerobic Biological Treatment Factor (~91% emission reduction vs landfill)', 2023, false, 'Aerobic composting prevents methane generation, returning organic carbon safely to soil'),
  ('waste_plastic_landfill', 'waste', 'Plastic Waste (Landfilled / Unsegregated)', NULL, NULL, 1.8500, 'kg CO2e / kg plastic', 'CPCB India Plastic Waste Management Rules 2021 & UNEP Lifecycle Data', 2023, true, 'Embodied fossil fuel emissions and open decomposition factor of discarded single-use plastics'),
  ('waste_plastic_recycled', 'waste', 'Plastic Waste (Recycled / Diverted)', NULL, NULL, 0.2500, 'kg CO2e / kg plastic', 'CPCB EPR Plastic Guidelines & Extended Producer Responsibility Technical Notes', 2023, true, 'Processing energy for collection, shredding, and mechanical remanufacturing of clean plastics'),
  ('waste_paper_landfill', 'waste', 'Paper & Cardboard (Landfilled)', NULL, NULL, 1.1500, 'kg CO2e / kg paper', 'IPCC Waste Model India & CPCB Solid Waste Management Guidelines', 2023, false, 'Anaerobic biodegradation of cellulose in wet landfill producing biogenic methane'),
  ('waste_paper_recycled', 'waste', 'Paper & Cardboard (Recycled)', NULL, NULL, 0.1800, 'kg CO2e / kg paper', 'CPCB & Bureau of Energy Efficiency Paper Sector PAT Scheme', 2023, true, 'Energy required in pulping and repressing recycled fiber instead of virgin wood pulp'),
  ('waste_mixed_general', 'waste', 'Unsegregated Mixed Municipal Solid Waste', NULL, NULL, 0.7800, 'kg CO2e / kg waste', 'CPCB Status of Municipal Solid Waste Management in Indian Cities (2023)', 2023, true, 'Blended average emission factor for unsegregated municipal garbage in Indian dumpsites')
ON CONFLICT (id) DO UPDATE SET
  value = EXCLUDED.value,
  source = EXCLUDED.source,
  applicable_year = EXCLUDED.applicable_year,
  description = EXCLUDED.description,
  updated_at = timezone('utc'::text, now());

