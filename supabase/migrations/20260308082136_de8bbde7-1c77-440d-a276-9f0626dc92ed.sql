
-- Add date column to production_emballage (populated from parent production_journalier)
ALTER TABLE public.production_emballage ADD COLUMN IF NOT EXISTS date text;

-- Add date column to production_arrets_zone (populated from parent production_selection)
ALTER TABLE public.production_arrets_zone ADD COLUMN IF NOT EXISTS date text;

-- Add date column to stats_linea (populated from parent production_journalier)
ALTER TABLE public.stats_linea ADD COLUMN IF NOT EXISTS date text;

-- Populate date in production_emballage from production_journalier
UPDATE public.production_emballage e
SET date = j.date
FROM public.production_journalier j
WHERE e.journalier_id = j.id;

-- Populate date in production_arrets_zone from production_selection
UPDATE public.production_arrets_zone a
SET date = s.date
FROM public.production_selection s
WHERE a.selection_id = s.id;

-- Populate date in stats_linea from production_journalier
UPDATE public.stats_linea sl
SET date = j.date
FROM public.production_journalier j
WHERE sl.production_id = j.id;
