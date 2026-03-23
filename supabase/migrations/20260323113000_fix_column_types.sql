-- Fix column types for production_journalier to support decimals
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
