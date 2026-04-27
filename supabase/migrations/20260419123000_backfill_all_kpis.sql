-- Let's drop the previous imperfect table and function to start completely fresh
DROP FUNCTION IF EXISTS public.calculate_and_upsert_kpis(DATE, TEXT);
DROP TABLE IF EXISTS public.kpis;

-- 1. Create the table with the EXACT names (labels) used in your KPI page
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  
  -- Naming columns exactly after their KPI Labels
  volume_produit NUMERIC DEFAULT 0,
  rendement_1er_choix NUMERIC DEFAULT 0,
  taux_de_rebut NUMERIC DEFAULT 0,
  disponibilite_four NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_kpi_period UNIQUE (date, period_type)
);

-- Security RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read kpis" ON public.kpis FOR SELECT USING (true);
CREATE POLICY "Allow public insert kpis" ON public.kpis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update kpis" ON public.kpis FOR UPDATE USING (true);
CREATE POLICY "Allow public delete kpis" ON public.kpis FOR DELETE USING (true);

-- 2. Create the exact mathematical function
CREATE OR REPLACE FUNCTION public.calculate_and_upsert_kpis(p_date DATE, p_type TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_duration_days INT;
  
  -- KPI Variables
  v_volume_produit NUMERIC := 0;
  v_rendement_1er_choix NUMERIC := 0;
  v_taux_de_rebut NUMERIC := 0;
  v_disponibilite_four NUMERIC := 0;
  
  -- Mathematics Working Variables
  v_choix1 NUMERIC := 0;
  v_choix2 NUMERIC := 0;
  v_choix3 NUMERIC := 0;
  v_total_linea NUMERIC := 0;
  v_empty_mins NUMERIC := 0;
BEGIN
  -- EXACT TIME PERIOD MATH
  IF p_type = 'daily' THEN
    v_start_date := p_date;
    v_end_date := p_date;
  ELSIF p_type = 'weekly' THEN
    -- In postgres, day 1 is typically Monday depending on config (using standard date_trunc)
    v_start_date := date_trunc('week', p_date)::DATE;
    v_end_date := (date_trunc('week', p_date) + interval '6 days')::DATE;
  ELSIF p_type = 'monthly' THEN
    v_start_date := date_trunc('month', p_date)::DATE;
    v_end_date := (date_trunc('month', p_date) + interval '1 month - 1 day')::DATE;
  ELSIF p_type = 'quarterly' THEN
    v_start_date := date_trunc('quarter', p_date)::DATE;
    v_end_date := (date_trunc('quarter', p_date) + interval '3 months - 1 day')::DATE;
  ELSIF p_type = 'yearly' THEN
    v_start_date := date_trunc('year', p_date)::DATE;
    v_end_date := (date_trunc('year', p_date) + interval '1 year - 1 day')::DATE;
  ELSE
    v_start_date := p_date;
    v_end_date := p_date;
  END IF;

  v_duration_days := (v_end_date - v_start_date) + 1;

  ----------------------------------------------------------------------------------
  -- FORMULA 4 : Disponibilité Four ((Total - Vide) / Total * 100)
  ----------------------------------------------------------------------------------
  SELECT 
    COALESCE(SUM(four_minutes_vides), 0)
  INTO 
    v_empty_mins
  FROM public.production_journalier
  WHERE date::DATE BETWEEN v_start_date AND v_end_date;

  IF v_duration_days > 0 THEN
    -- Total Hours = Days * 24
    -- Empty Hours = Minutes / 60
    v_disponibilite_four := GREATEST(0, ((v_duration_days * 24.0) - (v_empty_mins / 60.0)) / (v_duration_days * 24.0) * 100);
    v_disponibilite_four := ROUND(v_disponibilite_four, 2);
  END IF;

  ----------------------------------------------------------------------------------
  -- FORMULA 2 & 3 : Rendement (C1 / Total * 100) & Rebut ((C2 + C3) / Total * 100)
  ----------------------------------------------------------------------------------
  SELECT 
    COALESCE(SUM(choix1_surface_m2), 0),
    COALESCE(SUM(choix2_surface_m2), 0),
    COALESCE(SUM(choix3_surface_m2), 0),
    COALESCE(SUM(total_surface_m2), 0)
  INTO 
    v_choix1, 
    v_choix2, 
    v_choix3, 
    v_total_linea
  FROM public.stats_linea
  WHERE production_date::DATE BETWEEN v_start_date AND v_end_date;

  IF v_total_linea > 0 THEN
    -- Formula 1: Volume Produit is now based on total_surface_m2 from stats_linea
    v_volume_produit := v_total_linea;
    v_rendement_1er_choix := ROUND((v_choix1 / v_total_linea) * 100, 2);
    v_taux_de_rebut := ROUND(((v_choix2 + v_choix3) / v_total_linea) * 100, 2);
  END IF;

  -- Upsert strictly using the EXACT metric names
  INSERT INTO public.kpis (
    date, 
    period_type, 
    volume_produit, 
    rendement_1er_choix, 
    taux_de_rebut, 
    disponibilite_four
  )
  VALUES (
    v_start_date, 
    p_type, 
    v_volume_produit, 
    v_rendement_1er_choix, 
    v_taux_de_rebut, 
    v_disponibilite_four
  )
  ON CONFLICT (date, period_type) 
  DO UPDATE SET 
    volume_produit = EXCLUDED.volume_produit,
    rendement_1er_choix = EXCLUDED.rendement_1er_choix,
    taux_de_rebut = EXCLUDED.taux_de_rebut,
    disponibilite_four = EXCLUDED.disponibilite_four,
    created_at = now();
END;
$$;

-- 3. Backfill Execution Block
DO $$
DECLARE
  v_date DATE;
BEGIN
  FOR v_date IN (
    SELECT DISTINCT date::DATE FROM public.production_journalier
    UNION
    SELECT DISTINCT production_date::DATE FROM public.stats_linea
    WHERE production_date IS NOT NULL
  ) LOOP
    PERFORM public.calculate_and_upsert_kpis(v_date, 'daily');
    PERFORM public.calculate_and_upsert_kpis(v_date, 'weekly');
    PERFORM public.calculate_and_upsert_kpis(v_date, 'monthly');
    PERFORM public.calculate_and_upsert_kpis(v_date, 'quarterly');
    PERFORM public.calculate_and_upsert_kpis(v_date, 'yearly');
  END LOOP;
END;
$$;
