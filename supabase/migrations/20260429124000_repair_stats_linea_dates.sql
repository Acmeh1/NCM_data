
-- Migration 20260429124000: Repair stats_linea production_date column
-- This migration ensures all existing stats_linea records have a production_date 
-- synchronized from the parent production_journalier table.

-- 1. Ensure the column exists (it should, based on recent kpis migrations)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stats_linea' AND column_name = 'production_date') THEN
    ALTER TABLE public.stats_linea ADD COLUMN production_date TEXT;
  END IF;
END $$;

-- 2. Populate missing production_date from production_journalier
UPDATE public.stats_linea sl
SET production_date = j.date
FROM public.production_journalier j
WHERE sl.production_id = j.id
AND (sl.production_date IS NULL OR sl.production_date = '');

-- 3. (Optional but recommended) Add an index on production_date for dashboard performance
CREATE INDEX IF NOT EXISTS idx_stats_linea_production_date ON public.stats_linea(production_date);
