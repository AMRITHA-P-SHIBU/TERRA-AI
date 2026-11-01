import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { GoogleGenAI } from '@google/genai';
import { supabase, supabaseAdmin, checkSupabaseConnection } from './supabase.js';
import { testConnection } from './config/database.js';
import { authenticate } from './middleware/authenticate.js';
import { resolveProfileScope } from './services/profileScope.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import socialRoutes from './routes/socialRoutes.js';
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

// -------------------------------------------------------------
// Public Stats Endpoint (Platform User & Org Counts)
// -------------------------------------------------------------
app.get('/api/stats/public', async (_req, res) => {
  try {
    const { data: users, error: uErr } = await supabase
      .from('users')
      .select('account_type');

    if (uErr) throw new Error(uErr.message);

    const individualCount = (users || []).filter(u => u.account_type === 'INDIVIDUAL').length;
    const orgUserCount = (users || []).filter(u => u.account_type === 'ORG_ADMIN').length;
    const totalUsers = (users || []).length;

    const { data: orgs, error: oErr } = await supabase
      .from('organizations')
      .select('id, approval_status');

    const totalOrgs = (orgs || []).length;
    const approvedOrgs = (orgs || []).filter(o => o.approval_status === 'APPROVED').length;

    return res.json({
      individualCount,
      orgUserCount,
      totalUsers,
      totalOrgs,
      approvedOrgs,
    });
  } catch (err) {
    console.error('[Public Stats Error]:', err.message);
    // Safe baseline fallback
    return res.json({
      individualCount: 5,
      orgUserCount: 1,
      totalUsers: 6,
      totalOrgs: 1,
      approvedOrgs: 1,
    });
  }
});
});

// -------------------------------------------------------------
// Authentication & RBAC Routes
// -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', socialRoutes);

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

app.get('/api/marketplace', authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    const scope = await resolveProfileScope(req.user.id);
    if (!scope) return res.status(403).json({ error: 'An active user profile is required.' });

    const applyScope = (builder) => {
      const scoped = builder.eq('author_scope', scope.authorScope);
      return scope.organizationId ? scoped.eq('organization_id', scope.organizationId) : scoped.is('organization_id', null);
    };
    const [approved, own] = await Promise.all([
      applyScope(supabaseAdmin.from('marketplace_items').select('*').eq('status', 'approved'))
        .order('created_at', { ascending: false }),
      applyScope(supabaseAdmin.from('marketplace_items').select('*').eq('user_id', req.user.id))
        .order('created_at', { ascending: false }),
    ]);
    if (approved.error) throw new Error(approved.error.message);
    if (own.error) throw new Error(own.error.message);

    const byId = new Map([...(approved.data || []), ...(own.data || [])].map((item) => [item.id, item]));
    const items = [...byId.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const userIds = [...new Set(items.map((item) => item.user_id))];
    const { data: authors, error: authorsError } = userIds.length
      ? await supabaseAdmin.from('users').select('id, full_name, email').in('id', userIds)
      : { data: [], error: null };
    if (authorsError) throw new Error(authorsError.message);
    const authorMap = new Map((authors || []).map((author) => [author.id, author]));
    return res.json({
      items: items.map((item) => {
        const author = authorMap.get(item.user_id);
        return { ...item, profiles: author ? { full_name: author.full_name, username: author.email } : null };
      }),
    });
  } catch (error) {
    console.error('[Marketplace Feed Error]:', error);
    return res.status(500).json({ error: 'Failed to load scoped marketplace activities.' });
  }
});

app.post('/api/marketplace', authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    const scope = await resolveProfileScope(req.user.id);
    if (!scope) return res.status(403).json({ error: 'An active user profile is required.' });
    const { title, description, category, listing_type, price, location, image_url } = req.body;
    const { data, error } = await supabaseAdmin.from('marketplace_items').insert({
      user_id: req.user.id,
      author_scope: scope.authorScope,
      organization_id: scope.organizationId,
      title,
      description,
      category,
      listing_type,
      price: listing_type === 'sell' ? price : 0,
      location,
      image_url,
      status: 'pending',
    }).select().single();
    if (error) throw new Error(error.message);
    return res.status(201).json({ item: data });
  } catch (error) {
    console.error('[Create Marketplace Item Error]:', error);
    return res.status(500).json({ error: 'Failed to create marketplace activity.' });
  }
});

app.post('/api/carbon-logs', authenticate, async (req, res) => {
  try {
    if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase is not configured.' });
    const scope = await resolveProfileScope(req.user.id);
    if (!scope) return res.status(403).json({ error: 'An active user profile is required.' });
    const { transport_km, transport_mode, electricity_kwh, waste_kg, diet_type, total_co2e_kg } = req.body;
    const { data, error } = await supabaseAdmin.from('carbon_logs').insert({
      user_id: req.user.id,
      author_scope: scope.authorScope,
      organization_id: scope.organizationId,
      transport_km,
      transport_mode,
      electricity_kwh,
      waste_kg,
      diet_type,
      total_co2e_kg,
    }).select().single();
    if (error) throw new Error(error.message);
    return res.status(201).json({ log: data });
  } catch (error) {
    console.error('[Create Carbon Log Error]:', error);
    return res.status(500).json({ error: 'Failed to create carbon activity.' });
  }
});

// Global 404 handler for API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Server Error]:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Uploaded media exceeds the 50 MB limit.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Upload one media file at a time.' });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred on the server',
  });
});

export default app;
