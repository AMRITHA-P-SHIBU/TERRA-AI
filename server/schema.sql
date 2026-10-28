-- ====================================================================
-- TERRA AI (EcoSphere AI) DATABASE SCHEMA FOR SUPABASE
-- Run this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste & Run
-- ====================================================================

-- 1. Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 2. User Profiles Table (Linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  role text default 'user' check (role in ('user', 'admin')),
  eco_points integer default 0,
  eco_level integer default 1,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- Trigger to auto-create profile on Supabase auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. GreenFeed Posts (Social & Community Feed)
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  caption text not null,
  image_url text,
  category text default 'other' check (
    category in (
      'tree_planting',
      'waste_cleanup',
      'recycling',
      'energy_saving',
      'sustainable_transport',
      'organic_gardening',
      'upcycling',
      'other'
    )
  ),
  eco_points_awarded integer default 15,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 4. Post Likes & Comments
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  comment text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 5. Eco Exchange Hub (Marketplace)
create table if not exists public.marketplace_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  category text not null check (
    category in (
      'plant_pots',
      'plants_seeds',
      'recycled_crafts',
      'coconut_products',
      'compost_bins',
      'gardening_tools',
      'reusable_items',
      'other'
    )
  ),
  listing_type text not null check (listing_type in ('sell', 'buy', 'donate', 'exchange')),
  price numeric(10, 2) default 0.00,
  location text not null,
  image_url text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 6. Carbon Footprint Logs
create table if not exists public.carbon_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  transport_km numeric default 0,
  transport_mode text default 'car',
  electricity_kwh numeric default 0,
  waste_kg numeric default 0,
  diet_type text default 'average' check (diet_type in ('meat_heavy', 'average', 'vegetarian', 'vegan')),
  total_co2e_kg numeric not null,
  reduction_recommendations jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 7. Gamification: Badges & User Badges
create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  points_required integer default 0
);

create table if not exists public.user_badges (
  user_id uuid references public.profiles(id) on delete cascade not null,
  badge_id text references public.badges(id) on delete cascade not null,
  earned_at timestamptz default timezone('utc'::text, now()) not null,
  primary key (user_id, badge_id)
);

-- Insert default starter badges
insert into public.badges (id, name, description, icon, points_required)
values
  ('seedling', 'Green Seedling', 'Joined the Terra AI community', '🌱', 0),
  ('eco_warrior', 'Eco Warrior', 'Earned 50 EcoPoints through green actions', '🛡️', 50),
  ('clean_champion', 'Clean Champion', 'Shared a waste cleanup or recycling action', '♻️', 100),
  ('carbon_cutter', 'Carbon Cutter', 'Calculated carbon footprint and logged lower emissions', '📉', 150),
  ('circular_hero', 'Circular Hero', 'Listed or exchanged an eco-friendly item in the Hub', '🔄', 200)
on conflict (id) do nothing;

-- 8. AI Assistant Chat History
create table if not exists public.ai_chat_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  prompt text not null,
  response text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 9. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.marketplace_items enable row level security;
alter table public.carbon_logs enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.ai_chat_logs enable row level security;

-- Basic Public Access Policies (can be refined as authentication expands)
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

create policy "Approved posts are viewable by everyone" on public.posts for select using (status = 'approved' or auth.uid() = user_id);
create policy "Authenticated users can create posts" on public.posts for insert with check (auth.role() = 'authenticated');
create policy "Users can update their own posts" on public.posts for update using (auth.uid() = user_id);

create policy "Marketplace items are viewable" on public.marketplace_items for select using (status = 'approved' or auth.uid() = user_id);
create policy "Users can create marketplace items" on public.marketplace_items for insert with check (auth.role() = 'authenticated');

create policy "Users can view their own carbon logs" on public.carbon_logs for select using (auth.uid() = user_id);
create policy "Users can insert their own carbon logs" on public.carbon_logs for insert with check (auth.uid() = user_id);

create policy "Badges are viewable by everyone" on public.badges for select using (true);
create policy "User badges are viewable by everyone" on public.user_badges for select using (true);
