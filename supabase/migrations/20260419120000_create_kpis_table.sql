-- Migration to create the kpis table where each KPI is a column
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'quarterly', 'yearly'
  volume NUMERIC DEFAULT 0,
  rendement NUMERIC DEFAULT 0,
  scrap NUMERIC DEFAULT 0,
  utilization NUMERIC DEFAULT 0,
  energy NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure we only have one row per date/period combination
  CONSTRAINT unique_kpi_period UNIQUE (date, period_type)
);

-- Enable RLS
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- Create policies for kpis
CREATE POLICY "Allow public read kpis" ON public.kpis FOR SELECT USING (true);
CREATE POLICY "Allow public insert kpis" ON public.kpis FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update kpis" ON public.kpis FOR UPDATE USING (true);
CREATE POLICY "Allow public delete kpis" ON public.kpis FOR DELETE USING (true);

-- Create a database function to automatically calculate and upsert KPIs
CREATE OR REPLACE FUNCTION public.calculate_and_upsert_kpis(p_date DATE, p_type TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_volume NUMERIC := 0;
  v_rendement NUMERIC := 0;
  v_scrap NUMERIC := 0;
  v_choix1 NUMERIC := 0;
  v_choix2 NUMERIC := 0;
  v_choix3 NUMERIC := 0;
  v_total NUMERIC := 0;
BEGIN
  -- Determine date range based on period_type
  IF p_type = 'daily' THEN
    v_start_date := p_date;
    v_end_date := p_date;
  ELSIF p_type = 'quarterly' THEN
    v_start_date := date_trunc('quarter', p_date)::DATE;
    v_end_date := (date_trunc('quarter', p_date) + interval '3 months - 1 day')::DATE;
  ELSIF p_type = 'yearly' THEN
    v_start_date := date_trunc('year', p_date)::DATE;
    v_end_date := (date_trunc('year', p_date) + interval '1 year - 1 day')::DATE;
  ELSE
    -- Default to daily if unknown
    v_start_date := p_date;
    v_end_date := p_date;
  END IF;

  -- 1) Volume Produit (from production_journalier.cuisson_m2)
  SELECT COALESCE(SUM(cuisson_m2), 0)
  INTO v_volume
  FROM public.production_journalier
  WHERE date::DATE BETWEEN v_start_date AND v_end_date;

  -- 2) Rendement & Scrap (from stats_linea)
  SELECT 
    COALESCE(SUM(choix1_surface_m2), 0),
    COALESCE(SUM(choix2_surface_m2), 0),
    COALESCE(SUM(choix3_surface_m2), 0),
    COALESCE(SUM(total_surface_m2), 0)
  INTO v_choix1, v_choix2, v_choix3, v_total
  FROM public.stats_linea
  WHERE production_date::DATE BETWEEN v_start_date AND v_end_date;

  IF v_total > 0 THEN
    v_rendement := ROUND((v_choix1 / v_total) * 100, 2);
    v_scrap := ROUND(((v_choix2 + v_choix3) / v_total) * 100, 2);
  END IF;

  -- Upsert the calculated values into the kpis table!
  INSERT INTO public.kpis (date, period_type, volume, rendement, scrap)
  VALUES (v_start_date, p_type, v_volume, v_rendement, v_scrap)
  ON CONFLICT (date, period_type) 
  DO UPDATE SET 
    volume = EXCLUDED.volume,
    rendement = EXCLUDED.rendement,
    scrap = EXCLUDED.scrap,
    created_at = now();
END;
$$;
