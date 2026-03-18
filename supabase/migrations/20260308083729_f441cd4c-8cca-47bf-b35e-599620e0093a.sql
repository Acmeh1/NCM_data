
ALTER TABLE public.stats_linea DROP COLUMN IF EXISTS ecart_rendement_pourcentage;
ALTER TABLE public.stats_linea DROP COLUMN IF EXISTS production_hyp_m2;
ALTER TABLE public.stats_linea ADD COLUMN IF NOT EXISTS machine_allumee numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stats_linea ADD COLUMN IF NOT EXISTS machine_en_marche numeric NOT NULL DEFAULT 0;
