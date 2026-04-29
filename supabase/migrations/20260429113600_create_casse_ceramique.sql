
-- Migration 20260429113500: Create casse_ceramique table
CREATE TABLE IF NOT EXISTS public.casse_ceramique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  horaire TEXT NOT NULL,
  groupe TEXT NOT NULL,
  chef_equipe TEXT NOT NULL,
  press_kg NUMERIC NOT NULL DEFAULT 0,
  sortie_sechoir_kg NUMERIC NOT NULL DEFAULT 0,
  emaillage_kg NUMERIC NOT NULL DEFAULT 0,
  projecta_kg NUMERIC NOT NULL DEFAULT 0,
  entree_four_kg NUMERIC NOT NULL DEFAULT 0,
  casse_cuite_kg NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.casse_ceramique ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read casse_ceramique" ON public.casse_ceramique FOR SELECT USING (true);
CREATE POLICY "Allow public insert casse_ceramique" ON public.casse_ceramique FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update casse_ceramique" ON public.casse_ceramique FOR UPDATE USING (true);
CREATE POLICY "Allow public delete casse_ceramique" ON public.casse_ceramique FOR DELETE USING (true);
