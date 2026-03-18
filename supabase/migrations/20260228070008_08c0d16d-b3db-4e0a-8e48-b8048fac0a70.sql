
-- Table 1: production_journalier
CREATE TABLE public.production_journalier (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  horaire TEXT NOT NULL,
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  groupe TEXT NOT NULL,
  chef_equipe TEXT NOT NULL,
  modele TEXT NOT NULL,
  couleur TEXT NOT NULL,
  format TEXT NOT NULL,
  nb_pieces_four NUMERIC NOT NULL DEFAULT 0,
  surface_car_m2 NUMERIC NOT NULL DEFAULT 0,
  cuisson_m2 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.production_journalier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read production_journalier" ON public.production_journalier FOR SELECT USING (true);
CREATE POLICY "Allow public insert production_journalier" ON public.production_journalier FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update production_journalier" ON public.production_journalier FOR UPDATE USING (true);
CREATE POLICY "Allow public delete production_journalier" ON public.production_journalier FOR DELETE USING (true);

-- Table 2: production_emballage
CREATE TABLE public.production_emballage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journalier_id UUID NOT NULL REFERENCES public.production_journalier(id) ON DELETE RESTRICT,
  choice_type TEXT NOT NULL,
  nb_palette NUMERIC NOT NULL DEFAULT 0,
  surface_par_palette NUMERIC NOT NULL DEFAULT 0,
  surface_totale_m2 NUMERIC NOT NULL DEFAULT 0,
  reste_m2 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.production_emballage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read production_emballage" ON public.production_emballage FOR SELECT USING (true);
CREATE POLICY "Allow public insert production_emballage" ON public.production_emballage FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update production_emballage" ON public.production_emballage FOR UPDATE USING (true);
CREATE POLICY "Allow public delete production_emballage" ON public.production_emballage FOR DELETE USING (true);

-- Storage bucket for SQLite backups
INSERT INTO storage.buckets (id, name, public) VALUES ('database-backups', 'database-backups', true);

CREATE POLICY "Allow public read backups" ON storage.objects FOR SELECT USING (bucket_id = 'database-backups');
CREATE POLICY "Allow service upload backups" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'database-backups');
CREATE POLICY "Allow service delete backups" ON storage.objects FOR DELETE USING (bucket_id = 'database-backups');
