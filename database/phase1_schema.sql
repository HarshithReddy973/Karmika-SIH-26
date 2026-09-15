-- ============================================================
-- PHASE 1 SCHEMA — Cooperative Gig Services Platform
-- Paste this ENTIRE file into: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. Enable PostGIS (needed for geo-matching in Phase 3, safe to enable now)
create extension if not exists postgis;

-- 2. USERS table
--    Note: Supabase Auth already has its own internal "auth.users" table
--    for login credentials. This "users" table is OUR profile table,
--    linked 1-to-1 with auth.users via the same id.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('customer', 'worker', 'admin')) default 'customer',
  language_pref text default 'en',
  created_at timestamptz default now()
);

-- 3. SERVICES table (service categories offered on the platform)
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  base_price numeric not null default 0,
  created_at timestamptz default now()
);

-- 4. WORKER_PROFILES table (extra info only workers have)
create table if not exists public.worker_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  skills text[] default '{}',
  certification_url text,
  verified boolean default false,
  rating_avg numeric default 0,
  jobs_this_week integer default 0,
  is_available boolean default true,
  location geography(Point, 4326), -- used from Phase 3 onward
  created_at timestamptz default now()
);

-- 5. BOOKINGS table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.users(id) not null,
  worker_id uuid references public.users(id), -- null until matched/accepted
  service_id uuid references public.services(id) not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'in_progress', 'completed', 'confirmed', 'cancelled')),
  location geography(Point, 4326), -- customer's job location
  scheduled_time timestamptz,
  is_emergency boolean default false,
  created_at timestamptz default now()
);

-- 6. RATINGS table
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- 7. WELFARE_CONTRIBUTIONS table (Phase 7, created now so schema is ready)
create table if not exists public.welfare_contributions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references public.users(id) not null,
  booking_id uuid references public.bookings(id) not null,
  amount numeric not null,
  created_at timestamptz default now()
);

-- ============================================================
-- SEED DATA (a few sample services so Phase 2's Browse Services
-- page has something to display immediately)
-- ============================================================
insert into public.services (name, category, base_price) values
  ('Electrician Visit', 'electrician', 300),
  ('Plumbing Repair', 'plumber', 350),
  ('Home Cleaning', 'cleaning', 500),
  ('Furniture Carpentry', 'carpenter', 400),
  ('House Painting (per room)', 'painter', 1500),
  ('Elderly Caregiving (per day)', 'caregiver', 800)
on conflict do nothing;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- IMPORTANT FOR BEGINNERS: RLS is left OFF on purpose for now.
-- Build and test all features first with RLS off. Only turn RLS on
-- and add policies once your core features work end-to-end and you
-- are preparing your final demo. Turning RLS on too early is the
-- #1 cause of confusing "no data showing up" bugs for beginner teams.
--
-- When you ARE ready (Phase 8), come back and run something like:
--
-- alter table public.users enable row level security;
-- create policy "Users can read own profile" on public.users
--   for select using (auth.uid() = id);
-- (similar policies for bookings, worker_profiles, etc.)
-- ============================================================
