import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { supabase, checkSupabaseConnection } from './supabase.js';

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

// Initialize Google Gen AI client if key exists
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Health Endpoint
app.get('/api/health', async (_request, response) => {
  const supabaseStatus = await checkSupabaseConnection();

  response.json({
    status: 'ok',
    service: 'terra-ai-api',
    supabase: supabaseStatus,
    aiConfigured: Boolean(geminiApiKey),
  });
});

// -------------------------------------------------------------
// 1. AI Eco Assistant Endpoint (Gemini LLM)
// -------------------------------------------------------------
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // If Gemini API is configured, use it
    if (ai) {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are Terra AI (also known as EcoSphere AI), an intelligent, inspiring, and practical environmental management and sustainable living assistant. 
Your goal is to guide citizens and community members on:
1. Home composting, Bokashi, Khamba terracotta pots, odor prevention, and organic gardening.
2. Zero-waste lifestyle, alternatives to single-use plastics, upcycling discarded items (especially coconut shells, glass bottles, cardboard, fabric).
3. Household energy efficiency, rooftop solar feasibility, AC thermostat optimization, and appliance star ratings.
4. Circular economy (local reuse, donation, bartering in the Eco Exchange Hub).
5. Calculating and reducing carbon footprint.

Format your responses using clear markdown with headings, numbered lists, bullet points, and encouraging eco-conscious tips. Keep advice actionable, locally feasible, and warm.`,
        },
      });

      return res.json({
        reply: result.text,
        source: 'gemini-api',
      });
    }

    // Fallback if no GEMINI_API_KEY is configured yet
    const query = prompt.toLowerCase();
    let reply = `### Personalized Sustainability Advice 🌿:\n\nThank you for asking about **"${prompt}"**!\n\nTo make this habit stick:\n1. **Start Small**: Substitute one disposable item this week.\n2. **Engage Locally**: Explore the Eco Exchange Hub to borrow or exchange tools.\n3. **Track Your Impact**: Log your activity on GreenFeed to earn EcoPoints!`;

    if (query.includes('compost') || query.includes('smell') || query.includes('balcony')) {
      reply = `### How to maintain an odor-free balcony compost bin 🪴:\n\n1. **The 3:1 Brown to Green Ratio**: Always add 3 parts browns (dry leaves, cocopeat, crushed egg cartons) for every 1 part greens (vegetable peels, tea dregs). Browns absorb moisture and eliminate odors.\n2. **Avoid Cooked Food & Dairy**: Never put oily curries, bones, meat, or milk products in a basic apartment bin.\n3. **Weekly Aeration**: Stir the pile once a week to supply oxygen to aerobic microbes.\n4. **Bio-Inoculant**: A splash of sour buttermilk or bio-inoculant powder accelerates breakdown.\n\n*Pro-tip: Check our **Eco Exchange Hub** to find pre-loved terracotta Khamba compost pots!*`;
    } else if (query.includes('coconut') || query.includes('upcycle') || query.includes('craft')) {
      reply = `### 4 Creative ways to upcycle coconut shells 🥥:\n\n1. **Balcony Succulent & Hanging Planter**: Sand down outer fibers, drill drainage holes, and oil with coconut oil.\n2. **Natural Soy Candle Cups**: Secure a wick to the bottom and pour melted soy wax.\n3. **Zero-Waste Soap Dish**: Cut shell in half and drill small drainage holes.\n4. **Organic Seed Starter Bowls**: Use directly as biodegradable seedling pots.\n\n*Share your finished craft on **GreenFeed** to earn +25 EcoPoints!*`;
    }

    return res.json({
      reply,
      source: 'knowledge-engine',
      note: 'Add GEMINI_API_KEY to server/.env to enable live Gemini LLM responses.',
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Failed to generate sustainability advice' });
  }
});

// -------------------------------------------------------------
// 2. GreenFeed Posts Endpoints
// -------------------------------------------------------------
app.get('/api/posts', async (_req, res) => {
  if (!supabase) {
    return res.json({ posts: [], message: 'Supabase not configured' });
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ posts: data });
});

app.post('/api/posts', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not connected' });
  }

  const { user_id, caption, category, image_url } = req.body;
  const { data, error } = await supabase
    .from('posts')
    .insert([
      {
        user_id,
        caption,
        category,
        image_url,
        status: 'pending', // pending admin approval
        eco_points_awarded: 25,
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ post: data[0] });
});

// -------------------------------------------------------------
// 3. Eco Exchange Hub Endpoints
// -------------------------------------------------------------
app.get('/api/marketplace', async (_req, res) => {
  if (!supabase) {
    return res.json({ items: [], message: 'Supabase not configured' });
  }

  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ items: data });
});

app.post('/api/marketplace', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not connected' });
  }

  const { user_id, title, description, category, listing_type, price, location, image_url } = req.body;
  const { data, error } = await supabase
    .from('marketplace_items')
    .insert([
      {
        user_id,
        title,
        description,
        category,
        listing_type,
        price: listing_type === 'sell' ? price : 0,
        location,
        image_url,
        status: 'pending', // pending admin approval
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ item: data[0] });
});

// -------------------------------------------------------------
// 4. Carbon Footprint Logging Endpoint
// -------------------------------------------------------------
app.post('/api/carbon-logs', async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase not connected' });
  }

  const { user_id, transport_km, transport_mode, electricity_kwh, waste_kg, diet_type, total_co2e_kg } = req.body;
  const { data, error } = await supabase
    .from('carbon_logs')
    .insert([
      {
        user_id,
        transport_km,
        transport_mode,
        electricity_kwh,
        waste_kg,
        diet_type,
        total_co2e_kg,
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ log: data[0] });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Terra AI API running on http://127.0.0.1:${port}`);
});
