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
import carbonRoutes from './routes/carbonRoutes.js';
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

// -------------------------------------------------------------
// Authentication & RBAC Routes
// -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', socialRoutes);
app.use('/api/carbon', carbonRoutes);

// -------------------------------------------------------------
// Existing Terra AI Services (AI Assistant, GreenFeed, Marketplace)
// -------------------------------------------------------------
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (ai) {
      // Build conversation contents with history for context
      const contents = [];
      if (Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents,
        config: {
          systemInstruction: 'You are Terra AI, an intelligent, inspiring, and practical environmental sustainability assistant built into the Terra AI platform. You help users with carbon footprint reduction, recycling, composting, waste management, renewable energy, energy efficiency, water conservation, sustainable food choices, biodiversity, tree planting, eco-friendly products, and climate change science. Format responses using markdown with headers (###), bold (**text**), numbered lists, and emojis. Be friendly, encouraging, concise, and actionable. When relevant, mention Terra AI platform features like GreenFeed, Eco Exchange Hub, and EcoPoints.',
        },
      });

      return res.json({
        reply: result.text,
        source: 'gemini-api',
      });
    }

    // Enhanced fallback knowledge engine
    const query = prompt.toLowerCase();
    let reply;

    if (query.includes('compost') || query.includes('smell') || query.includes('balcony')) {
      reply = "### How to maintain an odor-free balcony compost bin 🪴\n\n1. **The 3:1 Brown to Green Ratio** — Always add 3 handfuls of browns (dry leaves, cocopeat, crushed egg cartons) for every 1 handful of greens (vegetable peels, tea dregs, fruit scraps). Browns absorb moisture and eliminate odors.\n2. **Avoid Cooked Food & Dairy** — Never put oily curries, bones, meat, or milk products in a basic apartment bin.\n3. **Weekly Aeration** — Stir your compost pile once a week. Anaerobic bacteria produce bad odors; aerating brings good aerobic microbes!\n4. **Use Microbial Inoculant** — A splash of sour buttermilk or bio-inoculant powder accelerates decomposition without odor.\n\n*Pro-tip: Check the **Eco Exchange Hub** to find pre-loved terracotta compost pots!*";
    } else if (query.includes('plastic') || query.includes('alternative') || query.includes('kitchen') || query.includes('waste') || query.includes('recycle')) {
      reply = "### Practical Plastic-Free & Zero-Waste Tips ♻️\n\n1. **Beeswax or Plant-Wax Food Wraps** — Replaces cling wrap. Washable and lasts over a year.\n2. **Stainless Steel or Glass Storage** — Ditch plastic containers to avoid microplastic leaching.\n3. **Natural Loofah & Coconut Coir Scrubbers** — Replace synthetic dish sponges. They biodegrade 100%!\n4. **Cotton / Jute Produce Bags** — Keep 4-5 lightweight cloth bags for market trips.\n5. **Reduce First** — The best waste is waste not created. Repair before replacing.\n\n*Remember: **Reduce → Reuse → Recycle!***";
    } else if (query.includes('coconut') || query.includes('upcycle') || query.includes('craft')) {
      reply = "### Creative Ways to Upcycle Coconut Shells 🥥\n\n1. **Balcony Succulent Planter** — Sand down fibers, drill drainage holes, rub with coconut oil for water resistance.\n2. **Natural Soy Candle Cups** — Secure a cotton wick and pour melted soy wax with essential oils.\n3. **Zero-Waste Soap Dish** — Cut in half and drill small drainage holes.\n4. **Organic Seed Starter Bowls** — Use as biodegradable seedling pots. Plant the entire shell into soil!\n\n*Share your craft on **GreenFeed** to earn +25 EcoPoints!*";
    } else if (query.includes('energy') || query.includes('electricity') || query.includes('solar') || query.includes('ac')) {
      reply = "### Smart Ways to Cut Electricity & Emissions ⚡\n\n1. **The 24°C AC Rule** — Setting AC at 24°C instead of 18°C saves 20-30% electricity.\n2. **5-Star Inverter Appliances** — BLDC motor fans cut power draw from 75W to 28W.\n3. **Phantom Load Elimination** — Standby electronics consume up to 8% of residential power.\n4. **Rooftop Solar** — Even a 2kW system offsets ~240 units/month, eliminating ~2 tons CO₂/year.\n5. **LED Lighting** — Uses 75% less energy than incandescent bulbs.\n\n*Track your energy savings on the **Carbon Calculator**!*";
    } else if (query.includes('water') || query.includes('conservation')) {
      reply = "### Water Conservation Tips 💧\n\n1. **Fix Leaks** — A dripping faucet wastes 3,000+ gallons per year.\n2. **Short Showers** — Aim for 5 minutes or less.\n3. **Rain Collection** — Use rain barrels for garden watering.\n4. **Native Plants** — They need significantly less watering.\n5. **Full Loads Only** — Run dishwashers and washers with full loads.\n\n*Every drop counts for a sustainable future!*";
    } else if (query.includes('carbon') || query.includes('footprint') || query.includes('emission')) {
      reply = "### Reducing Your Carbon Footprint 🌱\n\n1. **Transportation** — Walk, bike, or use public transit. Carpool when driving.\n2. **Energy** — Switch to renewable energy sources and efficient appliances.\n3. **Diet** — Eat more plant-based meals. Food production accounts for ~26% of global emissions.\n4. **Shopping** — Buy local, buy less, and choose sustainable brands.\n5. **Home** — Improve insulation and use energy-efficient appliances.\n\nThe average person's footprint is ~4 tons CO₂/year. These changes can cut it by **50%**!\n\n*Use the **Carbon Calculator** to track your progress!*";
    } else if (query.includes('tree') || query.includes('plant') || query.includes('forest') || query.includes('biodiversity')) {
      reply = "### The Power of Trees & Biodiversity 🌳\n\n1. One tree absorbs ~**22kg of CO₂** per year.\n2. Trees provide oxygen, shade, habitat, and flood prevention.\n3. **Plant native species** for best ecosystem results.\n4. Support reforestation and afforestation projects.\n5. Protect existing forests — deforestation is a leading cause of climate change.\n\n*Planting trees is one of the most effective climate solutions available!*";
    } else if (query.includes('food') || query.includes('diet') || query.includes('eat') || query.includes('vegan') || query.includes('meat')) {
      reply = "### Sustainable Eating Guide 🥗\n\n1. **Eat More Plants** — Plant-based meals have significantly lower carbon footprints.\n2. **Buy Local & Seasonal** — Less transport emissions, fresher food.\n3. **Reduce Food Waste** — Plan meals ahead and use leftovers creatively.\n4. **Grow Your Own** — Even herbs on a windowsill make a difference.\n5. **Choose Sustainable Seafood** — Check certifications before buying.\n\n*Food production accounts for ~**26% of global emissions**. Your plate is your power!*";
    } else if (query.includes('hello') || query.includes('hi') || query.includes('hey') || query.includes('help')) {
      reply = "### 👋 Welcome to Terra AI!\n\nI'm your personal sustainability assistant. I can help you with:\n\n🌱 **Carbon footprint** reduction strategies\n♻️ **Recycling** & waste management\n⚡ **Energy efficiency** & renewables\n💧 **Water conservation** methods\n🌳 **Tree planting** & biodiversity\n🥗 **Sustainable eating** tips\n🥥 **Upcycling** & creative reuse\n🪴 **Composting** guides\n\nJust ask me anything about living more sustainably!";
    } else {
      reply = "### Personalized Sustainability Advice 🌿\n\nThank you for asking about **\"" + prompt.replace(/"/g, '\\"') + "\"**!\n\nHere's how you can take meaningful eco-friendly action:\n\n1. **Start Small** — Sustainable living isn't about perfection; it's about millions making small, conscious choices daily.\n2. **Circular Mindset** — Before buying new, check if you can borrow, repair, or find it on the **Eco Exchange Hub**.\n3. **Track Your Impact** — Log your activities on **GreenFeed** to earn EcoPoints and inspire others!\n4. **Learn & Share** — Knowledge is the first step toward change.\n\nWould you like specific guidance on composting, zero-waste products, energy saving, or calculating your carbon footprint?";
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
