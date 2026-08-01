-- Task 14: settings.tax_enabled gate (default off)
-- Gates upcoming sales-tax collection (Tasks 15-16). Stays OFF for live
-- customers until the owner explicitly enables it via the DB.
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT false;
