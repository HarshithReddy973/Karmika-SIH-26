-- ============================================================
-- PHASE 3 SCHEMA ADDITIONS — Geo-Matching Engine
-- Paste this into Supabase SQL Editor -> New Query -> Run
-- (Run this AFTER phase1_schema.sql)
-- ============================================================

-- Plain lat/lng columns alongside the "location" geography column.
-- WHY: geography columns are awkward to read back directly from
-- JS (they come back as WKB hex). Keeping plain numeric lat/lng
-- columns too means your frontend can just read booking.lat /
-- booking.lng directly, while "location" is still used for the
-- actual PostGIS distance queries. Both stay in sync via the
-- functions below - you never need to touch them separately.
alter table public.bookings add column if not exists lat double precision;
alter table public.bookings add column if not exists lng double precision;
alter table public.worker_profiles add column if not exists lat double precision;
alter table public.worker_profiles add column if not exists lng double precision;

-- Speed up geo queries (important once you have many workers/bookings)
create index if not exists worker_profiles_location_idx on public.worker_profiles using gist (location);
create index if not exists bookings_location_idx on public.bookings using gist (location);

-- ------------------------------------------------------------
-- WRITE FUNCTIONS (called from the app to set a location)
-- Beginner note: geography values are awkward to insert directly
-- from JS, so these two functions do the lat/lng -> geography
-- conversion on the database side. The app just calls these with
-- plain numbers.
-- ------------------------------------------------------------

create or replace function set_worker_location(p_lat double precision, p_lng double precision)
returns void
language sql
security definer
as $$
  update public.worker_profiles
  set location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      lat = p_lat,
      lng = p_lng
  where user_id = auth.uid();
$$;

create or replace function set_booking_location(p_booking_id uuid, p_lat double precision, p_lng double precision)
returns void
language sql
security definer
as $$
  update public.bookings
  set location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      lat = p_lat,
      lng = p_lng
  where id = p_booking_id;
$$;

-- ------------------------------------------------------------
-- READ FUNCTIONS (the actual matching engine)
-- ------------------------------------------------------------

-- Given a customer's location + a service category, find nearby
-- VERIFIED, AVAILABLE workers who have that skill, sorted by distance.
-- Called from the customer side (Matched Workers page).
create or replace function find_nearby_workers(
  customer_lat double precision,
  customer_lng double precision,
  radius_meters integer,
  service_category text
)
returns table (
  worker_id uuid,
  full_name text,
  rating_avg numeric,
  jobs_this_week integer,
  distance_meters double precision
)
language sql
as $$
  select
    wp.user_id as worker_id,
    u.full_name,
    wp.rating_avg,
    wp.jobs_this_week,
    ST_Distance(wp.location, ST_SetSRID(ST_MakePoint(customer_lng, customer_lat), 4326)::geography) as distance_meters
  from public.worker_profiles wp
  join public.users u on u.id = wp.user_id
  where wp.verified = true
    and wp.is_available = true
    and wp.location is not null
    and service_category = any(wp.skills)
    and ST_DWithin(
      wp.location,
      ST_SetSRID(ST_MakePoint(customer_lng, customer_lat), 4326)::geography,
      radius_meters
    )
  order by distance_meters asc;
$$;

-- Given a worker's location + their skills array, find nearby PENDING,
-- UNASSIGNED bookings whose service category matches one of their skills,
-- sorted by distance. Called from the worker side (Job Requests page).
create or replace function find_nearby_bookings_for_worker(
  worker_lat double precision,
  worker_lng double precision,
  radius_meters integer,
  worker_skills text[]
)
returns table (
  booking_id uuid,
  service_name text,
  service_category text,
  scheduled_time timestamptz,
  is_emergency boolean,
  distance_meters double precision
)
language sql
as $$
  select
    b.id as booking_id,
    s.name as service_name,
    s.category as service_category,
    b.scheduled_time,
    b.is_emergency,
    ST_Distance(b.location, ST_SetSRID(ST_MakePoint(worker_lng, worker_lat), 4326)::geography) as distance_meters
  from public.bookings b
  join public.services s on s.id = b.service_id
  where b.status = 'pending'
    and b.worker_id is null
    and b.location is not null
    and s.category = any(worker_skills)
    and ST_DWithin(
      b.location,
      ST_SetSRID(ST_MakePoint(worker_lng, worker_lat), 4326)::geography,
      radius_meters
    )
  order by distance_meters asc;
$$;

-- ------------------------------------------------------------
-- ENABLE REALTIME ON THE bookings TABLE
-- Beginner gotcha: tables created via the SQL Editor are NOT
-- automatically added to Supabase's realtime publication, even
-- though the table itself works fine otherwise. Without this line,
-- the Booking Tracker page will only update on manual refresh
-- instead of updating live.
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.bookings;

-- ============================================================
-- Same reminder as Phase 1: RLS stays OFF until Phase 8.
-- The "security definer" on the write functions above just means
-- they run with elevated permission to do the geography conversion -
-- it is NOT related to RLS and does not need RLS to be on.
-- ============================================================
