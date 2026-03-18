CREATE TABLE public.stats_linea (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_id UUID NOT NULL REFERENCES public.production_journalier(id) ON DELETE CASCADE,

  -- Section 2: Production & Tri (Choix 1/2/3)
  choix1_pieces NUMERIC NOT NULL DEFAULT 0,
  choix1_surface_m2 NUMERIC NOT NULL DEFAULT 0,
  choix1_pourcentage NUMERIC NOT NULL DEFAULT 0,
  choix2_pieces NUMERIC NOT NULL DEFAULT 0,
  choix2_surface_m2 NUMERIC NOT NULL DEFAULT 0,
  choix2_pourcentage NUMERIC NOT NULL DEFAULT 0,
  choix3_pieces NUMERIC NOT NULL DEFAULT 0,
  choix3_surface_m2 NUMERIC NOT NULL DEFAULT 0,
  choix3_pourcentage NUMERIC NOT NULL DEFAULT 0,
  total_pieces NUMERIC NOT NULL DEFAULT 0,
  total_surface_m2 NUMERIC NOT NULL DEFAULT 0,

  -- Section 3: Analyse Qualité
  defaut_operateur_pieces NUMERIC NOT NULL DEFAULT 0,
  defaut_operateur_pourcentage NUMERIC NOT NULL DEFAULT 0,
  defaut_planar_pieces NUMERIC NOT NULL DEFAULT 0,
  defaut_planar_pourcentage NUMERIC NOT NULL DEFAULT 0,
  defaut_calibre_pieces NUMERIC NOT NULL DEFAULT 0,
  defaut_calibre_pourcentage NUMERIC NOT NULL DEFAULT 0,

  -- Section 4: Minutes (Performance)
  minutes_absence_alimentation NUMERIC NOT NULL DEFAULT 0,
  minutes_machine_on NUMERIC NOT NULL DEFAULT 0,
  minutes_urgence_manuelle NUMERIC NOT NULL DEFAULT 0,
  minutes_machine_saturee NUMERIC NOT NULL DEFAULT 0,
  minutes_total_machine NUMERIC NOT NULL DEFAULT 0,

  -- Section 5: Enquêtes statistiques (Rendement)
  vitesse_moyenne_pieces_min NUMERIC NOT NULL DEFAULT 0,
  production_hyp_m2 NUMERIC NOT NULL DEFAULT 0,
  production_reelle_m2 NUMERIC NOT NULL DEFAULT 0,
  ecart_rendement_pourcentage NUMERIC NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stats_linea ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read stats_linea" ON public.stats_linea FOR SELECT USING (true);
CREATE POLICY "Allow public insert stats_linea" ON public.stats_linea FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update stats_linea" ON public.stats_linea FOR UPDATE USING (true);
CREATE POLICY "Allow public delete stats_linea" ON public.stats_linea FOR DELETE USING (true);

