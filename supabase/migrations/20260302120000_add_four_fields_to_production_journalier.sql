ALTER TABLE public.production_journalier
ADD COLUMN four_minutes_vides NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN four_consommation_kwh NUMERIC NOT NULL DEFAULT 0;

