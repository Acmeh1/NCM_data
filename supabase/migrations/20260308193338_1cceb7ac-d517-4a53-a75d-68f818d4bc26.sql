
-- Enable RLS on stats_linea
ALTER TABLE public.stats_linea ENABLE ROW LEVEL SECURITY;

-- Add SELECT policy for authenticated users
CREATE POLICY "Authenticated can read stats_linea" ON public.stats_linea
  FOR SELECT TO authenticated USING (true);
