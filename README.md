# Terra AI (EcoSphere AI) 🌿
### AI-Powered Sustainable Living and Environmental Management Platform

Terra AI is a web-based platform integrating social networking, community-driven circular economy, carbon footprint monitoring, and intelligent sustainability guidance.

---

## 🌟 Core Features & Modules

1. **🌿 GreenFeed (Social & Community Feed)**
   - Share and discover verified eco-friendly activities (tree planting, beach/lake cleanups, composting, upcycling, green travel).
   - Category filtering, post likes, comments, and locations.
   - Earn **+25 EcoPoints** for every verified action.

2. **🔄 Eco Exchange Hub (Circular Economy Marketplace)**
   - Local buy, sell, exchange, or donate pre-loved and eco-friendly products.
   - Tailored categories: Coconut crafts, plant pots, compost bins, organic seeds, gardening tools.
   - Direct inquiry messaging with item owners to keep materials out of landfills.

3. **📊 Carbon Footprint Calculator**
   - Standard GHG emission factor calculations based on lifestyle choices:
     - Mobility: Petrol, Diesel, EV, Bus, Metro, Cycling.
     - Household Electricity: Monthly kWh consumption.
     - Diet: Vegan, Vegetarian, Omnivore, Meat-Heavy.
     - Waste Diversion: Composting & recycling credits.
   - Live visual emission breakdown vs. national and global benchmarks.
   - Actionable AI-driven reduction recommendations.

4. **🤖 AI Eco Assistant**
   - Powered by Google Gemini 2.5 Flash via `@google/genai` (with smart offline knowledge engine fallback).
   - Instant guidance on composting ratios, zero-waste swaps, coconut upcycling, and energy efficiency.

5. **🏆 EcoPoints, Badges & Leaderboard**
   - Gamification engine with level progression and achievement badges (Green Seedling, Eco Warrior, Clean Champion, Circular Hero, Carbon Cutter, Compost Master).
   - Real-time community leaderboard ranking top sustainability champions.

6. **🛡️ Admin Moderation Portal**
   - Quality control workflow: 1-click Approve or Reject for pending GreenFeed posts and marketplace listings.

---

## 🚀 Quick Start Guide

### 1. Database Setup (Supabase)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and click **SQL Editor** on the left menu.
3. Open `server/schema.sql` from this repository, copy all the SQL code, paste it into the editor, and click **Run**.
4. This creates all necessary tables (`profiles`, `posts`, `marketplace_items`, `carbon_logs`, `badges`, `user_badges`), triggers, starter badges, and Row Level Security policies!

### 2. Configure Environment Variables
Inside `server/`, create a `.env` file using the provided template:
```bash
cd server
copy .env.example .env   # On Windows
# or: cp .env.example .env (Linux/macOS)
```
Add your keys in `server/.env`:
```env
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 3. Start the Backend API
```bash
cd server
npm install
npm run dev
```
Runs at `http://127.0.0.1:3000`.

### 4. Start the Frontend Client
```bash
cd client
npm install
npm run dev
```
Opens in your browser at `http://localhost:5173`.
