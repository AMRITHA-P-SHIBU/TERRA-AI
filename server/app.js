import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GoogleGenAI } from '@google/genai';
import { supabase, checkSupabaseConnection } from './supabase.js';
import { testConnection } from './config/database.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { seedSuperAdmin } from './scripts/seedSuperAdmin.js';

export const app = express();

// Ensure Super Admin exists
seedSuperAdmin().catch((err) => console.error('[AutoSeed Error]:', err.message));

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows cross-origin API interactions in dev
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration supporting cookies from client
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Cookie Parser & Body Parsers
app.use(cookieParser(process.env.COOKIE_SECRET || 'terra_ai_cookie_signing_secret_phrase'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -------------------------------------------------------------
// Core System Health Endpoint
// -------------------------------------------------------------
app.get('/api/health', async (_request, response) => {
  const supabaseStatus = await checkSupabaseConnection();
  const dbStatus = await testConnection();
  const geminiApiKey = process.env.GEMINI_API_KEY;

  response.json({
    status: 'ok',
    service: 'terra-ai-api',
    authSystem: 'active',
    database: dbStatus,
    supabase: supabaseStatus,
    aiConfigured: Boolean(geminiApiKey),
  });
});

// -------------------------------------------------------------
// Authentication & RBAC Routes
// -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/admin', adminRoutes);

// -------------------------------------------------------------
// Existing Terra AI Services (AI Assistant, GreenFeed, Marketplace)
// -------------------------------------------------------------
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (ai) {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: `You are Terra AI, an intelligent, inspiring, and practical environmental management and sustainable living assistant. Format your responses using clear markdown.`,
        },
      });

      return res.json({
        reply: result.text,
        source: 'gemini-api',
      });
    }

    const query = prompt.toLowerCase();
    let reply = `### Personalized Sustainability Advice 🌿:\n\nThank you for asking about **"${prompt}"**!\n\nTo make this habit stick:\n1. **Start Small**: Substitute one disposable item this week.\n2. **Engage Locally**: Explore the Eco Exchange Hub to borrow or exchange tools.\n3. **Track Your Impact**: Log your activity on GreenFeed to earn EcoPoints!`;

    if (query.includes('compost') || query.includes('smell') || query.includes('balcony')) {
      reply = `### How to maintain an odor-free balcony compost bin 🪴:\n\n1. **The 3:1 Brown to Green Ratio**: Always add 3 parts browns for every 1 part greens.\n2. **Avoid Cooked Food & Dairy**.\n3. **Weekly Aeration**: Stir the pile once a week.`;
    }

    return res.json({
      reply,
      source: 'knowledge-engine',
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: 'Failed to generate sustainability advice' });
  }
});

app.get('/api/posts', async (_req, res) => {
  if (!supabase) return res.json({ posts: [] });
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: data });
});

app.post('/api/posts', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not connected' });
  const { user_id, caption, category, image_url } = req.body;
  const { data, error } = await supabase
    .from('posts')
    .insert([{ user_id, caption, category, image_url, status: 'pending', eco_points_awarded: 25 }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ post: data[0] });
});

app.get('/api/marketplace', async (_req, res) => {
  if (!supabase) return res.json({ items: [] });
  const { data, error } = await supabase
    .from('marketplace_items')
    .select('*, profiles(username, full_name, avatar_url)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ items: data });
});

app.post('/api/marketplace', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not connected' });
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
        status: 'pending',
      },
    ])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ item: data[0] });
});

app.post('/api/carbon-logs', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: 'Supabase not connected' });
  const { user_id, transport_km, transport_mode, electricity_kwh, waste_kg, diet_type, total_co2e_kg } = req.body;
  const { data, error } = await supabase
    .from('carbon_logs')
    .insert([{ user_id, transport_km, transport_mode, electricity_kwh, waste_kg, diet_type, total_co2e_kg }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ log: data[0] });
});

// Global 404 handler for API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Server Error]:', err);
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred on the server',
  });
});

export default app;
