-- ==========================================
-- STEP 1: FIX PRODUCTION_JOURNALIER TYPES
-- ==========================================

-- Ensure production_journalier columns support decimals
ALTER TABLE public.production_journalier 
  ALTER COLUMN project_m2 TYPE numeric USING project_m2::numeric,
  ALTER COLUMN pressage_m2 TYPE numeric USING pressage_m2::numeric,
  ALTER COLUMN emaillage_m2 TYPE numeric USING emaillage_m2::numeric,
  ALTER COLUMN choix_1_m2 TYPE numeric USING choix_1_m2::numeric,
  ALTER COLUMN choix_2_m2 TYPE numeric USING choix_2_m2::numeric,
  ALTER COLUMN choix_3_m2 TYPE numeric USING choix_3_m2::numeric,
  ALTER COLUMN total_m2 TYPE numeric USING total_m2::numeric;

-- Handle potential casing variations from manual UI creation
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_journalier' AND column_name = 'Project_m2') THEN
    ALTER TABLE public.production_journalier ALTER COLUMN "Project_m2" TYPE numeric USING "Project_m2"::numeric;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'production_journalier' AND column_name = 'Emaillage_m2') THEN
    ALTER TABLE public.production_journalier ALTER COLUMN "Emaillage_m2" TYPE numeric USING "Emaillage_m2"::numeric;
  END IF;
END $$;


-- ==========================================
-- STEP 2: FIX INTERVENTIONS SCHEMA
-- ==========================================

-- Add missing columns to interventions table
ALTER TABLE public.interventions 
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS date_intervention DATE,
ADD COLUMN IF NOT EXISTS heure_demande TIME,
ADD COLUMN IF NOT EXISTS equipe TEXT,
ADD COLUMN IF NOT EXISTS visa_demandeur TEXT,
ADD COLUMN IF NOT EXISTS intervenants JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS arret_cpmp NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS arret_cpr NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS arret_cle NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS arret_ccu NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS arret_csl NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_arret NUMERIC DEFAULT 0;
