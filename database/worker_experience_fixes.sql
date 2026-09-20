-- ============================================================
-- WORKER EXPERIENCE FIXES — run before Phase 8
-- Paste into Supabase SQL Editor -> New Query -> Run
-- ============================================================

-- Track exactly when a job was accepted and when it was completed,
-- separately from created_at (which is when the CUSTOMER booked it).
-- This is what lets us show "Booked: ... / Accepted: ..." on the
-- worker's job list.
alter table public.bookings add column if not exists accepted_at timestamptz;
alter table public.bookings add column if not exists completed_at timestamptz;

-- ------------------------------------------------------------
-- Replace find_nearby_bookings_for_worker to also return the job's
-- location (lat/lng) and when it was requested (created_at), so the
-- worker's "New Requests" list can show a map link and a timestamp,
-- not just distance.
--
-- Return columns are changing, so we drop and recreate rather than
-- CREATE OR REPLACE (Postgres won't let you change a function's
-- return shape in place).
-- ------------------------------------------------------------
drop function if exists find_nearby_bookings_for_worker(double precision, double precision, integer, text[]);

create function find_nearby_bookings_for_worker(
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
  distance_meters double precision,
  lat double precision,
  lng double precision,
  created_at timestamptz
)
language sql
as $$
  select
    b.id as booking_id,
    s.name as service_name,
    s.category as service_category,
    b.scheduled_time,
    b.is_emergency,
    ST_Distance(b.location, ST_SetSRID(ST_MakePoint(worker_lng, worker_lat), 4326)::geography) as distance_meters,
    b.lat,
    b.lng,
    b.created_at
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
