ALTER TABLE public.loyalty_rules
ADD COLUMN IF NOT EXISTS pour_points_enabled boolean NOT NULL DEFAULT true;
