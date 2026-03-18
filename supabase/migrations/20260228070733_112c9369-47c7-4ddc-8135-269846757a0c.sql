
ALTER TABLE public.production_journalier
ADD COLUMN choix_1_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN choix_2_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN choix_3_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN total_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN pressage_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN emaillage_m2 numeric NOT NULL DEFAULT 0,
ADD COLUMN cycle_min numeric NOT NULL DEFAULT 0;
