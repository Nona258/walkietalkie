-- Migration: add site scheduling fields
-- Run this in your Supabase SQL editor or psql against the DB

ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS start_time time NULL,
ADD COLUMN IF NOT EXISTS end_time time NULL,
ADD COLUMN IF NOT EXISTS date_accomplished date NULL,
ADD COLUMN IF NOT EXISTS members_count integer NULL;

-- Optional: add a basic index for date_accomplished lookups
CREATE INDEX IF NOT EXISTS idx_sites_date_accomplished ON public.sites USING btree (date_accomplished);

-- Notes:
--  - `start_time` and `end_time` are stored as SQL `time` (no timezone).
--  - `date_accomplished` is stored as `date`.
--  - `members_count` is an integer representing how many employees will be deployed to the site.
-- After running this migration, the frontend will include these fields when inserting/updating `sites`.
