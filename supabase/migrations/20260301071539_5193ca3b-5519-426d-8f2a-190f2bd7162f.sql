
-- Create production_selection table
CREATE TABLE public.production_selection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  groupe TEXT NOT NULL,
  horaire TEXT NOT NULL,
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  chef_equipe TEXT NOT NULL,
  modele TEXT NOT NULL,
  couleur TEXT NOT NULL,
  format TEXT NOT NULL,
  numero_rapport TEXT,
  zone_presse NUMERIC NOT NULL DEFAULT 0,
  zone_projecta NUMERIC NOT NULL DEFAULT 0,
  zone_four NUMERIC NOT NULL DEFAULT 0,
  choix_1_m2 NUMERIC NOT NULL DEFAULT 0,
  choix_1_taux NUMERIC NOT NULL DEFAULT 0,
  choix_2_m2 NUMERIC NOT NULL DEFAULT 0,
  choix_2_taux NUMERIC NOT NULL DEFAULT 0,
  choix_3_m2 NUMERIC NOT NULL DEFAULT 0,
  choix_3_taux NUMERIC NOT NULL DEFAULT 0,
  calibre_taux NUMERIC NOT NULL DEFAULT 0,
  calibre_cause TEXT,
  planeite_taux NUMERIC NOT NULL DEFAULT 0,
  planeite_cause TEXT,
  operateur_aspect_taux NUMERIC NOT NULL DEFAULT 0,
  operateur_aspect_cause TEXT,
  tonalite_taux NUMERIC NOT NULL DEFAULT 0,
  tonalite_cause TEXT,
  duree_vide_maintenance NUMERIC NOT NULL DEFAULT 0,
  intervention_maintenance TEXT,
  duree_vide_production NUMERIC NOT NULL DEFAULT 0,
  intervention_production TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_selection_entry UNIQUE (date, groupe, horaire)
);

-- Create production_arrets_zone table
CREATE TABLE public.production_arrets_zone (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  selection_id UUID NOT NULL REFERENCES public.production_selection(id) ON DELETE CASCADE,
  zone TEXT NOT NULL,
  intervention_cause TEXT,
  duree_min NUMERIC NOT NULL DEFAULT 0,
  vide_four BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_selection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_arrets_zone ENABLE ROW LEVEL SECURITY;

-- RLS policies for production_selection
CREATE POLICY "Allow public read production_selection" ON public.production_selection FOR SELECT USING (true);
CREATE POLICY "Allow public insert production_selection" ON public.production_selection FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update production_selection" ON public.production_selection FOR UPDATE USING (true);
CREATE POLICY "Allow public delete production_selection" ON public.production_selection FOR DELETE USING (true);

-- RLS policies for production_arrets_zone
CREATE POLICY "Allow public read production_arrets_zone" ON public.production_arrets_zone FOR SELECT USING (true);
CREATE POLICY "Allow public insert production_arrets_zone" ON public.production_arrets_zone FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update production_arrets_zone" ON public.production_arrets_zone FOR UPDATE USING (true);
CREATE POLICY "Allow public delete production_arrets_zone" ON public.production_arrets_zone FOR DELETE USING (true);
