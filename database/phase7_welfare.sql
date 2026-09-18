-- ============================================================
-- PHASE 7 SCHEMA ADDITION — Worker Welfare Module
-- Paste into Supabase SQL Editor -> New Query -> Run
-- ============================================================

-- The welfare_contributions table and the bookings.status "confirmed"
-- value already existed since Phase 1 - this migration only adds the
-- one new field needed for the e-Shram / insurance status display.
alter table public.worker_profiles add column if not exists e_shram_number text;

-- No other schema changes needed for Phase 7:
-- - welfare_contributions rows are now written by the app itself
--   (Payment Summary page, Phase 6) whenever a customer pays.
-- - The Admin Dashboard's Welfare Fund tab (Phase 4) already reads
--   from this table - it will start showing real numbers as soon as
--   your team completes a booking and pays for it end-to-end.
