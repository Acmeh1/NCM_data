-- Create interventions table
CREATE TABLE public.interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demandeur TEXT NOT NULL,
  urgence TEXT NOT NULL,
  nature TEXT NOT NULL,
  type TEXT NOT NULL,
  zone_code TEXT NOT NULL,
  equipement_code TEXT NOT NULL,
  description TEXT,
  heure_debut TIMESTAMPTZ NOT NULL,
  heure_fin TIMESTAMPTZ,
  duree_intervention_minutes INTEGER,
  pdr_utilisees JSONB DEFAULT '[]'::jsonb,
  pdr_consommables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read interventions" ON public.interventions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert interventions" ON public.interventions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update interventions" ON public.interventions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete interventions" ON public.interventions FOR DELETE USING (auth.role() = 'authenticated');