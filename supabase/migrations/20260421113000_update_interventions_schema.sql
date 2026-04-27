-- Migration to remove visa_demandeur and clean up intervenants JSONB

-- 1. Remove 'visa' property from all objects in the 'intervenants' JSONB array
UPDATE public.interventions
SET intervenants = (
  SELECT jsonb_agg(elem - 'visa')
  FROM jsonb_array_elements(intervenants) AS elem
)
WHERE intervenants IS NOT NULL AND jsonb_array_length(intervenants) > 0;

-- 2. Drop the 'visa_demandeur' column and add 'nom_demandeur' column
ALTER TABLE public.interventions DROP COLUMN IF EXISTS visa_demandeur;
ALTER TABLE public.interventions ADD COLUMN IF NOT EXISTS nom_demandeur TEXT;
